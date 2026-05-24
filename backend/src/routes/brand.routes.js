const express = require("express");
const { getBrands } = require("../controllers/brand.controller");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(getBrands));

module.exports = router;
