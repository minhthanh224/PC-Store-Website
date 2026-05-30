const express = require("express");
const {
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  assignSerial,
  unassignSerial,
  addInternalNote
} = require("../controllers/adminOrder.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth);

router.get("/", requireRoles("admin", "sales", "technician"), asyncHandler(getOrders));
router.get("/:orderCode", requireRoles("admin", "sales", "technician"), asyncHandler(getOrderDetail));
router.patch("/:orderCode/status", requireRoles("admin", "sales"), asyncHandler(updateOrderStatus));
router.post("/:orderCode/notes", requireRoles("admin", "sales", "technician"), asyncHandler(addInternalNote));
router.post("/:orderCode/items/:itemId/assign-serial", requireRoles("admin", "technician"), asyncHandler(assignSerial));
router.patch("/:orderCode/items/:itemId/unassign-serial", requireRoles("admin"), asyncHandler(unassignSerial));

module.exports = router;
