const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// GET /api/products - Lấy danh sách sản phẩm
router.get('/', productController.getProducts);

// POST /api/products - Thêm sản phẩm (cần check quyền admin thực tế sau này)
router.post('/', productController.createProduct);

// POST /api/products/:id/serials - Nhập kho (S/N)
router.post('/:productId/serials', productController.importSerials);

module.exports = router;
