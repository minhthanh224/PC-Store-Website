const adminProductService = require("../services/adminProduct.service");
const { buildCsv, sendCsv, formatDateForFilename } = require("../utils/csvExport");

const PRODUCT_TYPE_LABELS = {
  pc_build: "PC build",
  laptop: "Laptop",
  component: "Linh kiện",
  monitor: "Màn hình",
  accessory: "Phụ kiện",
  service: "Dịch vụ"
};

const PRODUCT_STATUS_LABELS = {
  active: "Đang bán",
  inactive: "Ngừng bán"
};

async function getProducts(req, res) {
  const result = await adminProductService.getProducts(req.query);

  res.json({
    success: true,
    data: result.products,
    pagination: result.pagination
  });
}

async function exportProducts(req, res) {
  const products = await adminProductService.exportProducts(req.query);
  const headers = [
    { key: "sku", label: "SKU" },
    { key: "name", label: "Tên sản phẩm" },
    { key: "slug", label: "Slug" },
    { key: "brand_name", label: "Thương hiệu" },
    { key: "category_name", label: "Danh mục" },
    { label: "Loại", value: (product) => PRODUCT_TYPE_LABELS[product.product_type] || product.product_type },
    { key: "base_price", label: "Giá gốc" },
    { key: "sale_price", label: "Giá khuyến mãi" },
    { key: "available_stock", label: "Tồn khả dụng" },
    { key: "reserved_quantity", label: "Đang giữ" },
    { label: "Quản lý serial", value: (product) => product.requires_serial ? "Có" : "Không" },
    { key: "warranty_months", label: "Bảo hành tháng" },
    { label: "Trạng thái", value: (product) => PRODUCT_STATUS_LABELS[product.status] || product.status },
    { label: "Nổi bật", value: (product) => product.is_featured ? "Có" : "Không" },
    { key: "created_at", label: "Ngày tạo" },
    { key: "updated_at", label: "Cập nhật" }
  ];

  const csv = buildCsv(headers, products);
  sendCsv(res, `aerotech-products-${formatDateForFilename(new Date())}.csv`, csv);
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
  exportProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus
};
