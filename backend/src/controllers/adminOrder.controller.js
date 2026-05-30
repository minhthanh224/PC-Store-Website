const adminOrderService = require("../services/adminOrder.service");

async function getOrders(req, res) {
  const result = await adminOrderService.getOrders(req.query);

  res.json({
    success: true,
    data: result.orders,
    pagination: result.pagination
  });
}

async function getOrderDetail(req, res) {
  const detail = await adminOrderService.getOrderDetail(req.params.orderCode);

  res.json({
    success: true,
    data: detail
  });
}

async function updateOrderStatus(req, res) {
  const result = await adminOrderService.updateOrderStatus(req.params.orderCode, req.body.status);

  res.json({
    success: true,
    message: result.message,
    data: {
      status: result.status
    }
  });
}

async function updatePaymentStatus(req, res) {
  const result = await adminOrderService.updatePaymentStatus(req.params.orderCode, req.body.payment_status);
  res.json({ success: true, message: result.message, data: { payment_status: result.payment_status } });
}

async function assignSerial(req, res) {
  const result = await adminOrderService.assignSerial(
    req.params.orderCode,
    req.params.itemId,
    req.body.serial_number_id
  );

  res.json({
    success: true,
    message: result.message
  });
}

async function unassignSerial(req, res) {
  const result = await adminOrderService.unassignSerial(req.params.orderCode, req.params.itemId);

  res.json({
    success: true,
    message: result.message
  });
}

module.exports = {
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  updatePaymentStatus,
  assignSerial,
  unassignSerial
};
