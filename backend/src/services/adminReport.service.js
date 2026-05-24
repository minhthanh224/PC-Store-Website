const pool = require("../config/database");
const { getAvailableStockExpression } = require("./stock.service");

const WARRANTY_STATUS_LABELS = {
  received: "Đã tiếp nhận",
  repairing: "Đang sửa",
  waiting_parts: "Chờ linh kiện",
  done: "Hoàn tất sửa chữa",
  returned: "Đã trả khách",
  rejected: "Từ chối bảo hành"
};

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseDate(value, fieldName) {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createError(`${fieldName} không hợp lệ. Vui lòng dùng định dạng YYYY-MM-DD.`, 400);
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    throw createError(`${fieldName} không hợp lệ.`, 400);
  }

  return value;
}

function getDateFilter(query, tableAlias) {
  const from = parseDate(query.from, "Ngày bắt đầu");
  const to = parseDate(query.to, "Ngày kết thúc");
  const where = [];
  const params = [];
  const alias = tableAlias || "o";

  if (from && to && from > to) {
    throw createError("Ngày bắt đầu không được lớn hơn ngày kết thúc.", 400);
  }

  if (from) {
    where.push(`${alias}.created_at >= ?`);
    params.push(`${from} 00:00:00`);
  }

  if (to) {
    where.push(`${alias}.created_at <= ?`);
    params.push(`${to} 23:59:59`);
  }

  return {
    where,
    params,
    from,
    to
  };
}

async function getOverview(query) {
  const dateFilter = getDateFilter(query, "o");
  const orderDateSql = dateFilter.where.length ? `AND ${dateFilter.where.join(" AND ")}` : "";
  const orderParams = dateFilter.params;

  const [
    [[revenue]],
    [[pendingOrders]],
    [[productsSold]],
    [[lowStock]],
    [[activeWarranty]]
  ] = await Promise.all([
    pool.execute(
      `
        SELECT
          COALESCE(SUM(o.total_amount), 0) AS total_revenue,
          COUNT(*) AS completed_order_count
        FROM orders o
        WHERE o.status = 'completed'
        ${orderDateSql}
      `,
      orderParams
    ),
    pool.execute(
      `
        SELECT COUNT(*) AS pending_order_count
        FROM orders o
        WHERE o.status = 'pending'
        ${orderDateSql}
      `,
      orderParams
    ),
    pool.execute(
      `
        SELECT COALESCE(SUM(oi.quantity), 0) AS total_products_sold
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        WHERE o.status = 'completed'
        ${orderDateSql}
      `,
      orderParams
    ),
    pool.execute(
      `
        SELECT COUNT(*) AS low_stock_count
        FROM (
          SELECT p.id, ${getAvailableStockExpression("p")} AS available_stock
          FROM products p
        ) stock_table
        WHERE available_stock < 3
      `
    ),
    pool.execute(
      `
        SELECT COUNT(*) AS active_warranty_count
        FROM warranty_tickets
        WHERE status IN ('received', 'repairing', 'waiting_parts', 'done')
      `
    )
  ]);

  return {
    total_revenue: Number(revenue.total_revenue),
    completed_order_count: Number(revenue.completed_order_count),
    pending_order_count: Number(pendingOrders.pending_order_count),
    total_products_sold: Number(productsSold.total_products_sold),
    low_stock_count: Number(lowStock.low_stock_count),
    active_warranty_count: Number(activeWarranty.active_warranty_count)
  };
}

async function getRevenue(query) {
  const groupBy = query.groupBy === "month" ? "month" : "day";
  const labelExpression = groupBy === "month"
    ? "DATE_FORMAT(o.created_at, '%Y-%m')"
    : "DATE(o.created_at)";
  const dateFilter = getDateFilter(query, "o");
  const orderDateSql = dateFilter.where.length ? `AND ${dateFilter.where.join(" AND ")}` : "";

  const [rows] = await pool.execute(
    `
      SELECT
        ${labelExpression} AS label,
        COALESCE(SUM(o.total_amount), 0) AS revenue,
        COUNT(*) AS order_count
      FROM orders o
      WHERE o.status = 'completed'
      ${orderDateSql}
      GROUP BY label
      ORDER BY label ASC
    `,
    dateFilter.params
  );

  return rows.map(function (row) {
    return {
      label: String(row.label),
      revenue: Number(row.revenue),
      order_count: Number(row.order_count)
    };
  });
}

