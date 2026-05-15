const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middleware/upload');

// GET /api/products - Lấy danh sách sản phẩm
router.get('/', productController.getProducts);

// POST /api/products - Thêm sản phẩm (cần check quyền admin thực tế sau này)
router.post('/', upload.single('image'), productController.createProduct);

// POST /api/products/:id/serials - Nhập kho (S/N)
router.post('/:productId/serials', productController.importSerials);

// PUT /api/products/:id - Sửa sản phẩm
router.put('/:id', upload.single('image'), productController.updateProduct);


module.exports = router;
