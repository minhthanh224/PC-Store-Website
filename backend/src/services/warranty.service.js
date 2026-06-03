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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
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

function generateTicketCode() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const randomNumber = Math.floor(100000 + Math.random() * 900000);

  return `BH${year}${month}${day}${randomNumber}`;
}

async function insertTicketWithRetry(connection, values) {
  let ticketCode = generateTicketCode();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const [result] = await connection.execute(
        `
          INSERT INTO warranty_tickets (
            ticket_code,
            serial_number_id,
            order_item_id,
            customer_id,
            customer_name,
            customer_phone,
            issue_description,
            technician_note,
            status,
            received_date
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'received', ?)
        `,
        [
          ticketCode,
          values.serial_number_id,
          values.order_item_id,
          values.customer_id,
          values.customer_name,
          values.customer_phone,
          values.issue_description,
          values.technician_note || null,
          values.received_date || todayIso()
        ]
      );

      return {
        id: result.insertId,
        ticket_code: ticketCode
      };
    } catch (error) {
      if (error.code !== "ER_DUP_ENTRY") {
        throw error;
      }

      ticketCode = generateTicketCode();
    }
  }

  throw createError("Không thể tạo mã phiếu bảo hành. Vui lòng thử lại.", 500);
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
      LEFT JOIN (
        SELECT oi_latest.*
        FROM order_items oi_latest
        INNER JOIN (
          SELECT serial_number_id, MAX(id) AS order_item_id
          FROM order_items
          WHERE serial_number_id IS NOT NULL
          GROUP BY serial_number_id
        ) latest_order_item ON latest_order_item.order_item_id = oi_latest.id
      ) oi_direct ON oi_direct.serial_number_id = sn.id
      LEFT JOIN (
        SELECT wt_latest.serial_number_id, wt_latest.order_item_id
        FROM warranty_tickets wt_latest
        INNER JOIN (
          SELECT serial_number_id, MAX(id) AS ticket_id
          FROM warranty_tickets
          WHERE order_item_id IS NOT NULL
          GROUP BY serial_number_id
        ) latest_ticket ON latest_ticket.ticket_id = wt_latest.id
      ) wt_order_link ON wt_order_link.serial_number_id = sn.id
      LEFT JOIN order_items oi_ticket ON oi_ticket.id = wt_order_link.order_item_id
      LEFT JOIN order_items oi ON oi.id = COALESCE(oi_direct.id, oi_ticket.id)
      LEFT JOIN orders o ON o.id = oi.order_id
      WHERE LOWER(sn.serial_code) = LOWER(?)
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

