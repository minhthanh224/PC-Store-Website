const pool = require("../config/database");
const { getWarrantyCoverage } = require("./warranty.service");

const TICKET_STATUSES = ["received", "repairing", "waiting_parts", "done", "returned", "rejected"];
const ACTIVE_TICKET_STATUSES = ["received", "repairing", "waiting_parts", "done"];
const TERMINAL_TICKET_STATUSES = ["returned", "rejected"];
const ALLOWED_TRANSITIONS = {
  received: ["repairing", "waiting_parts", "rejected"],
  repairing: ["waiting_parts", "done", "rejected"],
  waiting_parts: ["repairing", "done", "rejected"],
  done: ["returned", "rejected"]
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function generateTicketCode() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const randomNumber = Math.floor(100000 + Math.random() * 900000);

  return `BH${year}${month}${day}${randomNumber}`;
}

function getValidNextStatuses(status) {
  return ALLOWED_TRANSITIONS[status] || [];
}

async function getTicketSummary() {
  const [rows] = await pool.execute(
    `
      SELECT status, COUNT(*) AS total
      FROM warranty_tickets
      GROUP BY status
    `
  );
  const summary = {
    received: 0,
    repairing: 0,
    waiting_parts: 0,
    done: 0,
    returned: 0,
    rejected: 0,
    closed: 0
  };

  rows.forEach(function (row) {
    summary[row.status] = Number(row.total);
  });
  summary.closed = summary.returned + summary.rejected;

  return summary;
}

async function getTickets(query) {
  const where = ["1 = 1"];
  const params = [];

  if (query.keyword && query.keyword.trim()) {
    const keyword = `%${query.keyword.trim()}%`;
    where.push("(wt.ticket_code LIKE ? OR sn.serial_code LIKE ? OR p.name LIKE ? OR wt.customer_name LIKE ? OR wt.customer_phone LIKE ?)");
    params.push(keyword, keyword, keyword, keyword, keyword);
  }

  if (query.status && TICKET_STATUSES.includes(query.status)) {
    where.push("wt.status = ?");
    params.push(query.status);
  }

  const { page, limit, offset } = normalizePagination(query);
  const whereSql = where.join(" AND ");

  const [[countRow]] = await pool.execute(
    `
      SELECT COUNT(*) AS total
      FROM warranty_tickets wt
      INNER JOIN serial_numbers sn ON sn.id = wt.serial_number_id
      INNER JOIN products p ON p.id = sn.product_id
      WHERE ${whereSql}
    `,
    params
  );

  const [tickets] = await pool.execute(
    `
      SELECT
        wt.ticket_code,
        sn.serial_code,
        p.name AS product_name,
        wt.customer_name,
        wt.customer_phone,
        wt.issue_description,
        wt.status,
        wt.received_date,
        wt.completed_date,
        wt.technician_note,
        wt.created_at
      FROM warranty_tickets wt
      INNER JOIN serial_numbers sn ON sn.id = wt.serial_number_id
      INNER JOIN products p ON p.id = sn.product_id
      WHERE ${whereSql}
      ORDER BY wt.created_at DESC, wt.id DESC
      LIMIT ? OFFSET ?
    `,
    params.concat([limit, offset])
  );
  const total = Number(countRow.total);

  return {
    tickets,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    summary: await getTicketSummary()
  };
}

