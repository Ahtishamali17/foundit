// routes/notification.routes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');

// GET /api/notifications
router.get('/', protect, (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, type: 'ai_match', message: 'AI found a potential match for your item!', read: false, createdAt: new Date() },
      { id: 2, type: 'message', message: 'Priya sent you a message about your headphones.', read: true, createdAt: new Date(Date.now() - 3600000) },
    ],
  });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', protect, (req, res) => {
  res.json({ success: true, message: 'Notification marked as read.' });
});

module.exports = router;
