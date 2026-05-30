const pool = require("../config/database");

const ACTIVE_TICKET_STATUSES = ["received", "repairing", "waiting_parts", "done"];

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function addMonths(dateValue, months) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setMonth(date.getMonth() + Number(months || 0));
  return date;
}

function toIsoDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function getWarrantyStartDate(row) {
  if (!row) {
    return null;
  }

  if (row.order_status === "completed" && row.order_updated_at) {
    return row.order_updated_at;
  }

  return row.sold_date || row.purchase_date || row.order_created_at || null;
}

function getWarrantyCoverage(row) {
  const warrantyMonthValue = row && row.warranty_months_snapshot !== null && row.warranty_months_snapshot !== undefined
    ? row.warranty_months_snapshot
    : row && row.warranty_months;
  const baseWarrantyMonths = Number(warrantyMonthValue || 0);
  const extendedWarrantyMonths = Number(row && row.warranty_package_duration_months || 0);
  const warrantyMonths = baseWarrantyMonths + extendedWarrantyMonths;
  const warrantyStartDate = getWarrantyStartDate(row);
  const warrantyEndDate = warrantyStartDate ? addMonths(warrantyStartDate, warrantyMonths) : null;

  return {
    warrantyMonths,
    baseWarrantyMonths,
    extendedWarrantyMonths,
    warrantyStartDate,
    warrantyStartDateIso: toIsoDate(warrantyStartDate),
    warrantyEndDate,
    warrantyEndDateIso: toIsoDate(warrantyEndDate),
    isExpired: !warrantyEndDate || toIsoDate(warrantyEndDate) < todayIso()
  };
}

function getWarrantyStatus(serialStatus, orderStatus, warrantyEndDate) {
  if (serialStatus === "warranty") {
    return {
      status: "in_warranty",
      label: "Đang xử lý bảo hành"
    };
  }

  if (serialStatus === "returned") {
    return {
      status: "inactive",
      label: "Không hợp lệ"
    };
  }

  if (orderStatus !== "completed") {
    return {
      status: "inactive",
      label: "Không hợp lệ"
    };
  }

  if (!warrantyEndDate || toIsoDate(warrantyEndDate) < todayIso()) {
    return {
      status: "expired",
      label: "Hết hạn"
    };
  }

  return {
    status: "valid",
    label: "Còn bảo hành"
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function lookupWarranty(serialCode) {
  const serial = serialCode ? String(serialCode).trim() : "";

  if (!serial) {
    throw createError("Vui lòng nhập Serial cần tra cứu.", 400);
  }

  const [rows] = await pool.execute(
    `
      SELECT
        sn.id AS serial_id,
        sn.serial_code,
        sn.status AS serial_status,
        sn.sold_date,
        p.name AS product_name,
        p.sku,
        b.name AS brand_name,
        c.name AS category_name,
        oi.id AS order_item_id,
        oi.warranty_months_snapshot,
        oi.warranty_package_title,
        oi.warranty_package_duration_months,
        p.warranty_months,
        o.order_code,
        o.status AS order_status,
        o.created_at AS purchase_date,
        o.updated_at AS order_updated_at
      FROM serial_numbers sn
      INNER JOIN products p ON p.id = sn.product_id
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN order_items oi ON oi.serial_number_id = sn.id
      LEFT JOIN orders o ON o.id = oi.order_id
      WHERE sn.serial_code = ?
      ORDER BY o.created_at DESC, oi.id DESC
      LIMIT 1
    `,
    [serial]
  );

  if (rows.length === 0) {
    throw createError("Không tìm thấy Serial trong hệ thống.", 404);
  }

  const row = rows[0];

  if (row.serial_status === "in_stock") {
    return {
      status: "not_activated",
      message: "Serial này có trong hệ thống nhưng chưa được kích hoạt bảo hành."
    };
  }

  if (!row.order_item_id || !row.order_code) {
    return {
      status: "not_activated",
      message: "Serial này chưa được liên kết với đơn hàng bán ra."
    };
  }

  if (row.order_status === "cancelled") {
    return {
      status: "inactive",
      message: "Serial này thuộc đơn hàng đã hủy nên bảo hành không hợp lệ.",
      product_name: row.product_name,
      brand_name: row.brand_name,
      category_name: row.category_name,
      sku: row.sku,
      serial_code: row.serial_code,
      serial_status: row.serial_status,
      order_code: row.order_code,
      order_status: row.order_status
    };
  }

  const warrantyCoverage = getWarrantyCoverage(row);
  const statusInfo = getWarrantyStatus(row.serial_status, row.order_status, warrantyCoverage.warrantyEndDate);
  const [tickets] = await pool.execute(
    `
      SELECT
        ticket_code,
        status,
        issue_description,
        technician_note,
        received_date,
        completed_date,
        created_at
      FROM warranty_tickets
      WHERE serial_number_id = ?
      ORDER BY created_at DESC, id DESC
    `,
    [row.serial_id]
  );
  const activeTicket = tickets.find(function (ticket) {
    return ACTIVE_TICKET_STATUSES.includes(ticket.status);
  }) || null;

  return {
    status: "found",
    product_name: row.product_name,
    brand_name: row.brand_name,
    category_name: row.category_name,
    sku: row.sku,
    serial_code: row.serial_code,
    serial_status: row.serial_status,
    order_code: row.order_code,
    order_status: row.order_status,
    purchase_date: toIsoDate(row.purchase_date),
    warranty_start_date: warrantyCoverage.warrantyStartDateIso,
    warranty_months: warrantyCoverage.warrantyMonths,
    base_warranty_months: warrantyCoverage.baseWarrantyMonths,
    extended_warranty_months: warrantyCoverage.extendedWarrantyMonths,
    warranty_package_title: row.warranty_package_title,
    warranty_end_date: warrantyCoverage.warrantyEndDateIso,
    warranty_status: statusInfo.status,
    warranty_status_label: statusInfo.label,
    active_ticket: activeTicket,
    ticket_history: tickets
  };
}

module.exports = {
  lookupWarranty,
  getWarrantyCoverage
};
