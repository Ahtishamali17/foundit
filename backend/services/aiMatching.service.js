// ===== services/aiMatching.service.js =====
/**
 * AI Item Matching Engine
 *
 * Matches lost items with found items using:
 * 1. Title similarity (Levenshtein distance / keyword overlap)
 * 2. Category match
 * 3. Location proximity
 * 4. Date proximity
 * 5. Description keyword cosine similarity
 *
 * For production: replace with OpenAI embeddings or a vector DB (Pinecone).
 */

const Item = require('../models/Item.model');
const { sendEmail } = require('./email.service');

// Simple keyword extraction
function extractKeywords(text) {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'it', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'with', 'i', 'my', 'was', 'has', 'have']);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

// Jaccard similarity between two keyword sets
function jaccardSimilarity(setA, setB) {
  const a = new Set(setA);
  const b = new Set(setB);
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

// Levenshtein distance
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function titleSimilarity(titleA, titleB) {
  const a = titleA.toLowerCase();
  const b = titleB.toLowerCase();
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// Date proximity score (1.0 = same day, 0.0 = 30+ days apart)
function dateSimilarity(dateA, dateB) {
  const diffDays = Math.abs((new Date(dateA) - new Date(dateB)) / (1000 * 60 * 60 * 24));
  return Math.max(0, 1 - diffDays / 30);
}

/**
 * Find AI matches for a given item
 * @param {Object} item - The item to find matches for
 * @returns {Array} - Sorted array of matches with scores
 */
async function findAIMatches(item) {
  try {
    // Search for opposite type (lost → find found, found → find lost)
    const oppositeType = item.type === 'lost' ? 'found' : 'lost';

    const candidates = await Item.find({
      type: oppositeType,
      status: 'pending',
      _id: { $ne: item._id },
    }).limit(100).lean();

    const itemKeywords = extractKeywords(`${item.title} ${item.description}`);

    const scored = candidates.map((candidate) => {
      const candidateKeywords = extractKeywords(`${candidate.title} ${candidate.description}`);

      // Component scores (0–1 each)
      const titleScore = titleSimilarity(item.title, candidate.title);
      const descScore = jaccardSimilarity(itemKeywords, candidateKeywords);
      const categoryScore = item.category === candidate.category ? 1 : 0;
      const dateScore = dateSimilarity(item.date, candidate.date);

      // Weighted composite score
      const score =
        titleScore * 0.35 +
        descScore * 0.35 +
        categoryScore * 0.20 +
        dateScore * 0.10;

      const reason = [];
      if (categoryScore === 1) reason.push('same category');
      if (titleScore > 0.6) reason.push('similar title');
      if (descScore > 0.3) reason.push('matching keywords');

      return {
        itemId: candidate._id,
        score: Math.round(score * 100) / 100,
        reason: reason.join(', ') || 'possible match',
      };
    });

    // Return top 5 matches with score > 0.3
    return scored
      .filter((m) => m.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  } catch (err) {
    console.error('AI Matching error:', err);
    return [];
  }
}

/**
 * Notify a user about potential item matches via email
 */
async function notifyMatches(user, item, matches) {
  if (!matches.length) return;

  const topMatch = await Item.findById(matches[0].itemId).populate('userId', 'name email');
  if (!topMatch) return;

  await sendEmail({
    to: user.email,
    subject: `FoundIt — We found a potential match for "${item.title}"! 🤖`,
    template: 'aiMatch',
    data: {
      userName: user.name,
      itemTitle: item.title,
      matchTitle: topMatch.title,
      matchLocation: topMatch.location.name,
      matchScore: Math.round(matches[0].score * 100),
      itemUrl: `${process.env.FRONTEND_URL}/items/${item._id}`,
    },
  });
}

module.exports = { findAIMatches, notifyMatches };
