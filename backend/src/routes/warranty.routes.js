const express = require("express");
const { lookupWarranty } = require("../controllers/warranty.controller");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/lookup", asyncHandler(lookupWarranty));

module.exports = router;
