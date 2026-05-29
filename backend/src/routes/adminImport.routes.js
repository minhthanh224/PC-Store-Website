const express = require("express");
const multer = require("multer");
const {
  previewProductImport,
  commitProductImport
} = require("../controllers/adminImport.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRoles } = require("../middlewares/role.middleware");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: function (req, file, callback) {
    if (!file.originalname || !file.originalname.toLowerCase().endsWith(".zip")) {
      const error = new Error("Chỉ hỗ trợ upload file .zip.");
      error.statusCode = 400;
      callback(error);
      return;
    }

    callback(null, true);
  }
});

router.use(requireAuth);
router.use(requireRoles("admin"));

router.post("/products/preview", upload.single("file"), asyncHandler(previewProductImport));
router.post("/products/commit", upload.single("file"), asyncHandler(commitProductImport));

module.exports = router;
