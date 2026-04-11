/**
 * utils/recommender.js
 * Smart Recommendation Engine for FoundIt
 *
 * Strategy (in priority order):
 *  1. Category-based: items in user's most-used categories
 *  2. NLP similarity: items similar to what user has posted
 *  3. Recency: freshly posted items on campus
 *  4. Fallback: recent pending items
 */

const { computeTextSimilarity, buildItemCorpus, extractKeywords } = require('./nlp');

/**
 * Get category frequency map from user's items
 * @param {Object[]} userItems
 * @returns {Object} { Electronics: 3, Bags: 1, ... }
 */
function getCategoryFrequency(userItems) {
  return userItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Build a profile corpus from all of a user's items
 * Used to find globally similar items
 * @param {Object[]} userItems
 * @returns {string}
 */
function buildUserProfileCorpus(userItems) {
  return userItems.map(buildItemCorpus).join(' ');
}

/**
 * Score a candidate item against the user's profile
 * @param {Object}   candidate
 * @param {string}   userCorpus
 * @param {Object}   categoryFreq
 * @param {string[]} topCategories
 * @returns {number} recommendation score 0–1
 */
function scoreCandidate(candidate, userCorpus, categoryFreq, topCategories) {
  // Text similarity to user's entire posting history
  const textSim = computeTextSimilarity(userCorpus, buildItemCorpus(candidate));

  // Category preference bonus
  const catFreq = categoryFreq[candidate.category] || 0;
  const maxFreq = Math.max(...Object.values(categoryFreq), 1);
  const catScore = catFreq / maxFreq;

  // Recency bonus — items posted in last 7 days score higher
  const ageDays = (Date.now() - new Date(candidate.createdAt)) / (1000 * 60 * 60 * 24);
  const recencyScore = ageDays <= 1 ? 1.0
    : ageDays <= 3  ? 0.8
    : ageDays <= 7  ? 0.6
    : ageDays <= 14 ? 0.4
    : 0.2;

  // Top category boost
  const isTopCat = topCategories.includes(candidate.category) ? 0.2 : 0;

  const final =
    textSim     * 0.40 +
    catScore    * 0.30 +
    recencyScore * 0.20 +
    isTopCat    * 0.10;

  return Math.round(final * 100) / 100;
}

/**
 * Generate personalized recommendations for a user
 *
 * @param {string}         userId   - user's ObjectId string
 * @param {mongoose.Model} Item     - the Item model
 * @param {Object}         options
 * @param {number}         options.limit   - max recommendations (default 10)
 * @param {string}         options.exclude - 'lost' or 'found' to exclude a type
 * @returns {Object[]} scored & sorted recommendation objects
 */
async function getRecommendations(userId, Item, options = {}) {
  const { limit = 10 } = options;

  // ── 1. Load user's own items ───────────────────────────────
  const userItems = await Item.find({ userId, status: 'pending' })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // ── 2. If no history → return most recent campus items ────
  if (!userItems.length) {
    const recent = await Item.find({ userId: { $ne: userId }, status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return recent.map(item => ({ ...item, _recScore: 0, _recReason: 'recent on campus' }));
  }

  // ── 3. Build user profile ─────────────────────────────────
  const userCorpus   = buildUserProfileCorpus(userItems);
  const categoryFreq = getCategoryFrequency(userItems);
  const topCategories = Object.entries(categoryFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  const userItemIds = new Set(userItems.map(i => i._id.toString()));

  // ── 4. Load candidate items (not user's own, still pending) ─
  const candidates = await Item.find({
    userId: { $ne: userId },
    status: 'pending',
  })
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();

  // ── 5. Score each candidate ───────────────────────────────
  const scored = candidates
    .filter(c => !userItemIds.has(c._id.toString()))
    .map(candidate => ({
      ...candidate,
      _recScore:  scoreCandidate(candidate, userCorpus, categoryFreq, topCategories),
      _recReason: topCategories.includes(candidate.category)
        ? `matches your interest in ${candidate.category}`
        : 'similar to your activity',
    }));

  // ── 6. Sort by score, return top N ───────────────────────
  return scored
    .sort((a, b) => b._recScore - a._recScore)
    .slice(0, limit);
}

/**
 * Extract user's interest keywords across all their posts
 * Useful for showing "You often look for: headphones, ID card..."
 * @param {Object[]} userItems
 * @returns {string[]}
 */
function getUserInterestKeywords(userItems) {
  const combined = userItems.map(i => `${i.title} ${i.description}`).join(' ');
  return extractKeywords(combined, 10);
}

module.exports = {
  getRecommendations,
  getUserInterestKeywords,
  buildUserProfileCorpus,
  getCategoryFrequency,
};