async function getBestSelling(query) {
  const dateFilter = getDateFilter(query, "o");
  const orderDateSql = dateFilter.where.length ? `AND ${dateFilter.where.join(" AND ")}` : "";

  const [rows] = await pool.execute(
    `
      SELECT
        p.id AS product_id,
        oi.product_name_snapshot AS product_name,
        oi.sku_snapshot AS sku,
        b.name AS brand_name,
        c.name AS category_name,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity,
        COALESCE(SUM(oi.total_price), 0) AS total_revenue,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) AS primary_image
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN products p ON p.id = oi.product_id
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE o.status = 'completed'
      ${orderDateSql}
      GROUP BY p.id, oi.product_name_snapshot, oi.sku_snapshot, b.name, c.name
      ORDER BY total_quantity DESC, total_revenue DESC
      LIMIT 10
    `,
    dateFilter.params
  );

  return rows.map(function (row) {
    return {
      ...row,
      total_quantity: Number(row.total_quantity),
      total_revenue: Number(row.total_revenue)
    };
  });
}

async function getInventoryReport() {
  const [rows] = await pool.execute(
    `
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.sku,
        p.product_type,
        p.requires_serial,
        b.name AS brand_name,
        c.name AS category_name,
        p.stock_quantity,
        COALESCE(SUM(CASE WHEN sn.status = 'in_stock' THEN 1 ELSE 0 END), 0) AS serial_in_stock,
        COALESCE(SUM(CASE WHEN sn.status = 'sold' THEN 1 ELSE 0 END), 0) AS serial_sold,
        COALESCE(SUM(CASE WHEN sn.status = 'warranty' THEN 1 ELSE 0 END), 0) AS serial_warranty,
        COALESCE(SUM(CASE WHEN sn.status = 'returned' THEN 1 ELSE 0 END), 0) AS serial_returned,
        ${getAvailableStockExpression("p")} AS available_stock
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN serial_numbers sn ON sn.product_id = p.id
      GROUP BY p.id, b.name, c.name
      ORDER BY available_stock ASC, p.name ASC
    `
  );

  return rows.map(function (row) {
    const availableStock = Number(row.available_stock);

    return {
      ...row,
      requires_serial: Boolean(row.requires_serial),
      stock_quantity: Number(row.stock_quantity),
      serial_in_stock: Number(row.serial_in_stock),
      serial_sold: Number(row.serial_sold),
      serial_warranty: Number(row.serial_warranty),
      serial_returned: Number(row.serial_returned),
      available_stock: availableStock,
      low_stock_warning: availableStock < 3
    };
  });
}

async function getWarrantyReport() {
  const [countRows] = await pool.execute(
    `
      SELECT status, COUNT(*) AS count
      FROM warranty_tickets
      GROUP BY status
      ORDER BY FIELD(status, 'received', 'repairing', 'waiting_parts', 'done', 'returned', 'rejected')
    `
  );
  const [latestTickets] = await pool.execute(
    `
      SELECT
        wt.ticket_code,
        wt.status,
        wt.customer_name,
        wt.customer_phone,
        wt.issue_description,
        wt.received_date,
        wt.completed_date,
        sn.serial_code,
        p.name AS product_name
      FROM warranty_tickets wt
      INNER JOIN serial_numbers sn ON sn.id = wt.serial_number_id
      INNER JOIN products p ON p.id = sn.product_id
      ORDER BY wt.created_at DESC, wt.id DESC
      LIMIT 10
    `
  );

  const counts = ["received", "repairing", "waiting_parts", "done", "returned", "rejected"].map(function (status) {
    const found = countRows.find(function (row) {
      return row.status === status;
    });

    return {
      status,
      status_label: WARRANTY_STATUS_LABELS[status],
      count: found ? Number(found.count) : 0
    };
  });

  return {
    counts,
    latest_tickets: latestTickets
  };
}

async function getOrderReport() {
  const [rows] = await pool.execute(
    `
      SELECT status, COUNT(*) AS count
      FROM orders
      GROUP BY status
    `
  );
  const result = {
    pending: 0,
    approved: 0,
    shipping: 0,
    completed: 0,
    cancelled: 0
  };

  rows.forEach(function (row) {
    result[row.status] = Number(row.count);
  });

  return result;
}

module.exports = {
  getOverview,
  getRevenue,
  getBestSelling,
  getInventoryReport,
  getWarrantyReport,
  getOrderReport
};
