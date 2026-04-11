const { Conversation, Message } = require('../models/Chat.model');

// @desc  Get or create a conversation between current user and another user about an item
// @route POST /api/chat/conversation
exports.getOrCreateConversation = async (req, res, next) => {
  try {
    const { recipientId, itemId } = req.body;
    const userId = req.user.id;

    // Find existing conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, recipientId] },
      item: itemId,
    }).populate('participants', 'name avatar').populate('item', 'title type');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, recipientId],
        item: itemId,
      });
      await conversation.populate('participants', 'name avatar');
      await conversation.populate('item', 'title type');
    }

    res.json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
};

// @desc  Get all conversations for current user
// @route GET /api/chat
exports.getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ participants: req.user.id })
      .populate('participants', 'name avatar')
      .populate('item', 'title type image')
      .sort({ updatedAt: -1 });

    res.json({ success: true, data: conversations });
  } catch (err) {
    next(err);
  }
};

// @desc  Get messages in a conversation
// @route GET /api/chat/:conversationId/messages
exports.getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 30 } = req.query;

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user.id,
    });
    if (!conversation) return res.status(403).json({ success: false, message: 'Access denied.' });

    const messages = await Message.find({ conversationId })
      .populate('senderId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Mark as read
    await Message.updateMany(
      { conversationId, readBy: { $ne: req.user.id } },
      { $addToSet: { readBy: req.user.id } }
    );

    res.json({ success: true, data: messages.reverse() });
  } catch (err) {
    next(err);
  }
};

// @desc  Send a message
// @route POST /api/chat/:conversationId/messages
exports.sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { text } = req.body;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user.id,
    });
    if (!conversation) return res.status(403).json({ success: false, message: 'Access denied.' });

    const message = await Message.create({
      conversationId,
      senderId: req.user.id,
      text,
      readBy: [req.user.id],
    });

    await message.populate('senderId', 'name avatar');

    // Update conversation's lastMessage
    conversation.lastMessage = { text, senderId: req.user.id, createdAt: new Date() };
    await conversation.save();

    // Emit via socket
    const io = req.app.get('io');
    io.to(conversationId).emit('new_message', message);

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
};
