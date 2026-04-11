/**
 * FoundIt — NIET Noida Lost & Found
 * UPGRADED Backend: AI/NLP Matching + Image Similarity + Recommendations
 *
 * New vs existing:
 *  ✅ All original APIs preserved (no breaking changes)
 *  🆕 Item schema: added matches[], imageEmbedding[], keywords[]
 *  🆕 GET /api/items/:id/matches     — AI match results
 *  🆕 GET /api/recommendations       — personalized feed
 *  🆕 GET /api/items/search          — NLP-powered fuzzy search
 *  🆕 POST /api/admin/rerun-matching — re-run AI on all items
 */

const express  = require('express');
const http     = require('http');
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const cors     = require('cors');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
require('dotenv').config();

// ── AI / NLP utils ─────────────────────────────────────────────
const { runMatchingForItem, rerunAllMatches } = require('./utils/aiMatcher');
const { processUploadedImage }                = require('./utils/imageSimilarity');
const { extractKeywords }                     = require('./utils/nlp');
const { getRecommendations, getUserInterestKeywords } = require('./utils/recommender');
const { fuzzySearch }                         = require('./utils/nlp');

const app    = express();
const server = http.createServer(app);

// ── Middleware ─────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, '..')));

// ── MongoDB ────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected!'))
  .catch(err => console.error('❌ MongoDB failed:', err.message));

// ══════════════════════════════════════════════════════════════
//  SCHEMAS (existing fields preserved, new AI fields added)
// ══════════════════════════════════════════════════════════════

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  college:  { type: String, default: 'NIET Noida' },
  phone:    { type: String, default: '' },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.comparePassword = p => bcrypt.compare(p, this.password);
// Fix: arrow function doesn't bind 'this' — use regular function
userSchema.methods.comparePassword = function(p) { return bcrypt.compare(p, this.password); };
const User = mongoose.model('User', userSchema);

// ── ITEM SCHEMA (upgraded with AI fields) ─────────────────────
const matchSchema = new mongoose.Schema({
  itemId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  score:     { type: Number, min: 0, max: 1 },
  imgScore:  { type: Number, default: 0 },
  breakdown: {
    text:     Number,
    category: Number,
    date:     Number,
    location: Number,
    final:    Number,
  },
  reason: { type: String, default: '' },
}, { _id: false });

const itemSchema = new mongoose.Schema({
  // ── Original fields (unchanged) ────────────────────────────
  title:       { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  type:        { type: String, enum: ['lost', 'found'], required: true },
  category:    { type: String, required: true },
  status:      { type: String, enum: ['pending', 'resolved'], default: 'pending' },
  image:       { type: String, default: null },
  location:    { type: String, required: true },
  date:        { type: Date, required: true },
  contact: {
    name:  String,
    email: String,
    phone: String,
  },
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String },
  views:    { type: Number, default: 0 },

  // ── 🆕 AI fields ────────────────────────────────────────────
  matches:        { type: [matchSchema], default: [] },
  imageEmbedding: { type: [Number],     default: [], select: false }, // hidden by default (large)
  keywords:       { type: [String],     default: [] },                // extracted on save
}, { timestamps: true });

// Text index for full-text search (existing)
itemSchema.index({ title: 'text', description: 'text', category: 'text' });
// Compound index for fast type+status queries
itemSchema.index({ type: 1, status: 1, createdAt: -1 });
itemSchema.index({ userId: 1, createdAt: -1 });

const Item = mongoose.model('Item', itemSchema);

// ── Multer setup ───────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) =>
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /jpeg|jpg|png|webp|gif/.test(file.mimetype) ? cb(null, true) : cb(new Error('Images only')),
});

// ── JWT helpers ────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'niet_foundit_secret_2024';
const makeToken  = id => jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });

