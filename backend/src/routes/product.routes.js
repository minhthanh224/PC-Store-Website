const express = require("express");
const {
  getFeaturedProducts,
  getProducts,
  getProductBySlug,
  getProductReviews,
  createProductReview
} = require("../controllers/product.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/featured", asyncHandler(getFeaturedProducts));
router.get("/", asyncHandler(getProducts));
router.get("/:slug/reviews", asyncHandler(getProductReviews));
router.post("/:slug/reviews", requireAuth, requireRoles("customer"), asyncHandler(createProductReview));
router.get("/:slug", asyncHandler(getProductBySlug));

module.exports = router;
