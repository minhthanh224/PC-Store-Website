const express = require("express");
const {
  getBrands,
  createBrand,
  updateBrand,
  updateBrandStatus
} = require("../controllers/adminBrand.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth);
router.use(requireRoles("admin"));

router.get("/", asyncHandler(getBrands));
router.post("/", asyncHandler(createBrand));
router.put("/:id", asyncHandler(updateBrand));
router.patch("/:id/status", asyncHandler(updateBrandStatus));

module.exports = router;
