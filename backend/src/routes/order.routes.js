const express = require("express");
const {
  previewPromotion,
  createOrder,
  getMyOrders,
  getOrderByCode
} = require("../controllers/order.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const roleMiddleware = require("../middlewares/role.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(["customer"]));

router.post("/promotion-preview", asyncHandler(previewPromotion));
router.post("/", asyncHandler(createOrder));
router.get("/my", asyncHandler(getMyOrders));
router.get("/:orderCode", asyncHandler(getOrderByCode));

module.exports = router;
