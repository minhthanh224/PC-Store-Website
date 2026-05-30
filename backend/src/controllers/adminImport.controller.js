const productImportService = require("../services/productImport.service");

function requireZipFile(req) {
  if (!req.file || !req.file.buffer) {
    const error = new Error("Vui lòng upload file zip.");
    error.statusCode = 400;
    throw error;
  }
}

async function previewProductImport(req, res) {
  requireZipFile(req);

  const analysis = await productImportService.analyzeZip(req.file.buffer, req.body);

  res.json({
    success: true,
    data: productImportService.publicPreviewResult(analysis)
  });
}

async function commitProductImport(req, res) {
  requireZipFile(req);

  const result = await productImportService.importProducts(req.file.buffer, req.body);

  if (!result.canCommit) {
    res.status(400).json({
      success: false,
      message: "File import còn lỗi, chưa thể xác nhận import.",
      data: result
    });
    return;
  }

  res.json({
    success: true,
    message: "Import sản phẩm thành công.",
    data: result
  });
}

module.exports = {
  previewProductImport,
  commitProductImport
};
