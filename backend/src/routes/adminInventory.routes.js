const express = require("express");
const {
  getInventorySummary,
  getInventoryProducts,
  getSerials,
  exportSerials,
  createSerial,
  previewSerialImport,
  commitSerialImport,
  updateSerialStatus,
  serialImportUpload
} = require("../controllers/adminInventory.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/summary", requireAuth, requireRoles("admin", "technician"), asyncHandler(getInventorySummary));
router.get("/products", requireAuth, requireRoles("admin", "technician"), asyncHandler(getInventoryProducts));
router.get("/serials", requireAuth, requireRoles("admin", "technician"), asyncHandler(getSerials));
router.get("/serials/export", requireAuth, requireRoles("admin", "technician"), asyncHandler(exportSerials));
router.post("/serials", requireAuth, requireRoles("admin", "technician"), asyncHandler(createSerial));
router.post("/serials/import/preview", requireAuth, requireRoles("admin", "technician"), serialImportUpload.single("file"), asyncHandler(previewSerialImport));
router.post("/serials/import/commit", requireAuth, requireRoles("admin", "technician"), serialImportUpload.single("file"), asyncHandler(commitSerialImport));
router.patch("/serials/:id/status", requireAuth, requireRoles("admin"), asyncHandler(updateSerialStatus));

module.exports = router;