// ── Auth middleware ────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Please login first.' });
    const { id } = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(id);
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found.' });
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// ══════════════════════════════════════════════════════════════
//  AUTH ROUTES (unchanged)
// ══════════════════════════════════════════════════════════════

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, college, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email and password required.' });
    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(400).json({ success: false, message: 'Email already registered.' });

    const user = await User.create({ name, email, password, college: college || 'NIET Noida', phone });
    res.status(201).json({
      success: true,
      token: makeToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, college: user.college },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    res.json({
      success: true,
      token: makeToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email, college: user.college, phone: user.phone },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/auth/me', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ══════════════════════════════════════════════════════════════
//  🆕 NLP SEARCH — GET /api/items/search?q=...
//  Fuzzy + full-text hybrid search
// ══════════════════════════════════════════════════════════════
app.get('/api/items/search', async (req, res) => {
  try {
    const { q, type, category, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ success: false, message: 'Query parameter q is required.' });

    // First try MongoDB text search
    const dbQuery = { $text: { $search: q }, status: 'pending' };
    if (type) dbQuery.type = type;
    if (category) dbQuery.category = category;

    let results = await Item.find(dbQuery, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(parseInt(limit))
      .lean();

    // If text search returns < 3 results, augment with fuzzy NLP search
    if (results.length < 3) {
      const pool = await Item.find({ status: 'pending', ...(type && { type }), ...(category && { category }) })
        .limit(200)
        .lean();

      const fuzzyResults = fuzzySearch(pool, q);

      // Merge (deduplicate by _id)
      const seen = new Set(results.map(r => r._id.toString()));
      for (const fr of fuzzyResults) {
        if (!seen.has(fr._id.toString())) {
          results.push(fr);
          seen.add(fr._id.toString());
        }
      }
    }

    res.json({ success: true, data: results.slice(0, parseInt(limit)), total: results.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  ITEM ROUTES
// ══════════════════════════════════════════════════════════════

// GET ALL — unchanged API, but now also supports ?fuzzy=true
app.get('/api/items', async (req, res) => {
  try {
    const { type, category, status, search, fuzzy, page = 1, limit = 20 } = req.query;
    const q = {};
    if (type)     q.type = type;
    if (category) q.category = category;
    if (status)   q.status = status;
    if (search && !fuzzy) q.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let [data, total] = await Promise.all([
      Item.find(q).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Item.countDocuments(q),
    ]);

    // Optional fuzzy post-processing
    if (search && fuzzy === 'true') {
      data = fuzzySearch(data, search);
      total = data.length;
    }

    res.json({ success: true, data, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET MY ITEMS
app.get('/api/items/mine', protect, async (req, res) => {
  try {
    const q = { userId: req.user._id };
    if (req.query.status) q.status = req.query.status;
    if (req.query.type)   q.type   = req.query.type;
    const data = await Item.find(q).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data, total: data.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 🆕 GET AI MATCHES — /api/items/:id/matches ─────────────────
app.get('/api/items/:id/matches', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });

    if (!item.matches || !item.matches.length) {
      return res.json({ success: true, data: [], message: 'No matches found yet.' });
    }

    // Populate match item details
    const matchIds = item.matches.map(m => m.itemId);
    const matchedItems = await Item.find({ _id: { $in: matchIds } }).lean();

    // Attach score metadata to each match
    const enriched = item.matches.map(match => {
      const details = matchedItems.find(mi => mi._id.toString() === match.itemId.toString());
      return details
        ? {
            ...details,
            _matchScore:     match.score,
            _matchImgScore:  match.imgScore,
            _matchBreakdown: match.breakdown,
            _matchReason:    match.reason,
          }
        : null;
    }).filter(Boolean);

    res.json({
      success: true,
      data:    enriched,
      total:   enriched.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET SINGLE ITEM (unchanged)
app.get('/api/items/:id', async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── CREATE ITEM (upgraded: AI matching runs after save) ─────────
app.post('/api/items', protect, upload.single('image'), async (req, res) => {
  try {
    const { title, description, type, category, location, date,
            contactName, contactEmail, contactPhone } = req.body;

    if (!title || !description || !type || !category || !location || !date)
      return res.status(400).json({ success: false, message: 'Please fill all required fields.' });

    // ── 🆕 Extract NLP keywords before saving ─────────────────
    const keywords = extractKeywords(`${title} ${description} ${category}`, 10);

    // ── 🆕 Extract image embedding (async, non-blocking) ───────
    let imageEmbedding = [];
    if (req.file) {
      // Run in background — don't await here to keep response fast
      processUploadedImage(req.file.filename, uploadDir)
        .then(emb => {
          if (emb) Item.findByIdAndUpdate(item._id, { imageEmbedding: emb }).exec();
        })
        .catch(() => {}); // silent fail
    }

    const item = await Item.create({
      title, description, type, category, location,
      date:     new Date(date),
      image:    req.file ? req.file.filename : null,
      keywords, // 🆕
      contact: {
        name:  contactName  || req.user.name,
        email: contactEmail || req.user.email,
        phone: contactPhone || req.user.phone || '',
      },
      userId:   req.user._id,
      userName: req.user.name,
    });

    // ── 🆕 Run AI matching asynchronously (no delay to user) ───
    setImmediate(() => runMatchingForItem(item, Item));

    res.status(201).json({ success: true, data: item, message: 'Item posted successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE ITEM (unchanged, but re-runs matching if title/desc changed)
app.put('/api/items/:id', protect, upload.single('image'), async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
    if (item.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    if (req.file) {
      if (item.image) {
        const old = path.join(uploadDir, item.image);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      req.body.image = req.file.filename;

      // 🆕 Re-extract embedding for new image
      processUploadedImage(req.file.filename, uploadDir)
        .then(emb => { if (emb) Item.findByIdAndUpdate(item._id, { imageEmbedding: emb }).exec(); })
        .catch(() => {});
    }

    // 🆕 Re-extract keywords if text changed
    if (req.body.title || req.body.description) {
      const title = req.body.title || item.title;
      const desc  = req.body.description || item.description;
      req.body.keywords = extractKeywords(`${title} ${desc} ${item.category}`, 10);
    }

    const updated = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // 🆕 Re-run matching if content changed
    if (req.body.title || req.body.description) {
      setImmediate(() => runMatchingForItem(updated, Item));
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE ITEM (unchanged)
app.delete('/api/items/:id', protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
    if (item.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    if (item.image) {
      const imgPath = path.join(uploadDir, item.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    await item.deleteOne();
    res.json({ success: true, message: 'Item deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// RESOLVE ITEM (unchanged)
app.put('/api/items/:id/resolve', protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
    if (item.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    item.status = 'resolved';
    await item.save();
    res.json({ success: true, data: item, message: 'Marked as resolved!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  🆕 RECOMMENDATIONS — GET /api/recommendations
// ══════════════════════════════════════════════════════════════
app.get('/api/recommendations', protect, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const recommendations = await getRecommendations(
      req.user._id.toString(),
      Item,
      { limit: parseInt(limit) }
    );

    // Also return the user's interest keywords
    const userItems = await Item.find({ userId: req.user._id }).lean();
    const interestKeywords = getUserInterestKeywords(userItems);

    res.json({
      success: true,
      data:    recommendations,
      meta:    {
        total:            recommendations.length,
        interestKeywords, // e.g. ['headphones', 'sony', 'charger']
        basedOn:          userItems.length > 0 ? 'your activity' : 'recent posts',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  STATS (unchanged)
// ══════════════════════════════════════════════════════════════
app.get('/api/stats', async (req, res) => {
  try {
    const [total, lost, found, resolved, users] = await Promise.all([
      Item.countDocuments(),
      Item.countDocuments({ type: 'lost' }),
      Item.countDocuments({ type: 'found' }),
      Item.countDocuments({ status: 'resolved' }),
      User.countDocuments(),
    ]);
    res.json({ success: true, data: { total, lost, found, resolved, users } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  🆕 ADMIN — Re-run AI matching on all items
//  POST /api/admin/rerun-matching
// ══════════════════════════════════════════════════════════════
app.post('/api/admin/rerun-matching', protect, async (req, res) => {
  // Simple admin check — in production, use role middleware
  if (req.user.email !== process.env.ADMIN_EMAIL && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin only.' });
  }
  res.json({ success: true, message: 'AI matching started in background...' });
  // Non-blocking
  setImmediate(() => rerunAllMatches(Item));
});

// ── Health ─────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success:   true,
    message:   'FoundIt AI Backend is live 🚀',
    db:        mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected',
    ai:        '✅ NLP Active (TF-IDF + Cosine + Fuzzy)',
    timestamp: new Date().toISOString(),
  });
});

// ── Error handler ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  res.status(500).json({ success: false, message: err.message });
});

// ── Start ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   FoundIt AI — NIET Noida Campus          ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  🌐 App    : http://localhost:${PORT}         ║`);
  console.log(`║  ⚙️  API    : http://localhost:${PORT}/api     ║`);
  console.log(`║  🤖 NLP    : TF-IDF + Cosine + Fuzzy      ║`);
  console.log(`║  🏥 Health : http://localhost:${PORT}/api/health║`);
  console.log('╚══════════════════════════════════════════╝\n');
});
