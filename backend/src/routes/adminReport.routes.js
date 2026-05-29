const express = require("express");
const {
  getOverview,
  getRevenue,
  getBestSelling,
  getInventory,
  getWarranty,
  getOrders
} = require("../controllers/adminReport.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth);
router.use(requireRoles("admin"));

router.get("/overview", asyncHandler(getOverview));
router.get("/revenue", asyncHandler(getRevenue));
router.get("/best-selling", asyncHandler(getBestSelling));
router.get("/inventory", asyncHandler(getInventory));
router.get("/warranty", asyncHandler(getWarranty));
router.get("/orders", asyncHandler(getOrders));

module.exports = router;
