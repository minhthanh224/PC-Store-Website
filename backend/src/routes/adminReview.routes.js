const express = require("express");
const {
  getReviews,
  updateReviewStatus
} = require("../controllers/adminReview.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth);
router.use(requireRoles("admin"));

router.get("/", asyncHandler(getReviews));
router.patch("/:id/status", asyncHandler(updateReviewStatus));

module.exports = router;
