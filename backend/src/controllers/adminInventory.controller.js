const multer = require("multer");
const { parse } = require("csv-parse/sync");
const pool = require("../config/database");
const { logAuditEvent } = require("../services/adminAudit.service");
const {
  getAvailableStockExpression,
  getReservedStockExpression,
  getTotalStockExpression
} = require("../services/stock.service");

const SERIAL_STATUSES = ["in_stock", "sold", "warranty", "returned"];
const SERIAL_IMPORT_REQUIRED_COLUMNS = ["product_sku", "serial_code"];
const SERIAL_IMPORT_ALLOWED_EXTENSIONS = [".csv"];

const serialImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024
  },
  fileFilter(req, file, cb) {
    const lowerName = String(file.originalname || "").toLowerCase();
    const isCsv = SERIAL_IMPORT_ALLOWED_EXTENSIONS.some(function (ext) {
      return lowerName.endsWith(ext);
    }) || file.mimetype === "text/csv" || file.mimetype === "application/vnd.ms-excel";

    if (!isCsv) {
      const error = new Error("Vui lòng upload file .csv.");
      error.statusCode = 400;
      cb(error);
      return;
    }

    cb(null, true);
  }
});

function normalizePagination(query) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);

  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
}

function normalizeHeaderKey(value) {
  return String(value || "").trim().replace(/^\uFEFF/, "").toLowerCase();
}

function normalizeBooleanLike(value) {
  const text = String(value || "").trim().toLowerCase();

  return ["1", "true", "yes", "y", "có", "co"].includes(text);
}

function escapeCsvValue(value) {
  const text = value === null || value === undefined ? "" : String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function parseSerialCsv(buffer) {
  let records;

  try {
    records = parse(buffer, {
      bom: true,
      columns(header) {
        return header.map(normalizeHeaderKey);
      },
      skip_empty_lines: true,
      trim: true
    });
  } catch (error) {
    const validationError = new Error(`Không đọc được file CSV: ${error.message}`);
    validationError.statusCode = 400;
    throw validationError;
  }

  return records.map(function (record, index) {
    return {
      line: index + 2,
      raw: record
    };
  });
}

function getCsvValue(record, keys) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && String(record[key]).trim() !== "") {
      return String(record[key]).trim();
    }
  }

  return "";
}

function validateSerialImportFile(req) {
  if (!req.file || !req.file.buffer) {
    const error = new Error("Vui lòng upload file CSV để import Serial.");
    error.statusCode = 400;
    throw error;
  }

  return parseSerialCsv(req.file.buffer);
}

async function getProductsBySkuMap(skus) {
  if (!skus.length) {
    return new Map();
  }

  const placeholders = skus.map(function () { return "?"; }).join(",");
  const [products] = await pool.execute(
    `
      SELECT id, name, sku, requires_serial, status
      FROM products
      WHERE sku IN (${placeholders})
    `,
    skus
  );

  return new Map(products.map(function (product) {
    return [product.sku, product];
  }));
}

async function getExistingSerialSet(serialCodes) {
  if (!serialCodes.length) {
    return new Set();
  }

  const placeholders = serialCodes.map(function () { return "?"; }).join(",");
  const [rows] = await pool.execute(
    `SELECT serial_code FROM serial_numbers WHERE serial_code IN (${placeholders})`,
    serialCodes
  );

  return new Set(rows.map(function (row) { return row.serial_code; }));
}

