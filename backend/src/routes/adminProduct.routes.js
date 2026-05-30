const express = require("express");
const {
  getProducts,
  exportProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus
} = require("../controllers/adminProduct.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth);
router.use(requireRoles("admin"));

router.get("/", asyncHandler(getProducts));
router.get("/export", asyncHandler(exportProducts));
router.get("/:id", asyncHandler(getProductById));
router.post("/", asyncHandler(createProduct));
router.put("/:id", asyncHandler(updateProduct));
router.patch("/:id/status", asyncHandler(updateProductStatus));

module.exports = router;
