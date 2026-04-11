/**
 * utils/imageSimilarity.js
 * Image Feature Extraction & Similarity using TensorFlow.js + MobileNet
 *
 * Install dependencies:
 *   npm install @tensorflow/tfjs-node @tensorflow-models/mobilenet jimp
 *
 * Falls back gracefully if TF is not installed.
 */

const path = require('path');
const fs   = require('fs');

// ── Lazy-load TF to avoid crash if not installed ───────────────
let tf, mobilenet, modelInstance;
let tfAvailable = false;

async function loadModel() {
  if (modelInstance) return modelInstance;
  try {
    tf = require('@tensorflow/tfjs-node');
    mobilenet = require('@tensorflow-models/mobilenet');
    modelInstance = await mobilenet.load({ version: 2, alpha: 1.0 });
    tfAvailable = true;
    console.log('✅ MobileNet model loaded for image similarity');
    return modelInstance;
  } catch (err) {
    console.warn('⚠️  TensorFlow not available — image similarity disabled.');
    console.warn('   Run: npm install @tensorflow/tfjs-node @tensorflow-models/mobilenet jimp');
    tfAvailable = false;
    return null;
  }
}

/**
 * Read image file and convert to TF tensor
 * @param {string} imagePath - absolute path to image
 * @returns {tf.Tensor3D | null}
 */
async function imageToTensor(imagePath) {
  try {
    const Jimp = require('jimp');
    const img = await Jimp.read(imagePath);

    // Resize to 224x224 (MobileNet input size)
    img.resize(224, 224);

    const pixels = [];
    img.scan(0, 0, 224, 224, function(x, y, idx) {
      pixels.push(this.bitmap.data[idx]);     // R
      pixels.push(this.bitmap.data[idx + 1]); // G
      pixels.push(this.bitmap.data[idx + 2]); // B
    });

    // Shape: [224, 224, 3]
    return tf.tensor3d(pixels, [224, 224, 3], 'int32');
  } catch (err) {
    console.error('Image tensor error:', err.message);
    return null;
  }
}

/**
 * Extract 1024-dimensional embedding from image
 * @param {string} imagePath - absolute path
 * @returns {number[] | null} embedding vector
 */
async function extractEmbedding(imagePath) {
  if (!fs.existsSync(imagePath)) return null;

  const model = await loadModel();
  if (!model || !tfAvailable) return null;

  const tensor = await imageToTensor(imagePath);
  if (!tensor) return null;

  try {
    // infer() returns internal activation (1024-dim for MobileNet v2)
    const embedding = model.infer(tensor, true); // true = infer embeddings
    const data = await embedding.data();
    tensor.dispose();
    embedding.dispose();
    return Array.from(data);
  } catch (err) {
    console.error('Embedding extraction error:', err.message);
    tensor.dispose();
    return null;
  }
}

/**
 * Cosine similarity between two embedding vectors
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} 0–1
 */
function embeddingSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot  += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : Math.min(dot / denom, 1);
}

/**
 * Process a newly uploaded image:
 *   1. Extract embedding
 *   2. Return embedding array to be saved in DB
 *
 * @param {string} filename - image filename in uploads/ folder
 * @param {string} uploadsDir - absolute path to uploads directory
 * @returns {number[] | null}
 */
async function processUploadedImage(filename, uploadsDir) {
  if (!filename) return null;
  const fullPath = path.join(uploadsDir, filename);
  return await extractEmbedding(fullPath);
}

/**
 * Compare two items by their stored embeddings
 * @param {number[]} embA - embedding from DB
 * @param {number[]} embB - embedding from DB
 * @returns {number} image similarity score 0–1
 */
function compareItemImages(embA, embB) {
  return embeddingSimilarity(embA, embB);
}

module.exports = {
  loadModel,
  extractEmbedding,
  processUploadedImage,
  compareItemImages,
  embeddingSimilarity,
  isTFAvailable: () => tfAvailable,
};
