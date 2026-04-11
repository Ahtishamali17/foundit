const mongoose = require('mongoose');

const CATEGORIES = ['Electronics', 'ID/Cards', 'Bags', 'Clothing', 'Books', 'Keys', 'Jewelry', 'Other'];
const ITEM_TYPES = ['lost', 'found'];
const STATUSES = ['pending', 'resolved'];

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Item title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      enum: { values: ITEM_TYPES, message: 'Type must be lost or found' },
      required: [true, 'Item type is required'],
    },
    category: {
      type: String,
      enum: { values: CATEGORIES, message: 'Invalid category' },
      required: [true, 'Category is required'],
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'pending',
    },
    // Image stored as Cloudinary URL (or local path)
    image: {
      url: { type: String, default: null },
      publicId: { type: String, default: null }, // Cloudinary public_id for deletion
    },
    location: {
      name: {
        type: String,
        required: [true, 'Location name is required'],
        trim: true,
      },
      // GeoJSON for proximity search
      coordinates: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
      },
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    contact: {
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    // AI matching score cache
    aiMatches: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
        score: Number,
        reason: String,
      },
    ],
    views: { type: Number, default: 0 },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ===== INDEXES =====
// Text index for full-text search across title + description + category
itemSchema.index({ title: 'text', description: 'text', category: 'text' });
// Geospatial index for proximity queries
itemSchema.index({ 'location.coordinates': '2dsphere' });
// Compound indexes for common queries
itemSchema.index({ type: 1, status: 1, createdAt: -1 });
itemSchema.index({ userId: 1, createdAt: -1 });
itemSchema.index({ category: 1, type: 1 });

// ===== VIRTUALS =====
itemSchema.virtual('postedBy', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Increment views
itemSchema.methods.incrementViews = async function () {
  this.views += 1;
  await this.save();
};

module.exports = mongoose.model('Item', itemSchema);
