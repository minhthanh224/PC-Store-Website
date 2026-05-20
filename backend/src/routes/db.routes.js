const express = require("express");
const { testDatabaseConnection } = require("../controllers/db.controller");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(testDatabaseConnection));

module.exports = router;