async function getTicketDetail(ticketCode) {
  const [rows] = await pool.execute(
    `
      SELECT
        wt.id,
        wt.ticket_code,
        wt.customer_id,
        wt.customer_name,
        wt.customer_phone,
        wt.issue_description,
        wt.technician_note,
        wt.status,
        wt.received_date,
        wt.completed_date,
        wt.created_at,
        wt.updated_at,
        sn.id AS serial_number_id,
        sn.serial_code,
        sn.status AS serial_status,
        sn.import_date,
        sn.sold_date,
        p.id AS product_id,
        p.name AS product_name,
        p.sku,
        p.product_type,
        b.name AS brand_name,
        c.name AS category_name,
        oi.id AS order_item_id,
        oi.warranty_months_snapshot,
        oi.warranty_package_title,
        oi.warranty_package_duration_months,
        o.order_code,
        o.status AS order_status,
        o.created_at AS order_created_at,
        o.customer_email
      FROM warranty_tickets wt
      INNER JOIN serial_numbers sn ON sn.id = wt.serial_number_id
      INNER JOIN products p ON p.id = sn.product_id
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN order_items oi ON oi.id = wt.order_item_id
      LEFT JOIN orders o ON o.id = oi.order_id
      WHERE wt.ticket_code = ?
      LIMIT 1
    `,
    [ticketCode]
  );

  if (rows.length === 0) {
    throw createError("Không tìm thấy phiếu bảo hành.", 404);
  }

  const row = rows[0];

  return {
    ticket: {
      id: row.id,
      ticket_code: row.ticket_code,
      customer_id: row.customer_id,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      issue_description: row.issue_description,
      technician_note: row.technician_note,
      status: row.status,
      received_date: row.received_date,
      completed_date: row.completed_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
      valid_next_statuses: getValidNextStatuses(row.status)
    },
    serial: {
      id: row.serial_number_id,
      serial_code: row.serial_code,
      status: row.serial_status,
      import_date: row.import_date,
      sold_date: row.sold_date
    },
    product: {
      id: row.product_id,
      name: row.product_name,
      sku: row.sku,
      product_type: row.product_type,
      brand_name: row.brand_name,
      category_name: row.category_name
    },
    order: row.order_code ? {
      order_item_id: row.order_item_id,
      order_code: row.order_code,
      status: row.order_status,
      created_at: row.order_created_at,
      customer_email: row.customer_email,
      warranty_months: Number(row.warranty_months_snapshot || 0) + Number(row.warranty_package_duration_months || 0),
      warranty_package_title: row.warranty_package_title,
      warranty_package_duration_months: row.warranty_package_duration_months === null ? null : Number(row.warranty_package_duration_months)
    } : null
  };
}

function validateCreateBody(body) {
  const requiredFields = ["serial_code", "customer_name", "customer_phone", "issue_description"];

  for (const field of requiredFields) {
    if (!body[field] || !String(body[field]).trim()) {
      return "Vui lòng nhập đầy đủ thông tin phiếu bảo hành.";
    }
  }

  return null;
}

