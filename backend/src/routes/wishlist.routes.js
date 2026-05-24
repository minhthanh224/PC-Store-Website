const express = require("express");
const {
  getWishlist,
  addWishlistItem,
  removeWishlistItem
} = require("../controllers/wishlist.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(requireAuth);
router.use(requireRoles("customer"));

router.get("/", asyncHandler(getWishlist));
router.post("/:productId", asyncHandler(addWishlistItem));
router.delete("/:productId", asyncHandler(removeWishlistItem));

module.exports = router;
