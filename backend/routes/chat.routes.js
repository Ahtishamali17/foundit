// ===== routes/chat.routes.js =====
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getOrCreateConversation, getConversations, getMessages, sendMessage,
} = require('../controllers/chat.controller');

router.get('/', protect, getConversations);
router.post('/conversation', protect, getOrCreateConversation);
router.get('/:conversationId/messages', protect, getMessages);
router.post('/:conversationId/messages', protect, sendMessage);

module.exports = router;