async function findCompletedOrderForSerial(connection, serialId) {
  const [rows] = await connection.execute(
    `
      SELECT
        oi.id AS order_item_id,
        o.user_id AS customer_id,
        o.status AS order_status,
        o.created_at AS order_created_at,
        o.updated_at AS order_updated_at,
        oi.warranty_months_snapshot,
        oi.warranty_package_duration_months,
        p.warranty_months
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN products p ON p.id = oi.product_id
      WHERE oi.serial_number_id = ?
      ORDER BY (o.status = 'completed') DESC, o.created_at DESC, oi.id DESC
      LIMIT 1
    `,
    [serialId]
  );

  return rows[0] || null;
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
          values.technician_note,
          values.received_date
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

async function createTicket(body) {
  const validationError = validateCreateBody(body);

  if (validationError) {
    throw createError(validationError, 400);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const serialCode = String(body.serial_code).trim();
    const [serials] = await connection.execute(
      `
        SELECT id, status, sold_date
        FROM serial_numbers
        WHERE serial_code = ?
        LIMIT 1
        FOR UPDATE
      `,
      [serialCode]
    );

    if (serials.length === 0) {
      throw createError("Không tìm thấy Serial trong hệ thống.", 404);
    }

    const serial = serials[0];

    if (serial.status === "in_stock") {
      throw createError("Serial này chưa được bán nên chưa thể tạo phiếu bảo hành.", 400);
    }

    if (serial.status === "warranty") {
      throw createError("Serial này đang có phiếu bảo hành đang xử lý.", 400);
    }

    if (serial.status === "returned") {
      throw createError("Serial này thuộc hàng đã trả về shop, không thể tạo phiếu bảo hành khách hàng.", 400);
    }

    const [activeTickets] = await connection.execute(
      `
        SELECT ticket_code
        FROM warranty_tickets
        WHERE serial_number_id = ? AND status IN ('received', 'repairing', 'waiting_parts', 'done')
        LIMIT 1
      `,
      [serial.id]
    );

    if (activeTickets.length > 0) {
      throw createError("Serial này đã có phiếu bảo hành đang mở.", 400);
    }

    const orderLink = await findCompletedOrderForSerial(connection, serial.id);

    if (!orderLink) {
      throw createError("Serial này chưa được liên kết với đơn hàng bán ra.", 400);
    }

    if (orderLink.order_status !== "completed") {
      throw createError("Serial này chưa thuộc đơn hàng đã hoàn thành nên chưa thể tạo phiếu bảo hành.", 400);
    }

    const warrantyCoverage = getWarrantyCoverage({
      ...orderLink,
      sold_date: serial.sold_date
    });

    if (warrantyCoverage.isExpired) {
      const endDateMessage = warrantyCoverage.warrantyEndDateIso
        ? ` Hạn bảo hành kết thúc ngày ${warrantyCoverage.warrantyEndDateIso}.`
        : "";
      throw createError(`Serial này đã hết hạn bảo hành nên không thể tạo phiếu bảo hành.${endDateMessage}`, 400);
    }

    const ticket = await insertTicketWithRetry(connection, {
      serial_number_id: serial.id,
      order_item_id: orderLink.order_item_id,
      customer_id: orderLink.customer_id,
      customer_name: String(body.customer_name).trim(),
      customer_phone: String(body.customer_phone).trim(),
      issue_description: String(body.issue_description).trim(),
      technician_note: body.technician_note ? String(body.technician_note).trim() : null,
      received_date: body.received_date || todayIso()
    });

    await connection.execute(
      "UPDATE serial_numbers SET status = 'warranty' WHERE id = ?",
      [serial.id]
    );

    await connection.commit();

    return {
      ...ticket,
      status: "received"
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateTicketStatus(ticketCode, status, technicianNote) {
  if (!TICKET_STATUSES.includes(status)) {
    throw createError("Trạng thái phiếu bảo hành không hợp lệ.", 400);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [tickets] = await connection.execute(
      `
        SELECT id, serial_number_id, status, completed_date
        FROM warranty_tickets
        WHERE ticket_code = ?
        LIMIT 1
        FOR UPDATE
      `,
      [ticketCode]
    );

    if (tickets.length === 0) {
      throw createError("Không tìm thấy phiếu bảo hành.", 404);
    }

    const ticket = tickets[0];

    if (TERMINAL_TICKET_STATUSES.includes(ticket.status)) {
      throw createError("Không thể chuyển trạng thái phiếu bảo hành theo luồng này.", 400);
    }

    if (!getValidNextStatuses(ticket.status).includes(status)) {
      throw createError("Không thể chuyển trạng thái phiếu bảo hành theo luồng này.", 400);
    }

    const note = technicianNote === undefined ? null : String(technicianNote).trim();

    if (["returned", "rejected"].includes(status)) {
      await connection.execute(
        `
          UPDATE warranty_tickets
          SET status = ?,
              technician_note = COALESCE(?, technician_note),
              completed_date = COALESCE(completed_date, CURRENT_DATE)
          WHERE id = ?
        `,
        [status, note || null, ticket.id]
      );

      await connection.execute(
        "UPDATE serial_numbers SET status = 'sold' WHERE id = ?",
        [ticket.serial_number_id]
      );
    } else {
      await connection.execute(
        `
          UPDATE warranty_tickets
          SET status = ?,
              technician_note = COALESCE(?, technician_note)
          WHERE id = ?
        `,
        [status, note || null, ticket.id]
      );

      await connection.execute(
        "UPDATE serial_numbers SET status = 'warranty' WHERE id = ?",
        [ticket.serial_number_id]
      );
    }

    await connection.commit();

    return {
      ticket_code: ticketCode,
      status
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateTicketNote(ticketCode, technicianNote) {
  const [result] = await pool.execute(
    `
      UPDATE warranty_tickets
      SET technician_note = ?
      WHERE ticket_code = ?
    `,
    [technicianNote ? String(technicianNote).trim() : null, ticketCode]
  );

  if (result.affectedRows === 0) {
    throw createError("Không tìm thấy phiếu bảo hành.", 404);
  }
}

module.exports = {
  getTickets,
  getTicketDetail,
  createTicket,
  updateTicketStatus,
  updateTicketNote
};
