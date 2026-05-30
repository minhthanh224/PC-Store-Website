const express = require("express");
const {
  register,
  login,
  getMe
} = require("../controllers/auth.controller");
const { changePassword } = require("../controllers/account.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.get("/me", authMiddleware, asyncHandler(getMe));
router.put("/password", authMiddleware, asyncHandler(changePassword));

module.exports = router;
