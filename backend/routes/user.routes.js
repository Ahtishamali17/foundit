// ===== routes/user.routes.js =====
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const User = require('../models/User.model');
const { uploadImage } = require('../services/cloudinary.service');

// GET /api/users/:id — public profile
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('name avatar college createdAt');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// PUT /api/users/me — update profile
router.put('/me', protect, upload.single('avatar'), async (req, res, next) => {
  try {
    const { name, college, phone, notifications } = req.body;
    const updates = { name, college, phone, notifications };

    if (req.file) {
      const result = await uploadImage(req.file.buffer, 'foundit/avatars');
      updates.avatar = result.secure_url;
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// GET /api/users — admin only: list all users
router.get('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = search ? { $text: { $search: search } } : {};
    const users = await User.find(query)
      .skip((page - 1) * limit).limit(parseInt(limit))
      .sort({ createdAt: -1 });
    const total = await User.countDocuments(query);
    res.json({ success: true, data: users, total });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id — admin only
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;


// ===== routes/notification.routes.js =====
// This file is a placeholder. In production, implement with
// a Notification model and push notification service (FCM/APNs).

const express2 = require('express');
const router2 = express2.Router();
const { protect: protectN } = require('../middleware/auth.middleware');

// GET /api/notifications — stub
router2.get('/', protectN, (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, type: 'ai_match', message: 'AI found a potential match for your item!', read: false, createdAt: new Date() },
      { id: 2, type: 'message', message: 'Priya sent you a message about your headphones.', read: true, createdAt: new Date(Date.now() - 3600000) },
    ],
  });
});

module.exports = router2;
