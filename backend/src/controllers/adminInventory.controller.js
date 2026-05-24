const pool = require("../config/database");

const SERIAL_STATUSES = ["in_stock", "sold", "warranty", "returned"];

function normalizePagination(query) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);

  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
}

async function getInventorySummary(req, res) {
  const [rows] = await pool.execute(
    `
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.sku,
        p.product_type,
        p.requires_serial,
        p.stock_quantity AS normal_stock_quantity,
        COALESCE(SUM(CASE WHEN sn.status = 'in_stock' THEN 1 ELSE 0 END), 0) AS serial_in_stock,
        COALESCE(SUM(CASE WHEN sn.status = 'sold' THEN 1 ELSE 0 END), 0) AS serial_sold,
        COALESCE(SUM(CASE WHEN sn.status = 'warranty' THEN 1 ELSE 0 END), 0) AS serial_warranty,
        COALESCE(SUM(CASE WHEN sn.status = 'returned' THEN 1 ELSE 0 END), 0) AS serial_returned
      FROM products p
      LEFT JOIN serial_numbers sn ON sn.product_id = p.id
      GROUP BY p.id
      ORDER BY p.name ASC
    `
  );

  const data = rows.map(function (row) {
    const requiresSerial = Boolean(row.requires_serial);
    const availableStock = requiresSerial ? Number(row.serial_in_stock) : Number(row.normal_stock_quantity);

    return {
      product_id: row.product_id,
      product_name: row.product_name,
      sku: row.sku,
      product_type: row.product_type,
      requires_serial: requiresSerial,
      normal_stock_quantity: Number(row.normal_stock_quantity),
      serial_in_stock: Number(row.serial_in_stock),
      serial_sold: Number(row.serial_sold),
      serial_warranty: Number(row.serial_warranty),
      serial_returned: Number(row.serial_returned),
      available_stock: availableStock,
      low_stock_warning: availableStock < 3
    };
  });

  res.json({
    success: true,
    data
  });
}

async function getSerials(req, res) {
  const where = ["1 = 1"];
  const params = [];

  if (req.query.productId) {
    where.push("sn.product_id = ?");
    params.push(Number(req.query.productId));
  }

  if (req.query.status && SERIAL_STATUSES.includes(req.query.status)) {
    where.push("sn.status = ?");
    params.push(req.query.status);
  }

  if (req.query.keyword) {
    const keyword = `%${req.query.keyword.trim()}%`;
    where.push("(sn.serial_code LIKE ? OR p.name LIKE ? OR p.sku LIKE ?)");
    params.push(keyword, keyword, keyword);
  }

  const { page, limit, offset } = normalizePagination(req.query);
  const [[countRow]] = await pool.execute(
    `
      SELECT COUNT(*) AS total
      FROM serial_numbers sn
      INNER JOIN products p ON p.id = sn.product_id
      WHERE ${where.join(" AND ")}
    `,
    params
  );
  const [serials] = await pool.execute(
    `
      SELECT
        sn.id,
        sn.serial_code,
        sn.status,
        sn.import_date,
        sn.sold_date,
        sn.note,
        p.id AS product_id,
        p.name AS product_name,
        p.sku AS product_sku
      FROM serial_numbers sn
      INNER JOIN products p ON p.id = sn.product_id
      WHERE ${where.join(" AND ")}
      ORDER BY sn.created_at DESC, sn.id DESC
      LIMIT ? OFFSET ?
    `,
    params.concat([limit, offset])
  );
  const total = Number(countRow.total);

  res.json({
    success: true,
    data: serials,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  });
}

async function createSerial(req, res) {
  const productId = Number(req.body.product_id);
  const serialCode = (req.body.serial_code || "").trim();
  const importDate = req.body.import_date || new Date().toISOString().slice(0, 10);
  const note = req.body.note ? req.body.note.trim() : null;

  if (!Number.isInteger(productId) || productId < 1 || !serialCode) {
    res.status(400).json({
      success: false,
      message: "Vui lòng nhập sản phẩm và mã Serial."
    });
    return;
  }

  const [products] = await pool.execute(
    "SELECT id, requires_serial FROM products WHERE id = ? LIMIT 1",
    [productId]
  );

  if (products.length === 0) {
    res.status(400).json({
      success: false,
      message: "Sản phẩm không tồn tại."
    });
    return;
  }

  if (!products[0].requires_serial) {
    res.status(400).json({
      success: false,
      message: "Không thể thêm Serial cho sản phẩm không quản lý theo Serial."
    });
    return;
  }

  try {
    const [result] = await pool.execute(
      `
        INSERT INTO serial_numbers (product_id, serial_code, status, import_date, note)
        VALUES (?, ?, 'in_stock', ?, ?)
      `,
      [productId, serialCode, importDate, note]
    );

    res.status(201).json({
      success: true,
      message: "Thêm Serial thành công.",
      data: {
        id: result.insertId,
        product_id: productId,
        serial_code: serialCode,
        status: "in_stock",
        import_date: importDate,
        note
      }
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res.status(409).json({
        success: false,
        message: "Mã Serial đã tồn tại."
      });
      return;
    }

    throw error;
  }
}

async function updateSerialStatus(req, res) {
  const status = req.body.status;
  const note = req.body.note ? req.body.note.trim() : null;

  if (!SERIAL_STATUSES.includes(status)) {
    res.status(400).json({
      success: false,
      message: "Trạng thái Serial không hợp lệ."
    });
    return;
  }

  const [result] = await pool.execute(
    `
      UPDATE serial_numbers
      SET status = ?, note = COALESCE(?, note)
      WHERE id = ?
    `,
    [status, note, Number(req.params.id)]
  );

  if (result.affectedRows === 0) {
    res.status(404).json({
      success: false,
      message: "Không tìm thấy Serial."
    });
    return;
  }

  res.json({
    success: true,
    message: "Cập nhật trạng thái Serial thành công. Lưu ý: trạng thái sold/warranty trong quy trình thật sẽ do order/warranty workflow xử lý."
  });
}

module.exports = {
  getInventorySummary,
  getSerials,
  createSerial,
  updateSerialStatus
};
