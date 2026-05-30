const adminOrderService = require("../services/adminOrder.service");
const { buildCsv, sendCsv, formatDateForFilename } = require("../utils/csvExport");

const ORDER_STATUS_LABELS = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy"
};

const PAYMENT_METHOD_LABELS = {
  cod: "COD",
  bank_transfer: "Chuyển khoản"
};

async function getOrders(req, res) {
  const result = await adminOrderService.getOrders(req.query);

  res.json({
    success: true,
    data: result.orders,
    pagination: result.pagination
  });
}

async function exportOrders(req, res) {
  const orders = await adminOrderService.exportOrders(req.query);
  const headers = [
    { key: "order_code", label: "Mã đơn" },
    { key: "customer_name", label: "Khách hàng" },
    { key: "customer_phone", label: "SĐT" },
    { key: "customer_email", label: "Email" },
    { label: "Trạng thái", value: (order) => ORDER_STATUS_LABELS[order.status] || order.status },
    { label: "Thanh toán", value: (order) => PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method },
    { key: "payment_status", label: "Trạng thái thanh toán" },
    { key: "item_count", label: "Số lượng sản phẩm" },
    { key: "bundle_item_count", label: "Mua kèm" },
    { key: "warranty_package_item_count", label: "Gói bảo hành" },
    { key: "serialized_item_count", label: "SP cần serial" },
    { key: "assigned_serial_count", label: "Serial đã gán" },
    { key: "subtotal_amount", label: "Tạm tính" },
    { key: "shipping_fee", label: "Phí vận chuyển" },
    { key: "discount_amount", label: "Giảm giá" },
    { key: "promotion_code_snapshot", label: "Mã ưu đãi" },
    { key: "promotion_title_snapshot", label: "Tên ưu đãi" },
    { key: "total_amount", label: "Tổng tiền" },
    { key: "created_at", label: "Ngày tạo" },
    { key: "updated_at", label: "Cập nhật" }
  ];

  const csv = buildCsv(headers, orders);
  sendCsv(res, `aerotech-orders-${formatDateForFilename(new Date())}.csv`, csv);
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
  exportOrders,
  getOrderDetail,
  updateOrderStatus,
  assignSerial,
  unassignSerial,
  addInternalNote
};
