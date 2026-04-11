// sockets/chat.socket.js
/**
 * Real-time Chat via Socket.io
 *
 * Events:
 *   Client → Server: join_conversation, send_message, typing, stop_typing
 *   Server → Client: new_message, typing, stop_typing, user_online, user_offline
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { Message, Conversation } = require('../models/Chat.model');

// Track online users: userId → socketId
const onlineUsers = new Map();

module.exports = (io) => {
  // Authenticate socket connections via JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('name avatar');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);

    console.log(`🔌 Socket connected: ${socket.user.name} (${socket.id})`);

    // Notify contacts that user is online
    socket.broadcast.emit('user_online', { userId, name: socket.user.name });

    // ── Join a conversation room ──
    socket.on('join_conversation', (conversationId) => {
      socket.join(conversationId);
      console.log(`💬 ${socket.user.name} joined room: ${conversationId}`);
    });

    // ── Leave a conversation room ──
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(conversationId);
    });

    // ── Send a message ──
    socket.on('send_message', async ({ conversationId, text }) => {
      try {
        // Verify user is a participant
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });
        if (!conversation) return;

        const message = await Message.create({
          conversationId,
          senderId: userId,
          text,
          readBy: [userId],
        });

        await message.populate('senderId', 'name avatar');

        // Update conversation's lastMessage
        conversation.lastMessage = { text, senderId: userId, createdAt: new Date() };
        await conversation.save();

        // Emit to all in the room (including sender for confirmation)
        io.to(conversationId).emit('new_message', message);

        // Push notification to offline recipients
        conversation.participants.forEach((participantId) => {
          if (participantId.toString() !== userId) {
            const recipientSocket = onlineUsers.get(participantId.toString());
            if (!recipientSocket) {
              // User is offline — could trigger push notification here
              console.log(`📳 Push notification would go to offline user: ${participantId}`);
            }
          }
        });
      } catch (err) {
        console.error('Socket send_message error:', err.message);
      }
    });

    // ── Typing indicators ──
    socket.on('typing', (conversationId) => {
      socket.to(conversationId).emit('typing', {
        userId,
        name: socket.user.name,
        conversationId,
      });
    });

    socket.on('stop_typing', (conversationId) => {
      socket.to(conversationId).emit('stop_typing', { userId, conversationId });
    });

    // ── Disconnect ──
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      socket.broadcast.emit('user_offline', { userId });
      console.log(`🔌 Socket disconnected: ${socket.user.name}`);
    });
  });
};
