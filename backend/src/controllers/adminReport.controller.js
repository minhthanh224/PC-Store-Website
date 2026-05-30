const adminReportService = require("../services/adminReport.service");
const { buildCsv, sendCsv, formatDateForFilename } = require("../utils/csvExport");

async function getOverview(req, res) {
  const data = await adminReportService.getOverview(req.query);

  res.json({
    success: true,
    data
  });
}

async function getRevenue(req, res) {
  const data = await adminReportService.getRevenue(req.query);

  res.json({
    success: true,
    data
  });
}

async function getBestSelling(req, res) {
  const data = await adminReportService.getBestSelling(req.query);

  res.json({
    success: true,
    data
  });
}

async function getInventory(req, res) {
  const data = await adminReportService.getInventoryReport();

  res.json({
    success: true,
    data
  });
}

async function getWarranty(req, res) {
  const data = await adminReportService.getWarrantyReport();

  res.json({
    success: true,
    data
  });
}

async function getOrders(req, res) {
  const data = await adminReportService.getOrderReport();

  res.json({
    success: true,
    data
  });
}

function sendRevenueCsv(res, rows) {
  const headers = [
    { key: "label", label: "Kỳ" },
    { key: "order_count", label: "Số đơn" },
    { key: "revenue", label: "Doanh thu thuần" },
    { key: "product_revenue", label: "Doanh thu hàng hóa" },
    { key: "bundle_addon_revenue", label: "Mua kèm" },
    { key: "warranty_package_revenue", label: "Gói bảo hành" },
    { key: "shipping_revenue", label: "Phí vận chuyển" },
    { key: "promotion_discount", label: "Giảm giá" },
    { key: "gross_item_revenue", label: "Tổng dòng hàng" }
  ];

  sendCsv(res, `aerotech-report-revenue-${formatDateForFilename(new Date())}.csv`, buildCsv(headers, rows));
}

function sendBestSellingCsv(res, rows) {
  const headers = [
    { key: "sku", label: "SKU" },
    { key: "product_name", label: "Sản phẩm" },
    { key: "brand_name", label: "Thương hiệu" },
    { key: "category_name", label: "Danh mục" },
    { key: "total_quantity", label: "Số lượng bán" },
    { key: "total_revenue", label: "Doanh thu" }
  ];

  sendCsv(res, `aerotech-report-best-selling-${formatDateForFilename(new Date())}.csv`, buildCsv(headers, rows));
}

function sendInventoryCsv(res, rows) {
  const headers = [
    { key: "sku", label: "SKU" },
    { key: "product_name", label: "Sản phẩm" },
    { key: "brand_name", label: "Thương hiệu" },
    { key: "category_name", label: "Danh mục" },
    { key: "product_type", label: "Loại" },
    { label: "Quản lý serial", value: (row) => row.requires_serial ? "Có" : "Không" },
    { key: "stock_quantity", label: "Tồn thường" },
    { key: "serial_in_stock", label: "Serial trong kho" },
    { key: "serial_sold", label: "Serial đã bán" },
    { key: "serial_warranty", label: "Serial bảo hành" },
    { key: "serial_returned", label: "Serial trả lại" },
    { key: "available_stock", label: "Tồn khả dụng" },
    { label: "Cảnh báo", value: (row) => row.low_stock_warning ? "Tồn thấp" : "Ổn" }
  ];

  sendCsv(res, `aerotech-report-inventory-${formatDateForFilename(new Date())}.csv`, buildCsv(headers, rows));
}

function sendWarrantyCsv(res, data) {
  const countRows = (data.counts || []).map(function (row) {
    return {
      type: "Tổng hợp",
      status: row.status_label,
      count: row.count,
      ticket_code: "",
      customer_name: "",
      serial_code: "",
      product_name: "",
      received_date: "",
      completed_date: "",
      issue_description: ""
    };
  });
  const ticketRows = (data.latest_tickets || []).map(function (ticket) {
    return {
      type: "Phiếu gần đây",
      status: ticket.status,
      count: "",
      ticket_code: ticket.ticket_code,
      customer_name: ticket.customer_name,
      serial_code: ticket.serial_code,
      product_name: ticket.product_name,
      received_date: ticket.received_date,
      completed_date: ticket.completed_date,
      issue_description: ticket.issue_description
    };
  });
  const headers = [
    { key: "type", label: "Loại dòng" },
    { key: "status", label: "Trạng thái" },
    { key: "count", label: "Số lượng" },
    { key: "ticket_code", label: "Mã phiếu" },
    { key: "customer_name", label: "Khách hàng" },
    { key: "serial_code", label: "Serial" },
    { key: "product_name", label: "Sản phẩm" },
    { key: "received_date", label: "Ngày nhận" },
    { key: "completed_date", label: "Ngày hoàn tất" },
    { key: "issue_description", label: "Lỗi báo cáo" }
  ];

  sendCsv(res, `aerotech-report-warranty-${formatDateForFilename(new Date())}.csv`, buildCsv(headers, countRows.concat(ticketRows)));
}

function sendOrderStatusCsv(res, data) {
  const rows = Object.keys(data || {}).map(function (status) {
    return {
      status,
      count: data[status]
    };
  });
  const headers = [
    { key: "status", label: "Trạng thái" },
    { key: "count", label: "Số lượng" }
  ];

  sendCsv(res, `aerotech-report-order-status-${formatDateForFilename(new Date())}.csv`, buildCsv(headers, rows));
}

async function exportReport(req, res) {
  const type = req.params.type;

  if (type === "revenue") {
    sendRevenueCsv(res, await adminReportService.getRevenue(req.query));
    return;
  }

  if (type === "best-selling") {
    sendBestSellingCsv(res, await adminReportService.getBestSelling(req.query));
    return;
  }

  if (type === "inventory") {
    sendInventoryCsv(res, await adminReportService.getInventoryReport());
    return;
  }

  if (type === "warranty") {
    sendWarrantyCsv(res, await adminReportService.getWarrantyReport());
    return;
  }

  if (type === "orders") {
    sendOrderStatusCsv(res, await adminReportService.getOrderReport());
    return;
  }

  res.status(400).json({
    success: false,
    message: "Loại báo cáo export không hợp lệ."
  });
}

module.exports = {
  getOverview,
  getRevenue,
  getBestSelling,
  getInventory,
  getWarranty,
  getOrders,
  exportReport
};
