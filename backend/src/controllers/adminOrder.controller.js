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
  const result = await adminOrderService.updateOrderStatus(req.params.orderCode, req.body.status, req.user, req.body.note);

  res.json({
    success: true,
    message: result.message,
    data: {
      status: result.status
    }
  });
}

async function addInternalNote(req, res) {
  const result = await adminOrderService.addInternalNote(req.params.orderCode, req.user, req.body);

  res.status(201).json({
    success: true,
    message: result.message
  });
}

async function assignSerial(req, res) {
  const result = await adminOrderService.assignSerial(
    req.params.orderCode,
    req.params.itemId,
    req.body.serial_number_id,
    req.user
  );

  res.json({
    success: true,
    message: result.message
  });
}

async function unassignSerial(req, res) {
  const result = await adminOrderService.unassignSerial(req.params.orderCode, req.params.itemId, req.user);

  res.json({
    success: true,
    message: result.message
  });
}

module.exports = {
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  assignSerial,
  unassignSerial,
  addInternalNote
};
