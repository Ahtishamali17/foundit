/**
 * utils/nlp.js
 * NLP Engine for FoundIt — NIET Noida
 * Features: Tokenization, Stopword Removal, TF-IDF, Cosine Similarity, Fuzzy Match
 */

const natural = require('natural');
const { removeStopwords, eng } = require('stopword');
const Fuse = require('fuse.js');

// ── Tokenizer & Stemmer ────────────────────────────────────────
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const TfIdf = natural.TfIdf;

// ── Custom stopwords (campus-specific noise words) ─────────────
const CUSTOM_STOPWORDS = [
  'lost', 'found', 'please', 'return', 'near', 'campus',
  'niet', 'noida', 'college', 'student', 'sir', 'mam', 'contact',
];

/**
 * Preprocess text:
 * lowercase → tokenize → remove stopwords → stem
 * @param {string} text
 * @returns {string[]} cleaned token array
 */
function preprocessText(text) {
  if (!text || typeof text !== 'string') return [];

  // Lowercase & remove special characters
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

  // Tokenize
  const tokens = tokenizer.tokenize(clean) || [];

  // Remove stopwords (English + custom)
  const noStop = removeStopwords(tokens, [...eng, ...CUSTOM_STOPWORDS]);

  // Stem each token (run → run, running → run)
  return noStop.map(t => stemmer.stem(t)).filter(t => t.length > 1);
}

/**
 * Build a combined text corpus from an item
 * Title gets 3x weight, description 1x, category 2x
 * @param {Object} item - Mongoose item document
 * @returns {string}
 */
function buildItemCorpus(item) {
  const title = (item.title || '').repeat(3);
  const desc = item.description || '';
  const cat = (item.category || '').repeat(2);
  const loc = item.location || '';
  return `${title} ${cat} ${desc} ${loc}`;
}

/**
 * Compute TF-IDF cosine similarity between two text strings
 * @param {string} textA
 * @param {string} textB
 * @returns {number} similarity score between 0 and 1
 */
function computeTextSimilarity(textA, textB) {
  if (!textA || !textB) return 0;

  const tfidf = new TfIdf();
  tfidf.addDocument(preprocessText(textA).join(' '));
  tfidf.addDocument(preprocessText(textB).join(' '));

  // Build term universe from both docs
  const terms = new Set();
  tfidf.listTerms(0).forEach(t => terms.add(t.term));
  tfidf.listTerms(1).forEach(t => terms.add(t.term));

  if (terms.size === 0) return 0;

  // Build TF-IDF vectors
  const vecA = [], vecB = [];
  terms.forEach(term => {
    vecA.push(tfidf.tfidf(term, 0));
    vecB.push(tfidf.tfidf(term, 1));
  });

  return cosineSimilarity(vecA, vecB);
}

/**
 * Cosine similarity between two numeric vectors
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} 0–1
 */
function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magA === 0 || magB === 0) return 0;
  return Math.min(dot / (magA * magB), 1); // clamp to 1
}

/**
 * Extract top N keywords from text using TF-IDF
 * @param {string} text
 * @param {number} topN
 * @returns {string[]}
 */
function extractKeywords(text, topN = 8) {
  if (!text) return [];
  const tfidf = new TfIdf();
  tfidf.addDocument(preprocessText(text).join(' '));
  return tfidf
    .listTerms(0)
    .sort((a, b) => b.tfidf - a.tfidf)
    .slice(0, topN)
    .map(t => t.term);
}

/**
 * Category similarity bonus
 * Same category = 1.0, otherwise 0
 * @param {string} catA
 * @param {string} catB
 * @returns {number}
 */
function categorySimilarity(catA, catB) {
  if (!catA || !catB) return 0;
  return catA.toLowerCase() === catB.toLowerCase() ? 1.0 : 0;
}

/**
 * Date proximity score
 * Items found/lost within 3 days → high score; 30+ days → 0
 * @param {Date} dateA
 * @param {Date} dateB
 * @returns {number} 0–1
 */
function dateSimilarity(dateA, dateB) {
  if (!dateA || !dateB) return 0.5; // neutral if unknown
  const diffDays = Math.abs((new Date(dateA) - new Date(dateB)) / (1000 * 60 * 60 * 24));
  if (diffDays <= 1) return 1.0;
  if (diffDays <= 3) return 0.8;
  if (diffDays <= 7) return 0.6;
  if (diffDays <= 14) return 0.4;
  if (diffDays <= 30) return 0.2;
  return 0;
}

/**
 * Location similarity — simple keyword overlap
 * @param {string} locA
 * @param {string} locB
 * @returns {number} 0–1
 */
function locationSimilarity(locA, locB) {
  if (!locA || !locB) return 0;
  const tokA = new Set(locA.toLowerCase().split(/\s+/));
  const tokB = new Set(locB.toLowerCase().split(/\s+/));
  const intersection = [...tokA].filter(t => tokB.has(t)).length;
  const union = new Set([...tokA, ...tokB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * MASTER SIMILARITY FUNCTION
 * Combines text, category, date, location scores
 * Weights: text=40%, category=25%, date=20%, location=15%
 * @param {Object} itemA
 * @param {Object} itemB
 * @returns {{ score: number, breakdown: Object }}
 */
function computeItemSimilarity(itemA, itemB) {
  const textScore = computeTextSimilarity(
    buildItemCorpus(itemA),
    buildItemCorpus(itemB)
  );
  const catScore = categorySimilarity(itemA.category, itemB.category);
  const dateScore = dateSimilarity(itemA.date, itemB.date);
  const locScore = locationSimilarity(itemA.location, itemB.location);

  const finalScore =
    textScore * 0.40 +
    catScore  * 0.25 +
    dateScore * 0.20 +
    locScore  * 0.15;

  return {
    score: Math.round(finalScore * 100) / 100,
    breakdown: {
      text:     Math.round(textScore * 100),
      category: Math.round(catScore * 100),
      date:     Math.round(dateScore * 100),
      location: Math.round(locScore * 100),
      final:    Math.round(finalScore * 100),
    },
  };
}

/**
 * Fuzzy search over a list of items
 * Handles typos: "headfones" → matches "headphones"
 * @param {Object[]} items
 * @param {string} query
 * @returns {Object[]} matched items sorted by relevance
 */
function fuzzySearch(items, query) {
  if (!query || !items.length) return items;

  const fuse = new Fuse(items, {
    keys: [
      { name: 'title',       weight: 0.5 },
      { name: 'description', weight: 0.3 },
      { name: 'category',    weight: 0.2 },
    ],
    threshold: 0.4,       // 0 = exact, 1 = match anything
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  return fuse.search(query).map(r => ({
    ...r.item,
    _fuzzyScore: Math.round((1 - r.score) * 100),
  }));
}

module.exports = {
  preprocessText,
  buildItemCorpus,
  computeTextSimilarity,
  computeItemSimilarity,
  extractKeywords,
  categorySimilarity,
  dateSimilarity,
  locationSimilarity,
  fuzzySearch,
  cosineSimilarity,
};
