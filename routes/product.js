// routes/product_routes.js

const express = require('express');
const { getProductById, updateProduct } = require('../controllers/product_controller');
const upload = require('../middlewares/upload');

const router = express.Router();

router.get('/product/:id', getProductById);
router.put('/product/update/:id', upload.single('image'), updateProduct);

module.exports = router;
