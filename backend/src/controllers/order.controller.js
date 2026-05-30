const pool = require("../config/database");
const orderService = require("../services/order.service");

async function createOrder(req, res) {
  try {
    const order = await orderService.createOrder(req.user, req.body);

    res.status(201).json({
      success: true,
      message: "Đặt hàng thành công. Đơn hàng đang chờ duyệt.",
      data: order
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Không thể tạo đơn hàng."
    });
  }
}

async function getMyOrders(req, res) {
  const allowedStatuses = ["pending", "approved", "shipping", "completed", "cancelled"];
  const params = [req.user.id];
  let statusFilter = "";

  if (req.query.status && allowedStatuses.includes(req.query.status)) {
    statusFilter = "AND o.status = ?";
    params.push(req.query.status);
  }

  const [orders] = await pool.execute(
    `
      SELECT
        o.id,
        o.order_code,
        o.status,
        o.payment_method,
        o.payment_status,
        o.total_amount,
        o.created_at,
        (
          SELECT COUNT(*)
          FROM order_items count_oi
          WHERE count_oi.order_id = o.id
        ) AS item_count,
        (
          SELECT first_name_oi.product_name_snapshot
          FROM order_items first_name_oi
          WHERE first_name_oi.order_id = o.id
          ORDER BY first_name_oi.id ASC
          LIMIT 1
        ) AS first_product_name,
        (
          SELECT pi.image_url
          FROM order_items first_oi
          LEFT JOIN product_images pi ON pi.product_id = first_oi.product_id
          WHERE first_oi.order_id = o.id
          ORDER BY first_oi.id ASC, pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) AS first_product_image
      FROM orders o
      WHERE o.user_id = ?
      ${statusFilter}
      ORDER BY o.created_at DESC, o.id DESC
    `,
    params
  );

  res.json({
    success: true,
    data: orders.map(function (order) {
      return {
        ...order,
        total_amount: Number(order.total_amount),
        item_count: Number(order.item_count)
      };
    })
  });
}

async function getOrderByCode(req, res) {
  const [orders] = await pool.execute(
    `
      SELECT
        id,
        order_code,
        customer_name,
        customer_phone,
        customer_email,
        province,
        district,
        ward,
        address_line,
        payment_method,
        payment_status,
        status,
        subtotal_amount,
        shipping_fee,
        discount_amount,
        total_amount,
        note,
        created_at,
        updated_at
      FROM orders
      WHERE order_code = ? AND user_id = ?
      LIMIT 1
    `,
    [req.params.orderCode, req.user.id]
  );

  if (orders.length === 0) {
    res.status(404).json({
      success: false,
      message: "Không tìm thấy đơn hàng."
    });
    return;
  }

  const order = orders[0];
  const [items] = await pool.execute(
    `
      SELECT
        oi.id,
        oi.product_id,
        oi.serial_number_id,
        oi.product_name_snapshot,
        oi.sku_snapshot,
        oi.unit_price,
        oi.quantity,
        oi.total_price,
        oi.warranty_months_snapshot,
        oi.warranty_package_id,
        oi.warranty_package_title,
        oi.warranty_package_duration_months,
        oi.warranty_package_price,
        oi.is_bundle_addon,
        oi.bundle_parent_key,
        oi.bundle_parent_product_id,
        oi.bundle_parent_name_snapshot,
        oi.bundle_offer_id,
        oi.bundle_offer_title,
        oi.bundle_discount_type,
        oi.bundle_discount_value,
        oi.original_unit_price,
        oi.bundle_unit_price,
        oi.created_at,
        p.slug AS product_slug,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = oi.product_id
          ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) AS product_image,
        sn.serial_code
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      LEFT JOIN serial_numbers sn ON sn.id = oi.serial_number_id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `,
    [order.id]
  );

  res.json({
    success: true,
    data: {
      order: {
        ...order,
        subtotal_amount: Number(order.subtotal_amount),
        shipping_fee: Number(order.shipping_fee),
        discount_amount: Number(order.discount_amount),
        total_amount: Number(order.total_amount)
      },
      items: items.map(function (item) {
        return {
          ...item,
          unit_price: Number(item.unit_price),
          total_price: Number(item.total_price),
          warranty_package_id: item.warranty_package_id ? Number(item.warranty_package_id) : null,
          warranty_package_duration_months: item.warranty_package_duration_months === null ? null : Number(item.warranty_package_duration_months),
          warranty_package_price: Number(item.warranty_package_price || 0),
          is_bundle_addon: Boolean(item.is_bundle_addon),
          bundle_parent_product_id: item.bundle_parent_product_id ? Number(item.bundle_parent_product_id) : null,
          bundle_offer_id: item.bundle_offer_id ? Number(item.bundle_offer_id) : null,
          bundle_discount_value: item.bundle_discount_value === null ? null : Number(item.bundle_discount_value),
          original_unit_price: item.original_unit_price === null ? null : Number(item.original_unit_price),
          bundle_unit_price: item.bundle_unit_price === null ? null : Number(item.bundle_unit_price)
        };
      })
    }
  });
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrderByCode
};
