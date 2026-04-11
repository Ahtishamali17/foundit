// ============================================================
// routes/auth.routes.js
// ============================================================
const express = require('express');
const router = express.Router();
const {
  register, login, getMe, forgotPassword, resetPassword, updatePassword,
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { validateRegister, validateLogin } = require('../middleware/validate.middleware');

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.put('/update-password', protect, updatePassword);

module.exports = router;


// ============================================================
// routes/item.routes.js
// ============================================================
// const express = require('express');
// const router2 = express.Router();
// const {
//   getItems, getItem, createItem, updateItem, deleteItem, resolveItem, getMyItems, getMatches,
// } = require('../controllers/item.controller');
// const { protect } = require('../middleware/auth.middleware');
// const upload = require('../middleware/upload.middleware');
// 
// router2.get('/', getItems);
// router2.get('/my-items', protect, getMyItems);
// router2.get('/:id', getItem);
// router2.get('/:id/matches', protect, getMatches);
// router2.post('/', protect, upload.single('image'), createItem);
// router2.put('/:id', protect, upload.single('image'), updateItem);
// router2.put('/:id/resolve', protect, resolveItem);
// router2.delete('/:id', protect, deleteItem);
// 
// module.exports = router2;

/* NOTE: Each file below should be a separate file in routes/ directory.
   The content for each route is shown with clear file markers. */