async function getCustomerWarrantyOrderItem(connection, userId, orderItemId) {
  const [rows] = await connection.execute(
    `
      SELECT
        oi.id AS order_item_id,
        oi.serial_number_id,
        oi.warranty_months_snapshot,
        oi.warranty_package_title,
        oi.warranty_package_duration_months,
        p.id AS product_id,
        p.name AS product_name,
        p.sku,
        p.warranty_months,
        sn.id AS serial_id,
        sn.serial_code,
        sn.status AS serial_status,
        sn.sold_date,
        o.id AS order_id,
        o.order_code,
        o.user_id AS customer_id,
        o.customer_name,
        o.customer_phone,
        o.status AS order_status,
        o.created_at AS order_created_at,
        o.updated_at AS order_updated_at
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN products p ON p.id = oi.product_id
      LEFT JOIN serial_numbers sn ON sn.id = oi.serial_number_id
      WHERE oi.id = ? AND o.user_id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [orderItemId, userId]
  );

  return rows[0] || null;
}

async function createCustomerWarrantyRequest(user, body) {
  const orderItemId = Number(body && body.order_item_id);
  const issueDescription = body && body.issue_description ? String(body.issue_description).trim() : "";

  if (!Number.isInteger(orderItemId) || orderItemId < 1) {
    throw createError("Vui lòng chọn sản phẩm cần yêu cầu bảo hành.", 400);
  }

  if (!issueDescription || issueDescription.length < 10) {
    throw createError("Vui lòng mô tả lỗi sản phẩm ít nhất 10 ký tự.", 400);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const orderItem = await getCustomerWarrantyOrderItem(connection, user.id, orderItemId);

    if (!orderItem) {
      throw createError("Không tìm thấy sản phẩm trong đơn hàng của bạn.", 404);
    }

    if (orderItem.order_status !== "completed") {
      throw createError("Chỉ có thể yêu cầu bảo hành cho sản phẩm thuộc đơn hàng đã hoàn thành.", 400);
    }

    if (!orderItem.serial_id || !orderItem.serial_code) {
      throw createError("Sản phẩm này chưa có Serial nên chưa thể tạo yêu cầu bảo hành trực tuyến.", 400);
    }

    if (orderItem.serial_status === "in_stock") {
      throw createError("Serial này chưa được kích hoạt bảo hành.", 400);
    }

    if (orderItem.serial_status === "warranty") {
      throw createError("Sản phẩm này đang có phiếu bảo hành đang xử lý.", 400);
    }

    if (orderItem.serial_status === "returned") {
      throw createError("Serial này không còn hợp lệ để tạo yêu cầu bảo hành.", 400);
    }

    const [activeTickets] = await connection.execute(
      `
        SELECT ticket_code
        FROM warranty_tickets
        WHERE serial_number_id = ? AND status IN ('received', 'repairing', 'waiting_parts', 'done')
        LIMIT 1
      `,
      [orderItem.serial_id]
    );

    if (activeTickets.length > 0) {
      throw createError("Sản phẩm này đã có phiếu bảo hành đang mở.", 400);
    }

    const warrantyCoverage = getWarrantyCoverage({
      ...orderItem,
      purchase_date: orderItem.order_created_at
    });

    if (warrantyCoverage.isExpired) {
      const endDateMessage = warrantyCoverage.warrantyEndDateIso
        ? ` Hạn bảo hành kết thúc ngày ${warrantyCoverage.warrantyEndDateIso}.`
        : "";
      throw createError(`Sản phẩm này đã hết hạn bảo hành.${endDateMessage}`, 400);
    }

    const ticket = await insertTicketWithRetry(connection, {
      serial_number_id: orderItem.serial_id,
      order_item_id: orderItem.order_item_id,
      customer_id: user.id,
      customer_name: orderItem.customer_name || user.full_name || user.email,
      customer_phone: orderItem.customer_phone || user.phone || "Chưa cập nhật",
      issue_description: issueDescription,
      technician_note: null,
      received_date: todayIso()
    });

    await connection.execute(
      "UPDATE serial_numbers SET status = 'warranty' WHERE id = ?",
      [orderItem.serial_id]
    );

    await connection.commit();

    return {
      ...ticket,
      status: "received",
      product_name: orderItem.product_name,
      serial_code: orderItem.serial_code,
      order_code: orderItem.order_code
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function getWarrantyRequestBlockReason(item, coverage, activeTicket) {
  if (item.order_status !== "completed") {
    return "Đơn hàng chưa hoàn thành.";
  }

  if (!item.serial_id || !item.serial_code) {
    return "Sản phẩm này chưa có Serial để gửi yêu cầu online.";
  }

  if (item.serial_status === "returned") {
    return "Serial không còn hợp lệ.";
  }

  if (activeTicket) {
    return "Sản phẩm đang có phiếu bảo hành mở.";
  }

  if (coverage.isExpired) {
    return "Sản phẩm đã hết hạn bảo hành.";
  }

  return "";
}

async function getMyWarrantyItems(user) {
  const [rows] = await pool.execute(
    `
      SELECT
        oi.id AS order_item_id,
        oi.quantity,
        oi.serial_number_id,
        oi.warranty_months_snapshot,
        oi.warranty_package_title,
        oi.warranty_package_duration_months,
        p.id AS product_id,
        p.name AS product_name,
        p.sku,
        p.slug,
        p.requires_serial,
        p.warranty_months,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) AS primary_image,
        b.name AS brand_name,
        c.name AS category_name,
        sn.id AS serial_id,
        sn.serial_code,
        sn.status AS serial_status,
        sn.sold_date,
        o.order_code,
        o.status AS order_status,
        o.created_at AS order_created_at,
        o.updated_at AS order_updated_at,
        wt.ticket_code AS latest_ticket_code,
        wt.status AS latest_ticket_status,
        wt.issue_description AS latest_ticket_issue,
        wt.received_date AS latest_ticket_received_date,
        wt.completed_date AS latest_ticket_completed_date,
        wt.created_at AS latest_ticket_created_at
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN products p ON p.id = oi.product_id
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN serial_numbers sn ON sn.id = oi.serial_number_id
      LEFT JOIN (
        SELECT wt_inner.*
        FROM warranty_tickets wt_inner
        INNER JOIN (
          SELECT serial_number_id, MAX(id) AS ticket_id
          FROM warranty_tickets
          GROUP BY serial_number_id
        ) latest_ticket ON latest_ticket.ticket_id = wt_inner.id
      ) wt ON wt.serial_number_id = sn.id
      WHERE o.user_id = ? AND o.status = 'completed'
      ORDER BY o.updated_at DESC, o.created_at DESC, oi.id DESC
    `,
    [user.id]
  );

  return rows.map(function (row) {
    const coverage = getWarrantyCoverage({
      ...row,
      purchase_date: row.order_created_at
    });
    const statusInfo = getWarrantyStatus(row.serial_status, row.order_status, coverage.warrantyEndDate);
    const latestTicket = row.latest_ticket_code ? {
      ticket_code: row.latest_ticket_code,
      status: row.latest_ticket_status,
      issue_description: row.latest_ticket_issue,
      received_date: row.latest_ticket_received_date,
      completed_date: row.latest_ticket_completed_date,
      created_at: row.latest_ticket_created_at
    } : null;
    const hasActiveTicket = Boolean(latestTicket && ACTIVE_TICKET_STATUSES.includes(latestTicket.status));
    const requestBlockReason = getWarrantyRequestBlockReason(row, coverage, hasActiveTicket);

    return {
      order_item_id: row.order_item_id,
      order_code: row.order_code,
      product_id: row.product_id,
      product_name: row.product_name,
      sku: row.sku,
      slug: row.slug,
      product_image: row.primary_image,
      brand_name: row.brand_name,
      category_name: row.category_name,
      quantity: Number(row.quantity || 0),
      requires_serial: Boolean(row.requires_serial),
      serial_id: row.serial_id,
      serial_code: row.serial_code,
      serial_status: row.serial_status,
      purchase_date: toIsoDate(row.order_created_at),
      completed_date: toIsoDate(row.order_updated_at),
      warranty_months: coverage.warrantyMonths,
      base_warranty_months: coverage.baseWarrantyMonths,
      extended_warranty_months: coverage.extendedWarrantyMonths,
      warranty_package_title: row.warranty_package_title,
      warranty_start_date: coverage.warrantyStartDateIso,
      warranty_end_date: coverage.warrantyEndDateIso,
      is_expired: coverage.isExpired,
      warranty_status: statusInfo.status,
      warranty_status_label: statusInfo.label,
      latest_ticket: latestTicket,
      can_request_warranty: !requestBlockReason,
      request_block_reason: requestBlockReason
    };
  });
}

async function getMyWarrantyTickets(user, query) {
  const allowedStatuses = ["received", "repairing", "waiting_parts", "done", "returned", "rejected"];
  const params = [user.id];
  let statusFilter = "";

  if (query && query.status && allowedStatuses.includes(query.status)) {
    statusFilter = "AND wt.status = ?";
    params.push(query.status);
  }

  const [tickets] = await pool.execute(
    `
      SELECT
        wt.ticket_code,
        wt.status,
        wt.issue_description,
        wt.technician_note,
        wt.received_date,
        wt.completed_date,
        wt.created_at,
        sn.serial_code,
        p.name AS product_name,
        p.sku,
        o.order_code
      FROM warranty_tickets wt
      INNER JOIN serial_numbers sn ON sn.id = wt.serial_number_id
      INNER JOIN products p ON p.id = sn.product_id
      LEFT JOIN order_items oi ON oi.id = wt.order_item_id
      LEFT JOIN orders o ON o.id = oi.order_id
      WHERE wt.customer_id = ?
      ${statusFilter}
      ORDER BY wt.created_at DESC, wt.id DESC
    `,
    params
  );

  return tickets;
}

async function getMyWarrantyTicketDetail(user, ticketCode) {
  const [rows] = await pool.execute(
    `
      SELECT
        wt.ticket_code,
        wt.status,
        wt.issue_description,
        wt.technician_note,
        wt.received_date,
        wt.completed_date,
        wt.created_at,
        wt.updated_at,
        sn.serial_code,
        sn.status AS serial_status,
        sn.sold_date,
        p.name AS product_name,
        p.sku,
        p.warranty_months,
        oi.warranty_months_snapshot,
        oi.warranty_package_title,
        oi.warranty_package_duration_months,
        o.order_code,
        o.status AS order_status,
        o.created_at AS order_created_at,
        o.updated_at AS order_updated_at
      FROM warranty_tickets wt
      INNER JOIN serial_numbers sn ON sn.id = wt.serial_number_id
      INNER JOIN products p ON p.id = sn.product_id
      LEFT JOIN order_items oi ON oi.id = wt.order_item_id
      LEFT JOIN orders o ON o.id = oi.order_id
      WHERE wt.ticket_code = ? AND wt.customer_id = ?
      LIMIT 1
    `,
    [ticketCode, user.id]
  );

  if (rows.length === 0) {
    throw createError("Không tìm thấy phiếu bảo hành của bạn.", 404);
  }

  const row = rows[0];
  const warrantyCoverage = getWarrantyCoverage({
    ...row,
    purchase_date: row.order_created_at
  });

  return {
    ...row,
    warranty_months: warrantyCoverage.warrantyMonths,
    base_warranty_months: warrantyCoverage.baseWarrantyMonths,
    extended_warranty_months: warrantyCoverage.extendedWarrantyMonths,
    warranty_start_date: warrantyCoverage.warrantyStartDateIso,
    warranty_end_date: warrantyCoverage.warrantyEndDateIso
  };
}

module.exports = {
  lookupWarranty,
  getWarrantyCoverage,
  createCustomerWarrantyRequest,
  getMyWarrantyItems,
  getMyWarrantyTickets,
  getMyWarrantyTicketDetail
};
