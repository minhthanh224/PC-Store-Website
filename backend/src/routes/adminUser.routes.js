const express = require("express");
const { getUsers, createUser, updateUser } = require("../controllers/adminUser.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
router.use(requireAuth);
router.use(requireRoles("admin"));
router.get("/", asyncHandler(getUsers));
router.post("/", asyncHandler(createUser));
router.put("/:id", asyncHandler(updateUser));

module.exports = router;
