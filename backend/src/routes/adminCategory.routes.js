const express = require("express");
const {
  getCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus
} = require("../controllers/adminCategory.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth);
router.use(requireRoles("admin"));

router.get("/", asyncHandler(getCategories));
router.post("/", asyncHandler(createCategory));
router.put("/:id", asyncHandler(updateCategory));
router.patch("/:id/status", asyncHandler(updateCategoryStatus));

module.exports = router;
