const express = require("express");
const {
  getProfile,
  updateProfile,
  getAddresses,
  createAddress,
  changePassword
} = require("../controllers/account.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const roleMiddleware = require("../middlewares/role.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware(["customer"]));

router.get("/profile", asyncHandler(getProfile));
router.put("/profile", asyncHandler(updateProfile));
router.get("/addresses", asyncHandler(getAddresses));
router.post("/addresses", asyncHandler(createAddress));
router.put("/password", asyncHandler(changePassword));

module.exports = router;
