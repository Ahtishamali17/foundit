const express = require('express');
const router = express.Router();
const {
  getItems, getItem, createItem, updateItem,
  deleteItem, resolveItem, getMyItems, getMatches,
} = require('../controllers/item.controller');
const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.get('/', getItems);
router.get('/my-items', protect, getMyItems);
router.get('/:id', getItem);
router.get('/:id/matches', protect, getMatches);
router.post('/', protect, upload.single('image'), createItem);
router.put('/:id', protect, upload.single('image'), updateItem);
router.put('/:id/resolve', protect, resolveItem);
router.delete('/:id', protect, deleteItem);

module.exports = router;
