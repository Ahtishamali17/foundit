/**
 * utils/aiMatcher.js
 * AI Matching Engine for FoundIt
 *
 * Combines:
 *   - NLP text similarity (TF-IDF + cosine)
 *   - Image embedding similarity (MobileNet)
 *   - Category, date, location bonuses
 *
 * Called after every new item is created.
 * Updates `matches` field in DB for both sides.
 */

const { computeItemSimilarity, extractKeywords, buildItemCorpus } = require('./nlp');
const { compareItemImages, isTFAvailable } = require('./imageSimilarity');

// Minimum score to be considered a match (0–1)
const MATCH_THRESHOLD = 0.20;

// Max matches to store per item
const MAX_MATCHES = 10;

/**
 * Compute final combined score
 *
 * Weights:
 *   - Image available on both: text=50%, image=30%, rest=20%
 *   - No image:                text=65%, rest=35%
 *
 * @param {Object} nlpResult  - { score, breakdown }
 * @param {number} imgScore   - 0–1 from image similarity
 * @returns {number} final 0–1 score
 */
function combinedScore(nlpResult, imgScore) {
  const hasImage = imgScore > 0;

  if (hasImage) {
    return (
      nlpResult.score * 0.50 +
      imgScore         * 0.30 +
      (nlpResult.breakdown.category / 100) * 0.10 +
      (nlpResult.breakdown.date     / 100) * 0.10
    );
  } else {
    return (
      nlpResult.score * 0.65 +
      (nlpResult.breakdown.category / 100) * 0.20 +
      (nlpResult.breakdown.date     / 100) * 0.15
    );
  }
}

/**
 * Build a human-readable reason string from score breakdown
 * @param {Object} breakdown
 * @returns {string}
 */
function buildMatchReason(breakdown) {
  const reasons = [];
  if (breakdown.category === 100) reasons.push('same category');
  if (breakdown.text > 40)       reasons.push('similar description');
  if (breakdown.location > 50)   reasons.push('same location');
  if (breakdown.date > 60)       reasons.push('close date');
  return reasons.length ? reasons.join(', ') : 'general similarity';
}

/**
 * Find AI matches for a given item against a pool of candidates
 *
 * @param {Object}   targetItem   - the newly posted item (Mongoose doc)
 * @param {Object[]} candidates   - array of opposite-type items from DB
 * @returns {Array}  sorted array of { itemId, score, breakdown, reason }
 */
async function findMatches(targetItem, candidates) {
  const results = [];

  for (const candidate of candidates) {
    // ── Text + category + date + location similarity ────────────
    const nlpResult = computeItemSimilarity(targetItem, candidate);

    // ── Image similarity (only if both items have embeddings) ───
    let imgScore = 0;
    if (
      isTFAvailable() &&
      targetItem.imageEmbedding?.length &&
      candidate.imageEmbedding?.length
    ) {
      imgScore = compareItemImages(
        targetItem.imageEmbedding,
        candidate.imageEmbedding
      );
    }

    // ── Final weighted score ────────────────────────────────────
    const final = combinedScore(nlpResult, imgScore);

    if (final >= MATCH_THRESHOLD) {
      results.push({
        itemId:    candidate._id,
        score:     Math.round(final * 100) / 100,
        imgScore:  Math.round(imgScore * 100),
        breakdown: nlpResult.breakdown,
        reason:    buildMatchReason(nlpResult.breakdown),
      });
    }
  }

  // Sort by score descending, keep top MAX_MATCHES
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCHES);
}

/**
 * Main entry point — called after item creation
 * Finds matches and updates DB for both item and its matches
 *
 * @param {Object}        newItem  - newly created Mongoose item document
 * @param {mongoose.Model} Item   - the Item model
 */
async function runMatchingForItem(newItem, Item) {
  try {
    // Find opposite-type items that are still pending
    const oppositeType = newItem.type === 'lost' ? 'found' : 'lost';
    const candidates = await Item.find({
      type:   oppositeType,
      status: 'pending',
      _id:    { $ne: newItem._id },
    }).limit(200).lean();

    if (!candidates.length) return;

    const matches = await findMatches(newItem, candidates);

    // ── Update the new item with its matches ────────────────────
    await Item.findByIdAndUpdate(newItem._id, { $set: { matches } });

    // ── For each match, add the new item as a potential match ───
    for (const match of matches) {
      const reverseMatch = {
        itemId:    newItem._id,
        score:     match.score,
        imgScore:  match.imgScore,
        breakdown: match.breakdown,
        reason:    match.reason,
      };

      await Item.findByIdAndUpdate(match.itemId, {
        $push: {
          matches: {
            $each:     [reverseMatch],
            $sort:     { score: -1 },
            $slice:    MAX_MATCHES,
          },
        },
      });
    }

    console.log(
      `🤖 AI Matching: "${newItem.title}" → ${matches.length} match(es) found`
    );
  } catch (err) {
    // Non-blocking — log and continue
    console.error('AI Matching error:', err.message);
  }
}

/**
 * Re-run matching for ALL pending items (admin utility)
 * Useful when you first add AI to an existing database
 *
 * @param {mongoose.Model} Item
 */
async function rerunAllMatches(Item) {
  const allItems = await Item.find({ status: 'pending' }).lean();
  console.log(`🔄 Re-running AI matching for ${allItems.length} items...`);
  for (const item of allItems) {
    await runMatchingForItem(item, Item);
  }
  console.log('✅ AI matching complete for all items.');
}

module.exports = {
  findMatches,
  runMatchingForItem,
  rerunAllMatches,
  MATCH_THRESHOLD,
};
