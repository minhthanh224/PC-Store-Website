const express = require("express");
const {
  getAuditLogs,
  getAuditFilterOptions,
  exportAuditLogs
} = require("../controllers/adminAudit.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth);
router.use(requireRoles("admin"));

router.get("/options", asyncHandler(getAuditFilterOptions));
router.get("/export", asyncHandler(exportAuditLogs));
router.get("/", asyncHandler(getAuditLogs));

module.exports = router;
