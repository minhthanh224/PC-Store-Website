const pool = require("../config/database");
const { getAvailableStockExpression } = require("../services/stock.service");

async function getOrderStatusCounts() {
  const [rows] = await pool.execute(
    `
      SELECT status, COUNT(*) AS total
      FROM orders
      GROUP BY status
    `
  );
  const counts = {
    pending_orders: 0,
    approved_orders: 0,
    shipping_orders: 0,
    completed_orders: 0
  };

  rows.forEach(function (row) {
    if (row.status === "pending") counts.pending_orders = Number(row.total);
    if (row.status === "approved") counts.approved_orders = Number(row.total);
    if (row.status === "shipping") counts.shipping_orders = Number(row.total);
    if (row.status === "completed") counts.completed_orders = Number(row.total);
  });

  return counts;
}

async function getRecentOrders() {
  const [rows] = await pool.execute(
    `
      SELECT order_code, customer_name, customer_phone, status, total_amount, created_at
      FROM orders
      ORDER BY created_at DESC, id DESC
      LIMIT 6
    `
  );

  return rows.map(function (order) {
    return {
      ...order,
      total_amount: Number(order.total_amount)
    };
  });
}

async function getRecentWarrantyTickets() {
  const [rows] = await pool.execute(
    `
      SELECT
        wt.ticket_code,
        wt.status,
        wt.customer_name,
        wt.customer_phone,
        wt.received_date,
        sn.serial_code,
        p.name AS product_name
      FROM warranty_tickets wt
      INNER JOIN serial_numbers sn ON sn.id = wt.serial_number_id
      INNER JOIN products p ON p.id = sn.product_id
      ORDER BY wt.created_at DESC, wt.id DESC
      LIMIT 6
    `
  );

  return rows;
}

async function getLowStockItems() {
  const [rows] = await pool.execute(
    `
      SELECT product_id, product_name, sku, available_stock
      FROM (
        SELECT
          p.id AS product_id,
          p.name AS product_name,
          p.sku,
          ${getAvailableStockExpression("p")} AS available_stock
        FROM products p
      ) stock_table
      WHERE available_stock < 3
      ORDER BY available_stock ASC, product_name ASC
      LIMIT 8
    `
  );

  return rows.map(function (row) {
    return {
      ...row,
      available_stock: Number(row.available_stock)
    };
  });
}

async function getDashboardSummary(req, res) {
  const role = req.user.role;
  const [
    [[totalProducts]],
    [[activeProducts]],
    [[serialsInStock]],
    [[lowStockProducts]],
    [[activeWarrantyTickets]],
    [[todayOrders]],
    [[monthRevenue]],
    [[approvedWaitingSerial]],
    orderCounts
  ] = await Promise.all([
    pool.execute("SELECT COUNT(*) AS total FROM products"),
    pool.execute("SELECT COUNT(*) AS total FROM products WHERE status = 'active'"),
    pool.execute("SELECT COUNT(*) AS total FROM serial_numbers WHERE status = 'in_stock'"),
    pool.execute(
      `
        SELECT COUNT(*) AS total
        FROM (
          SELECT p.id, ${getAvailableStockExpression("p")} AS available_stock
          FROM products p
        ) stock_table
        WHERE available_stock < 3
      `
    ),
    pool.execute("SELECT COUNT(*) AS total FROM warranty_tickets WHERE status IN ('received', 'repairing', 'waiting_parts', 'done')"),
    pool.execute("SELECT COUNT(*) AS total FROM orders WHERE DATE(created_at) = CURRENT_DATE"),
    pool.execute(
      `
        SELECT COALESCE(SUM(total_amount), 0) AS total
        FROM orders
        WHERE status = 'completed'
          AND created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
      `
    ),
    pool.execute(
      `
        SELECT COUNT(DISTINCT o.id) AS total
        FROM orders o
        INNER JOIN order_items oi ON oi.order_id = o.id
        INNER JOIN products p ON p.id = oi.product_id
        WHERE o.status = 'approved'
          AND p.requires_serial = 1
          AND oi.serial_number_id IS NULL
      `
    ),
    getOrderStatusCounts()
  ]);

  const baseData = {
    total_products: Number(totalProducts.total),
    active_products: Number(activeProducts.total),
    serials_in_stock: Number(serialsInStock.total),
    low_stock_products: Number(lowStockProducts.total),
    active_warranty_tickets: Number(activeWarrantyTickets.total),
    today_orders: Number(todayOrders.total),
    month_revenue: Number(monthRevenue.total),
    approved_orders_waiting_serial: Number(approvedWaitingSerial.total),
    ...orderCounts
  };

  let responseData = baseData;

  if (role === "sales") {
    baseData.recent_orders = await getRecentOrders();
    responseData = {
      pending_orders: baseData.pending_orders,
      approved_orders: baseData.approved_orders,
      shipping_orders: baseData.shipping_orders,
      completed_orders: baseData.completed_orders,
      today_orders: baseData.today_orders,
      month_revenue: baseData.month_revenue,
      recent_orders: baseData.recent_orders
    };
  }

  if (role === "technician") {
    const [recentWarrantyTickets, lowStockItems] = await Promise.all([
      getRecentWarrantyTickets(),
      getLowStockItems()
    ]);
    baseData.recent_warranty_tickets = recentWarrantyTickets;
    baseData.low_stock_items = lowStockItems;
    responseData = {
      approved_orders_waiting_serial: baseData.approved_orders_waiting_serial,
      active_warranty_tickets: baseData.active_warranty_tickets,
      low_stock_products: baseData.low_stock_products,
      serials_in_stock: baseData.serials_in_stock,
      recent_warranty_tickets: baseData.recent_warranty_tickets,
      low_stock_items: baseData.low_stock_items
    };
  }

  if (role === "admin") {
    const [recentOrders, recentWarrantyTickets, lowStockItems] = await Promise.all([
      getRecentOrders(),
      getRecentWarrantyTickets(),
      getLowStockItems()
    ]);
    baseData.recent_orders = recentOrders;
    baseData.recent_warranty_tickets = recentWarrantyTickets;
    baseData.low_stock_items = lowStockItems;
    responseData = baseData;
  }

  res.json({
    success: true,
    data: {
      ...responseData,
      // Backward-compatible camelCase fields for older admin dashboard scripts.
      totalProducts: responseData.total_products,
      activeProducts: responseData.active_products,
      serialsInStock: responseData.serials_in_stock,
      lowStockProducts: responseData.low_stock_products,
      pendingOrders: responseData.pending_orders,
      activeWarrantyTickets: responseData.active_warranty_tickets
    }
  });
}

module.exports = {
  getDashboardSummary
};
