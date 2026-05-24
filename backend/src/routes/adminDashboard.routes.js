const express = require("express");
const { getDashboardSummary } = require("../controllers/adminDashboard.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", requireAuth, requireRoles("admin", "sales", "technician"), asyncHandler(getDashboardSummary));

module.exports = router;
