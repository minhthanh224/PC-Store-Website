const pool = require("../config/database");

const ORDER_STATUSES = ["pending", "approved", "shipping", "completed", "cancelled"];
const PAYMENT_METHODS = ["cod", "bank_transfer"];
const FINAL_STATUSES = ["completed", "cancelled"];
const ALLOWED_TRANSITIONS = {
  pending: ["approved", "cancelled"],
  approved: ["shipping", "cancelled"],
  shipping: ["completed"]
};

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizePagination(query) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);

  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
}

function normalizeOrder(row) {
  return {
    ...row,
    subtotal_amount: Number(row.subtotal_amount),
    shipping_fee: Number(row.shipping_fee),
    discount_amount: Number(row.discount_amount),
    total_amount: Number(row.total_amount),
    item_count: Number(row.item_count || 0),
    serialized_item_count: Number(row.serialized_item_count || 0),
    assigned_serial_count: Number(row.assigned_serial_count || 0)
  };
}

function normalizeItem(row) {
  return {
    ...row,
    requires_serial: Boolean(row.requires_serial),
    unit_price: Number(row.unit_price),
    quantity: Number(row.quantity),
    total_price: Number(row.total_price),
    warranty_months_snapshot: Number(row.warranty_months_snapshot),
    warranty_package_id: row.warranty_package_id ? Number(row.warranty_package_id) : null,
    warranty_package_duration_months: row.warranty_package_duration_months === null ? null : Number(row.warranty_package_duration_months),
    warranty_package_price: Number(row.warranty_package_price || 0),
    is_bundle_addon: Boolean(row.is_bundle_addon),
    bundle_parent_product_id: row.bundle_parent_product_id ? Number(row.bundle_parent_product_id) : null,
    bundle_offer_id: row.bundle_offer_id ? Number(row.bundle_offer_id) : null,
    bundle_discount_value: row.bundle_discount_value === null ? null : Number(row.bundle_discount_value),
    original_unit_price: row.original_unit_price === null ? null : Number(row.original_unit_price),
    bundle_unit_price: row.bundle_unit_price === null ? null : Number(row.bundle_unit_price),
    available_serials: []
  };
}

function getWorkflowInfo(order, items) {
  const missingSerialCount = items.reduce(function (total, item) {
    if (item.requires_serial && !item.serial_number_id) {
      return total + item.quantity;
    }

    return total;
  }, 0);

  return {
    can_approve: order.status === "pending",
    can_cancel: order.status === "pending" || order.status === "approved",
    can_ship: order.status === "approved" && missingSerialCount === 0,
    can_complete: order.status === "shipping" && missingSerialCount === 0,
    missing_serial_count: missingSerialCount
  };
}

