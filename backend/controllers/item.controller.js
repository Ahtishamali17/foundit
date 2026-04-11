const Item = require('../models/Item.model');
const User = require('../models/User.model');
const { uploadImage, deleteImage } = require('../services/cloudinary.service');
const { findAIMatches, notifyMatches } = require('../services/aiMatching.service');
const { sendEmail } = require('../services/email.service');

// ===== GET ALL ITEMS (with search, filter, pagination) =====
// @route  GET /api/items
// @access Public
exports.getItems = async (req, res, next) => {
  try {
    const {
      type, category, status = 'pending',
      search, location, page = 1, limit = 12,
      sortBy = 'createdAt', sortOrder = 'desc',
      lat, lng, radius = 5000, // radius in meters
    } = req.query;

    const query = {};

    // Type filter (lost/found)
    if (type && ['lost', 'found'].includes(type)) query.type = type;

    // Category filter
    if (category) query.category = category;

    // Status filter
    if (status) query.status = status;

    // Full-text search (uses MongoDB text index)
    if (search) {
      query.$text = { $search: search };
    }

    // Geo-proximity filter
    if (lat && lng) {
      query['location.coordinates'] = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius),
        },
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [items, total] = await Promise.all([
      Item.find(query)
        .populate('userId', 'name avatar college')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Item.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ===== GET SINGLE ITEM =====
// @route  GET /api/items/:id
// @access Public
exports.getItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('userId', 'name avatar email college')
      .populate('aiMatches.itemId', 'title image type location');

    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });

    // Increment views (non-blocking)
    Item.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// ===== CREATE ITEM =====
// @route  POST /api/items
// @access Private
exports.createItem = async (req, res, next) => {
  try {
    const { title, description, type, category, locationName, lat, lng, date, contact, notes } = req.body;

    let imageData = { url: null, publicId: null };

    // Handle image upload to Cloudinary
    if (req.file) {
      const result = await uploadImage(req.file.buffer, `foundit/items/${req.user.id}`);
      imageData = { url: result.secure_url, publicId: result.public_id };
    }

    const item = await Item.create({
      title,
      description,
      type,
      category,
      image: imageData,
      location: {
        name: locationName,
        coordinates: {
          type: 'Point',
          coordinates: [parseFloat(lng) || 0, parseFloat(lat) || 0],
        },
      },
      date: new Date(date),
      contact,
      userId: req.user.id,
    });

    await item.populate('userId', 'name avatar');

    // Trigger AI matching in background (non-blocking)
    findAIMatches(item).then(async (matches) => {
      if (matches.length > 0) {
        item.aiMatches = matches;
        await item.save();

        // Notify user of potential matches
        const user = await User.findById(req.user.id);
        if (user.notifications.email) {
          notifyMatches(user, item, matches).catch(console.error);
        }
      }
    }).catch(console.error);

    // Emit real-time event to all connected clients
    const io = req.app.get('io');
    io.emit('new_item', { item, type: item.type });

    res.status(201).json({ success: true, data: item, message: 'Item posted successfully!' });
  } catch (err) {
    next(err);
  }
};

// ===== UPDATE ITEM =====
// @route  PUT /api/items/:id
// @access Private (owner only)
exports.updateItem = async (req, res, next) => {
  try {
    let item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });

    // Only owner or admin can update
    if (item.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this item.' });
    }

    // Handle new image upload
    if (req.file) {
      if (item.image?.publicId) await deleteImage(item.image.publicId);
      const result = await uploadImage(req.file.buffer, `foundit/items/${req.user.id}`);
      req.body.image = { url: result.secure_url, publicId: result.public_id };
    }

    item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('userId', 'name avatar');

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// ===== DELETE ITEM =====
// @route  DELETE /api/items/:id
// @access Private (owner only)
exports.deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });

    if (item.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this item.' });
    }

    // Remove image from Cloudinary
    if (item.image?.publicId) await deleteImage(item.image.publicId);

    await item.deleteOne();
    res.json({ success: true, message: 'Item deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// ===== MARK AS RESOLVED =====
// @route  PUT /api/items/:id/resolve
// @access Private (owner only)
exports.resolveItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id).populate('userId', 'name email notifications');
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });

    if (item.userId._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    item.status = 'resolved';
    item.claimedBy = req.body.claimedBy || null;
    await item.save();

    // Send resolution confirmation email
    if (item.userId.notifications.email) {
      sendEmail({
        to: item.userId.email,
        subject: `FoundIt — "${item.title}" has been resolved! 🎉`,
        template: 'itemResolved',
        data: { name: item.userId.name, itemTitle: item.title },
      }).catch(console.error);
    }

    res.json({ success: true, data: item, message: 'Item marked as resolved!' });
  } catch (err) {
    next(err);
  }
};

// ===== GET USER'S ITEMS =====
// @route  GET /api/items/my-items
// @access Private
exports.getMyItems = async (req, res, next) => {
  try {
    const { status, type } = req.query;
    const query = { userId: req.user.id };
    if (status) query.status = status;
    if (type) query.type = type;

    const items = await Item.find(query).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: items, total: items.length });
  } catch (err) {
    next(err);
  }
};

// ===== GET AI MATCHES FOR AN ITEM =====
// @route  GET /api/items/:id/matches
// @access Private
exports.getMatches = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });

    // Refresh AI matches
    const matches = await findAIMatches(item);

    res.json({ success: true, data: matches });
  } catch (err) {
    next(err);
  }
};
