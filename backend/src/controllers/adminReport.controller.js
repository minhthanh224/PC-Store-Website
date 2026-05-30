const adminReportService = require("../services/adminReport.service");

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

async function getWarrantyQuality(req, res) {
  res.json({
    success: true,
    data: await adminReportService.getWarrantyQualityReport()
  });
}

module.exports = {
  getOverview,
  getRevenue,
  getBestSelling,
  getInventory,
  getWarranty,
  getOrders,
  getWarrantyQuality
};
