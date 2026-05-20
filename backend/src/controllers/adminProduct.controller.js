const adminProductService = require("../services/adminProduct.service");

async function getProducts(req, res) {
  const result = await adminProductService.getProducts(req.query);

  res.json({
    success: true,
    data: result.products,
    pagination: result.pagination
  });
}

async function getProductById(req, res) {
  const product = await adminProductService.getProductById(Number(req.params.id));

  if (!product) {
    res.status(404).json({
      success: false,
      message: "Không tìm thấy sản phẩm."
    });
    return;
  }

  res.json({
    success: true,
    data: product
  });
}

async function createProduct(req, res) {
  const product = await adminProductService.createProduct(req.body);

  res.status(201).json({
    success: true,
    message: "Tạo sản phẩm thành công.",
    data: product
  });
}

async function updateProduct(req, res) {
  const product = await adminProductService.updateProduct(Number(req.params.id), req.body);

  res.json({
    success: true,
    message: "Cập nhật sản phẩm thành công.",
    data: product
  });
}

async function updateProductStatus(req, res) {
  await adminProductService.updateProductStatus(Number(req.params.id), req.body.status);

  res.json({
    success: true,
    message: "Cập nhật trạng thái sản phẩm thành công."
  });
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus
};