async function getOrders(query) {
  const where = ["1 = 1"];
  const params = [];

  if (query.keyword && query.keyword.trim()) {
    const keyword = `%${query.keyword.trim()}%`;
    where.push("(o.order_code LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.customer_email LIKE ?)");
    params.push(keyword, keyword, keyword, keyword);
  }

  if (query.status && ORDER_STATUSES.includes(query.status)) {
    where.push("o.status = ?");
    params.push(query.status);
  }

  if (query.paymentMethod && PAYMENT_METHODS.includes(query.paymentMethod)) {
    where.push("o.payment_method = ?");
    params.push(query.paymentMethod);
  }

  const { page, limit, offset } = normalizePagination(query);
  const whereSql = where.join(" AND ");

  const [[countRow]] = await pool.execute(
    `
      SELECT COUNT(*) AS total
      FROM orders o
      WHERE ${whereSql}
    `,
    params
  );

  const [orders] = await pool.execute(
    `
      SELECT
        o.id,
        o.order_code,
        o.customer_name,
        o.customer_phone,
        o.customer_email,
        o.payment_method,
        o.payment_status,
        o.status,
        o.subtotal_amount,
        o.shipping_fee,
        o.discount_amount,
        o.total_amount,
        o.created_at,
        o.updated_at,
        COALESCE(SUM(oi.quantity), 0) AS item_count,
        COALESCE(SUM(CASE WHEN p.requires_serial = 1 THEN oi.quantity ELSE 0 END), 0) AS serialized_item_count,
        COALESCE(SUM(CASE WHEN oi.serial_number_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS assigned_serial_count,
        (
          SELECT first_oi.product_name_snapshot
          FROM order_items first_oi
          WHERE first_oi.order_id = o.id
          ORDER BY first_oi.id ASC
          LIMIT 1
        ) AS first_product_name,
        (
          SELECT pi.image_url
          FROM order_items first_image_oi
          LEFT JOIN product_images pi ON pi.product_id = first_image_oi.product_id
          WHERE first_image_oi.order_id = o.id
          ORDER BY first_image_oi.id ASC, pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) AS first_product_image
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE ${whereSql}
      GROUP BY o.id
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT ? OFFSET ?
    `,
    params.concat([limit, offset])
  );

  const total = Number(countRow.total);

  return {
    orders: orders.map(normalizeOrder),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

async function getOrderDetail(orderCode) {
  const [orders] = await pool.execute(
    `
      SELECT
        id,
        order_code,
        user_id,
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
      WHERE order_code = ?
      LIMIT 1
    `,
    [orderCode]
  );

  if (orders.length === 0) {
    throw createError("Không tìm thấy đơn hàng.", 404);
  }

  const order = normalizeOrder({
    ...orders[0],
    item_count: 0,
    serialized_item_count: 0,
    assigned_serial_count: 0
  });

  const [itemRows] = await pool.execute(
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
        p.requires_serial,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = oi.product_id
          ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) AS product_image,
        sn.serial_code,
        sn.status AS serial_status
      FROM order_items oi
      INNER JOIN products p ON p.id = oi.product_id
      LEFT JOIN serial_numbers sn ON sn.id = oi.serial_number_id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `,
    [order.id]
  );

  const items = itemRows.map(normalizeItem);
  const productIdsNeedingSerials = Array.from(new Set(
    items
      .filter(function (item) {
        return item.requires_serial && !item.serial_number_id;
      })
      .map(function (item) {
        return item.product_id;
      })
  ));
  const serialMap = {};

  if (productIdsNeedingSerials.length > 0) {
    const placeholders = productIdsNeedingSerials.map(function () {
      return "?";
    }).join(", ");
    const [serials] = await pool.execute(
      `
        SELECT id, product_id, serial_code, import_date, note
        FROM serial_numbers
        WHERE product_id IN (${placeholders}) AND status = 'in_stock'
        ORDER BY product_id ASC, import_date ASC, id ASC
      `,
      productIdsNeedingSerials
    );

    serials.forEach(function (serial) {
      if (!serialMap[serial.product_id]) {
        serialMap[serial.product_id] = [];
      }

      serialMap[serial.product_id].push(serial);
    });
  }

  items.forEach(function (item) {
    if (item.requires_serial && !item.serial_number_id) {
      item.available_serials = serialMap[item.product_id] || [];
    }
  });

  return {
    order,
    items,
    workflow: getWorkflowInfo(order, items)
  };
}

async function countMissingSerials(connection, orderId) {
  const [[row]] = await connection.execute(
    `
      SELECT COUNT(*) AS total
      FROM order_items oi
      INNER JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
        AND p.requires_serial = 1
        AND oi.serial_number_id IS NULL
    `,
    [orderId]
  );

  return Number(row.total);
}

async function releaseAssignedSerials(connection, orderId) {
  await connection.execute(
    `
      UPDATE serial_numbers sn
      INNER JOIN order_items oi ON oi.serial_number_id = sn.id
      SET sn.status = 'in_stock',
          sn.sold_date = NULL
      WHERE oi.order_id = ?
    `,
    [orderId]
  );

  await connection.execute(
    `
      UPDATE order_items
      SET serial_number_id = NULL
      WHERE order_id = ? AND serial_number_id IS NOT NULL
    `,
    [orderId]
  );
}

async function decrementNonSerializedStockOnCompletion(connection, orderId) {
  const [items] = await connection.execute(
    `
      SELECT
        p.id AS product_id,
        p.name,
        p.stock_quantity,
        oi.quantity
      FROM order_items oi
      INNER JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
        AND p.requires_serial = 0
      FOR UPDATE
    `,
    [orderId]
  );

  const quantityByProduct = new Map();

  items.forEach(function (item) {
    const productId = Number(item.product_id);
    const current = quantityByProduct.get(productId) || {
      product_id: productId,
      name: item.name,
      stock_quantity: Number(item.stock_quantity || 0),
      quantity: 0
    };

    current.quantity += Number(item.quantity || 0);
    quantityByProduct.set(productId, current);
  });

  for (const item of quantityByProduct.values()) {
    if (item.stock_quantity < item.quantity) {
      throw createError(`Sản phẩm ${item.name} không đủ tồn kho để hoàn tất đơn hàng. Hiện còn ${item.stock_quantity}, cần ${item.quantity}.`, 400);
    }

    const [result] = await connection.execute(
      `
        UPDATE products
        SET stock_quantity = stock_quantity - ?
        WHERE id = ? AND stock_quantity >= ?
      `,
      [item.quantity, item.product_id, item.quantity]
    );

    if (result.affectedRows === 0) {
      throw createError(`Không thể trừ tồn kho cho sản phẩm ${item.name}. Vui lòng kiểm tra lại tồn kho.`, 400);
    }
  }
}

async function updateOrderStatus(orderCode, nextStatus) {
  if (!ORDER_STATUSES.includes(nextStatus)) {
    throw createError("Trạng thái đơn hàng không hợp lệ.", 400);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orders] = await connection.execute(
      `
        SELECT id, status
        FROM orders
        WHERE order_code = ?
        LIMIT 1
        FOR UPDATE
      `,
      [orderCode]
    );

    if (orders.length === 0) {
      throw createError("Không tìm thấy đơn hàng.", 404);
    }

    const order = orders[0];

    if (FINAL_STATUSES.includes(order.status)) {
      throw createError("Đơn hàng đã hoàn tất hoặc đã hủy nên không thể cập nhật.", 400);
    }

    if (!ALLOWED_TRANSITIONS[order.status] || !ALLOWED_TRANSITIONS[order.status].includes(nextStatus)) {
      throw createError("Không thể chuyển trạng thái đơn hàng theo luồng này.", 400);
    }

    if (nextStatus === "shipping" || nextStatus === "completed") {
      const missingSerialCount = await countMissingSerials(connection, order.id);

      if (missingSerialCount > 0) {
        throw createError("Không thể chuyển sang giao hàng vì đơn còn sản phẩm chưa gán Serial.", 400);
      }
    }

    if (nextStatus === "cancelled") {
      await releaseAssignedSerials(connection, order.id);
    }

    if (nextStatus === "completed") {
      await decrementNonSerializedStockOnCompletion(connection, order.id);
    }

    await connection.execute(
      `
        UPDATE orders
        SET status = ?
        WHERE id = ?
      `,
      [nextStatus, order.id]
    );

    await connection.commit();

    return {
      message: "Cập nhật trạng thái đơn hàng thành công.",
      status: nextStatus
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function assignSerial(orderCode, itemId, serialNumberId) {
  const parsedItemId = Number(itemId);
  const parsedSerialId = Number(serialNumberId);

  if (!Number.isInteger(parsedItemId) || parsedItemId < 1 || !Number.isInteger(parsedSerialId) || parsedSerialId < 1) {
    throw createError("Vui lòng chọn sản phẩm và Serial hợp lệ.", 400);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orders] = await connection.execute(
      `
        SELECT id, status
        FROM orders
        WHERE order_code = ?
        LIMIT 1
        FOR UPDATE
      `,
      [orderCode]
    );

    if (orders.length === 0) {
      throw createError("Không tìm thấy đơn hàng.", 404);
    }

    const order = orders[0];

    if (!["approved", "shipping"].includes(order.status)) {
      throw createError("Chỉ có thể gán Serial cho đơn hàng đã duyệt hoặc đang giao.", 400);
    }

    const [items] = await connection.execute(
      `
        SELECT
          oi.id,
          oi.product_id,
          oi.serial_number_id,
          oi.quantity,
          p.requires_serial
        FROM order_items oi
        INNER JOIN products p ON p.id = oi.product_id
        WHERE oi.id = ? AND oi.order_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [parsedItemId, order.id]
    );

    if (items.length === 0) {
      throw createError("Không tìm thấy sản phẩm trong đơn hàng.", 404);
    }

    const item = items[0];

    if (!item.requires_serial) {
      throw createError("Sản phẩm này không yêu cầu Serial.", 400);
    }

    if (Number(item.quantity) !== 1) {
      throw createError("Sản phẩm quản lý theo Serial phải có số lượng bằng 1 trên mỗi dòng.", 400);
    }

    if (item.serial_number_id) {
      throw createError("Sản phẩm này đã được gán Serial.", 400);
    }

    const [serials] = await connection.execute(
      `
        SELECT id, product_id, status
        FROM serial_numbers
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [parsedSerialId]
    );

    if (serials.length === 0) {
      throw createError("Không tìm thấy Serial.", 404);
    }

    const serial = serials[0];

    if (Number(serial.product_id) !== Number(item.product_id)) {
      throw createError("Serial không thuộc cùng sản phẩm trong đơn hàng.", 400);
    }

    if (serial.status !== "in_stock") {
      throw createError("Serial đã được sử dụng hoặc không còn trong kho.", 400);
    }

    await connection.execute(
      `
        UPDATE order_items
        SET serial_number_id = ?
        WHERE id = ?
      `,
      [parsedSerialId, parsedItemId]
    );

    await connection.execute(
      `
        UPDATE serial_numbers
        SET status = 'sold',
            sold_date = CURRENT_DATE
        WHERE id = ?
      `,
      [parsedSerialId]
    );

    await connection.commit();

    return {
      message: "Gán Serial cho sản phẩm thành công."
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function unassignSerial(orderCode, itemId) {
  const parsedItemId = Number(itemId);

  if (!Number.isInteger(parsedItemId) || parsedItemId < 1) {
    throw createError("Sản phẩm trong đơn hàng không hợp lệ.", 400);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [orders] = await connection.execute(
      `
        SELECT id, status
        FROM orders
        WHERE order_code = ?
        LIMIT 1
        FOR UPDATE
      `,
      [orderCode]
    );

    if (orders.length === 0) {
      throw createError("Không tìm thấy đơn hàng.", 404);
    }

    const order = orders[0];

    if (order.status !== "approved") {
      throw createError("Chỉ có thể gỡ Serial khi đơn hàng đang ở trạng thái đã duyệt.", 400);
    }

    const [items] = await connection.execute(
      `
        SELECT id, serial_number_id
        FROM order_items
        WHERE id = ? AND order_id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [parsedItemId, order.id]
    );

    if (items.length === 0) {
      throw createError("Không tìm thấy sản phẩm trong đơn hàng.", 404);
    }

    const item = items[0];

    if (!item.serial_number_id) {
      throw createError("Sản phẩm này chưa được gán Serial.", 400);
    }

    await connection.execute(
      `
        UPDATE serial_numbers
        SET status = 'in_stock',
            sold_date = NULL
        WHERE id = ?
      `,
      [item.serial_number_id]
    );

    await connection.execute(
      `
        UPDATE order_items
        SET serial_number_id = NULL
        WHERE id = ?
      `,
      [parsedItemId]
    );

    await connection.commit();

    return {
      message: "Gỡ Serial khỏi sản phẩm thành công."
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  assignSerial,
  unassignSerial
};
