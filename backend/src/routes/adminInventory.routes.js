const express = require("express");
const {
  getInventorySummary,
  getSerials,
  createSerial,
  updateSerialStatus
} = require("../controllers/adminInventory.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/summary", requireAuth, requireRoles("admin", "technician"), asyncHandler(getInventorySummary));
router.get("/serials", requireAuth, requireRoles("admin", "technician"), asyncHandler(getSerials));
router.post("/serials", requireAuth, requireRoles("admin", "technician"), asyncHandler(createSerial));
router.patch("/serials/:id/status", requireAuth, requireRoles("admin"), asyncHandler(updateSerialStatus));

module.exports = router;