function isIsoDateLike(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function buildSerialImportPreview(req) {
  const rows = validateSerialImportFile(req);
  const errors = [];
  const warnings = [];
  const normalizedRows = [];
  const fileSerials = new Map();

  if (!rows.length) {
    errors.push({
      file: req.file.originalname,
      line: 1,
      field: "file",
      message: "File CSV không có dữ liệu Serial."
    });
  }

  const firstRaw = rows[0] ? rows[0].raw : {};
  const headerKeys = Object.keys(firstRaw);
  SERIAL_IMPORT_REQUIRED_COLUMNS.forEach(function (requiredColumn) {
    if (!headerKeys.includes(requiredColumn)) {
      errors.push({
        file: req.file.originalname,
        line: 1,
        field: requiredColumn,
        message: `Thiếu cột bắt buộc ${requiredColumn}.`
      });
    }
  });

  const today = new Date().toISOString().slice(0, 10);

  rows.forEach(function (row) {
    const raw = row.raw;
    const productSku = getCsvValue(raw, ["product_sku", "sku"]);
    const serialCode = getCsvValue(raw, ["serial_code", "serial"]);
    const importDate = getCsvValue(raw, ["import_date", "date"]) || today;
    const note = getCsvValue(raw, ["note", "ghi_chu"]);
    const status = getCsvValue(raw, ["status", "trang_thai"]) || "in_stock";
    const allowDuplicateText = getCsvValue(raw, ["allow_duplicate"]);

    if (!productSku) {
      errors.push({
        file: req.file.originalname,
        line: row.line,
        field: "product_sku",
        message: "Thiếu SKU sản phẩm."
      });
    }

    if (!serialCode) {
      errors.push({
        file: req.file.originalname,
        line: row.line,
        field: "serial_code",
        message: "Thiếu mã Serial."
      });
    }

    if (serialCode && /[\n\r\t]/.test(serialCode)) {
      errors.push({
        file: req.file.originalname,
        line: row.line,
        field: "serial_code",
        message: "Mã Serial không được chứa ký tự xuống dòng hoặc tab."
      });
    }

    if (importDate && !isIsoDateLike(importDate)) {
      errors.push({
        file: req.file.originalname,
        line: row.line,
        field: "import_date",
        message: "Ngày nhập phải có định dạng YYYY-MM-DD."
      });
    }

    if (status !== "in_stock") {
      errors.push({
        file: req.file.originalname,
        line: row.line,
        field: "status",
        message: "Import Serial chỉ hỗ trợ trạng thái in_stock. Các trạng thái sold/warranty/returned phải đi qua workflow đơn hàng hoặc bảo hành."
      });
    }

    if (serialCode) {
      if (fileSerials.has(serialCode)) {
        errors.push({
          file: req.file.originalname,
          line: row.line,
          field: "serial_code",
          message: `Mã Serial bị trùng trong file. Đã xuất hiện ở dòng ${fileSerials.get(serialCode)}.`
        });
      } else {
        fileSerials.set(serialCode, row.line);
      }
    }

    normalizedRows.push({
      line: row.line,
      product_sku: productSku,
      serial_code: serialCode,
      import_date: importDate,
      note,
      status,
      allow_duplicate: normalizeBooleanLike(allowDuplicateText)
    });
  });

  const uniqueSkus = Array.from(new Set(normalizedRows.map(function (row) { return row.product_sku; }).filter(Boolean)));
  const uniqueSerials = Array.from(new Set(normalizedRows.map(function (row) { return row.serial_code; }).filter(Boolean)));
  const [productMap, existingSerials] = await Promise.all([
    getProductsBySkuMap(uniqueSkus),
    getExistingSerialSet(uniqueSerials)
  ]);

  normalizedRows.forEach(function (row) {
    const product = productMap.get(row.product_sku);

    if (row.product_sku && !product) {
      errors.push({
        file: req.file.originalname,
        line: row.line,
        field: "product_sku",
        message: `Không tìm thấy sản phẩm có SKU ${row.product_sku}.`
      });
    } else if (product && !product.requires_serial) {
      errors.push({
        file: req.file.originalname,
        line: row.line,
        field: "product_sku",
        message: `Sản phẩm ${product.sku} không quản lý theo Serial.`
      });
    } else if (product && product.status !== "active") {
      warnings.push({
        file: req.file.originalname,
        line: row.line,
        field: "product_sku",
        message: `Sản phẩm ${product.sku} hiện không ở trạng thái active.`
      });
    }

    if (row.serial_code && existingSerials.has(row.serial_code)) {
      errors.push({
        file: req.file.originalname,
        line: row.line,
        field: "serial_code",
        message: `Mã Serial ${row.serial_code} đã tồn tại trong hệ thống.`
      });
    }

    row.product_id = product ? product.id : null;
    row.product_name = product ? product.name : null;
  });

  const validRows = normalizedRows.filter(function (row) {
    return row.product_id && row.serial_code && !existingSerials.has(row.serial_code) && row.status === "in_stock";
  });

  return {
    success: errors.length === 0,
    totalRows: normalizedRows.length,
    createCount: errors.length === 0 ? validRows.length : 0,
    errors,
    warnings,
    rows: normalizedRows,
    canCommit: errors.length === 0 && validRows.length > 0
  };
}

function renderSerialImportPreview(preview) {
  return {
    totalRows: preview.totalRows,
    createCount: preview.createCount,
    errorCount: preview.errors.length,
    warningCount: preview.warnings.length,
    errors: preview.errors,
    warnings: preview.warnings,
    canCommit: preview.canCommit
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
        ${getTotalStockExpression("p")} AS total_stock_quantity,
        ${getReservedStockExpression("p")} AS reserved_quantity,
        ${getAvailableStockExpression("p")} AS available_stock,
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
    const availableStock = Number(row.available_stock || 0);

    return {
      product_id: row.product_id,
      product_name: row.product_name,
      sku: row.sku,
      product_type: row.product_type,
      requires_serial: requiresSerial,
      normal_stock_quantity: Number(row.normal_stock_quantity),
      total_stock_quantity: Number(row.total_stock_quantity || 0),
      reserved_quantity: Number(row.reserved_quantity || 0),
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

async function getInventoryProducts(req, res) {
  const [products] = await pool.execute(
    `
      SELECT
        p.id,
        p.name,
        p.sku,
        p.product_type,
        p.requires_serial,
        p.status,
        b.name AS brand_name,
        c.name AS category_name
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.requires_serial = 1
      ORDER BY p.name ASC, p.id ASC
    `
  );

  res.json({
    success: true,
    data: products.map(function (product) {
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        product_type: product.product_type,
        requires_serial: Boolean(product.requires_serial),
        status: product.status,
        brand_name: product.brand_name,
        category_name: product.category_name
      };
    })
  });
}

function buildSerialsWhere(query) {
  const where = ["1 = 1"];
  const params = [];

  if (query.productId) {
    where.push("sn.product_id = ?");
    params.push(Number(query.productId));
  }

  if (query.status && SERIAL_STATUSES.includes(query.status)) {
    where.push("sn.status = ?");
    params.push(query.status);
  }

  if (query.keyword) {
    const keyword = `%${query.keyword.trim()}%`;
    where.push("(sn.serial_code LIKE ? OR p.name LIKE ? OR p.sku LIKE ?)");
    params.push(keyword, keyword, keyword);
  }

  return { where, params };
}

async function getSerials(req, res) {
  const { where, params } = buildSerialsWhere(req.query);
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

async function exportSerials(req, res) {
  const { where, params } = buildSerialsWhere(req.query);
  const [serials] = await pool.execute(
    `
      SELECT
        p.sku AS product_sku,
        p.name AS product_name,
        sn.serial_code,
        sn.status,
        sn.import_date,
        sn.sold_date,
        sn.note
      FROM serial_numbers sn
      INNER JOIN products p ON p.id = sn.product_id
      WHERE ${where.join(" AND ")}
      ORDER BY p.sku ASC, sn.serial_code ASC
    `,
    params
  );

  const headers = ["product_sku", "product_name", "serial_code", "status", "import_date", "sold_date", "note"];
  const csv = [headers.join(",")].concat(serials.map(function (serial) {
    return [
      serial.product_sku,
      serial.product_name,
      serial.serial_code,
      serial.status,
      serial.import_date ? String(serial.import_date).slice(0, 10) : "",
      serial.sold_date ? String(serial.sold_date).slice(0, 10) : "",
      serial.note || ""
    ].map(escapeCsvValue).join(",");
  })).join("\n");

  await logAuditEvent(req, {
    action_type: "export_serials",
    entity_type: "serial",
    message: `Xuất CSV ${serials.length} Serial.`,
    metadata: { filters: req.query, count: serials.length }
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="aerotech-serials-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(`\uFEFF${csv}`);
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

    await logAuditEvent(req, {
      action_type: "create_serial",
      entity_type: "serial",
      entity_id: result.insertId,
      entity_label: serialCode,
      message: `Thêm Serial ${serialCode}.`,
      metadata: { product_id: productId, import_date: importDate }
    });

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

async function previewSerialImport(req, res) {
  const preview = await buildSerialImportPreview(req);

  res.status(preview.errors.length ? 400 : 200).json({
    success: preview.errors.length === 0,
    message: preview.errors.length ? "File import Serial còn lỗi cần xử lý." : "Kiểm tra file Serial thành công.",
    data: renderSerialImportPreview(preview)
  });
}

async function commitSerialImport(req, res) {
  const preview = await buildSerialImportPreview(req);

  if (!preview.canCommit) {
    res.status(400).json({
      success: false,
      message: "Không thể import vì file còn lỗi hoặc không có Serial hợp lệ.",
      data: renderSerialImportPreview(preview)
    });
    return;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const row of preview.rows) {
      if (!row.product_id || !row.serial_code || row.status !== "in_stock") {
        continue;
      }

      await connection.execute(
        `
          INSERT INTO serial_numbers (product_id, serial_code, status, import_date, note)
          VALUES (?, ?, 'in_stock', ?, ?)
        `,
        [row.product_id, row.serial_code, row.import_date, row.note || null]
      );
    }

    await connection.commit();

    await logAuditEvent(req, {
      action_type: "import_serials",
      entity_type: "serial",
      message: `Import ${preview.createCount} Serial.`,
      metadata: { created: preview.createCount, warnings: preview.warnings.length }
    });

    res.status(201).json({
      success: true,
      message: `Import ${preview.createCount} Serial thành công.`,
      data: {
        created: preview.createCount,
        warnings: preview.warnings
      }
    });
  } catch (error) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      res.status(409).json({
        success: false,
        message: "Một hoặc nhiều mã Serial đã tồn tại. Vui lòng kiểm tra lại file và preview trước khi import."
      });
      return;
    }

    throw error;
  } finally {
    connection.release();
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

  await logAuditEvent(req, {
    action_type: "update_serial_status",
    entity_type: "serial",
    entity_id: req.params.id,
    message: `Cập nhật trạng thái Serial #${req.params.id} thành ${status}.`,
    metadata: { status, note }
  });

  res.json({
    success: true,
    message: "Cập nhật trạng thái Serial thành công. Lưu ý: trạng thái sold/warranty trong quy trình thật sẽ do order/warranty workflow xử lý."
  });
}

module.exports = {
  serialImportUpload,
  getInventorySummary,
  getInventoryProducts,
  getSerials,
  exportSerials,
  createSerial,
  previewSerialImport,
  commitSerialImport,
  updateSerialStatus
};
