const pool = require("../config/database");
const { getAvailableStockExpression } = require("../services/stock.service");

async function getWishlist(req, res) {
  const [rows] = await pool.execute(
    `
      SELECT
        p.id,
        p.slug,
        p.name,
        p.sku,
        p.product_type,
        p.base_price,
        p.sale_price,
        p.warranty_months,
        p.requires_serial,
        b.name AS brand_name,
        c.name AS category_name,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) AS primary_image,
        ${getAvailableStockExpression("p")} AS available_stock,
        w.created_at
      FROM wishlists w
      INNER JOIN products p ON p.id = w.product_id
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC, w.id DESC
    `,
    [req.user.id]
  );

  res.json({
    success: true,
    data: rows.map(function (row) {
      return {
        ...row,
        base_price: Number(row.base_price),
        sale_price: row.sale_price === null ? null : Number(row.sale_price),
        requires_serial: Boolean(row.requires_serial),
        available_stock: Number(row.available_stock)
      };
    })
  });
}

async function addWishlistItem(req, res) {
  const productId = Number(req.params.productId);

  if (!Number.isInteger(productId) || productId < 1) {
    res.status(400).json({
      success: false,
      message: "Sản phẩm không hợp lệ."
    });
    return;
  }

  const [products] = await pool.execute(
    "SELECT id FROM products WHERE id = ? AND status = 'active' LIMIT 1",
    [productId]
  );

  if (products.length === 0) {
    res.status(404).json({
      success: false,
      message: "Không tìm thấy sản phẩm đang bán."
    });
    return;
  }

  await pool.execute(
    "INSERT IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)",
    [req.user.id, productId]
  );

  res.status(201).json({
    success: true,
    message: "Đã thêm sản phẩm vào danh sách yêu thích."
  });
}

async function removeWishlistItem(req, res) {
  const productId = Number(req.params.productId);

  if (!Number.isInteger(productId) || productId < 1) {
    res.status(400).json({
      success: false,
      message: "Sản phẩm không hợp lệ."
    });
    return;
  }

  await pool.execute(
    "DELETE FROM wishlists WHERE user_id = ? AND product_id = ?",
    [req.user.id, productId]
  );

  res.json({
    success: true,
    message: "Đã xóa sản phẩm khỏi danh sách yêu thích."
  });
}

module.exports = {
  getWishlist,
  addWishlistItem,
  removeWishlistItem
};
