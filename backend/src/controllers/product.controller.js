const productService = require("../services/product.service");

async function getFeaturedProducts(req, res) {
  const products = await productService.getFeaturedProducts();

  res.json({
    success: true,
    data: products
  });
}

async function getProducts(req, res) {
  const result = await productService.getProducts(req.query);

  res.json({
    success: true,
    data: result.products,
    pagination: result.pagination
  });
}

async function getProductBySlug(req, res) {
  const product = await productService.getProductBySlug(req.params.slug);

  if (!product) {
    res.status(404).json({
      success: false,
      message: "Product not found"
    });
    return;
  }

  res.json({
    success: true,
    data: product
  });
}

async function getProductReviews(req, res) {
  const reviews = await productService.getProductReviews(req.params.slug);

  res.json({
    success: true,
    data: reviews
  });
}

async function createProductReview(req, res) {
  const review = await productService.createProductReview(req.params.slug, req.user.id, req.body);

  res.status(201).json({
    success: true,
    message: "Đã gửi đánh giá. Đánh giá sẽ hiển thị sau khi được duyệt.",
    data: review
  });
}

module.exports = {
  getFeaturedProducts,
  getProducts,
  getProductBySlug,
  getProductReviews,
  createProductReview
};
