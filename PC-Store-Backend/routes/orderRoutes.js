const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// POST /api/orders - Khách đặt hàng (UC-11)
router.post('/', orderController.createOrder);

// GET /api/orders - Admin xem danh sách đơn (UC-18)
router.get('/', orderController.getOrders);

// GET /api/orders/:id - Xem chi tiết 1 đơn
router.get('/:id', orderController.getOrderById);

// PUT /api/orders/:id/status - Cập nhật trạng thái (UC-20)
router.put('/:id/status', orderController.updateOrderStatus);

module.exports = router;
