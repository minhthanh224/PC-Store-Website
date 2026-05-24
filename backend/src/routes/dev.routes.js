const express = require("express");
const { getDatabaseSummary } = require("../controllers/dev.controller");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/db-summary", asyncHandler(getDatabaseSummary));

module.exports = router;
