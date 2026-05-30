const pool = require("../config/database");
const { isDatabaseError, logDatabaseError } = require("../utils/logDatabaseError");

const MAX_METADATA_LENGTH = 6000;

function normalizePagination(query) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);

  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
}

function truncate(value, maxLength) {
  const text = value === null || value === undefined ? null : String(value);

  if (!text) {
    return null;
  }

  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function serializeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  try {
    return truncate(JSON.stringify(metadata), MAX_METADATA_LENGTH);
  } catch (error) {
    return JSON.stringify({ note: "Không thể serialize metadata audit." });
  }
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (forwardedFor) {
    return String(forwardedFor).split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || null;
}

async function createAuditLogFromRequest(req, payload) {
  const user = req.user || {};

  await pool.execute(
    `
      INSERT INTO admin_audit_logs (
        actor_user_id,
        actor_name,
        actor_email,
        actor_role,
        action_type,
        entity_type,
        entity_id,
        entity_label,
        message,
        metadata_json,
        ip_address,
        user_agent
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      user.id || null,
      truncate(user.full_name || null, 150),
      truncate(user.email || null, 150),
      truncate(user.role || null, 50),
      truncate(payload.action_type || "admin_action", 80),
      truncate(payload.entity_type || null, 80),
      truncate(payload.entity_id || null, 120),
      truncate(payload.entity_label || null, 255),
      truncate(payload.message || null, 1000),
      serializeMetadata(payload.metadata),
      truncate(getClientIp(req), 80),
      truncate(req.headers["user-agent"] || null, 255)
    ]
  );
}

async function logAuditEvent(req, payload) {
  try {
    await createAuditLogFromRequest(req, payload || {});
  } catch (error) {
    if (isDatabaseError(error)) {
      logDatabaseError("AUDIT log write", error);
    } else {
      console.warn("AUDIT log write failed:", error.message);
    }
  }
}

function buildWhere(query) {
  const where = ["1 = 1"];
  const params = [];

  if (query.actionType) {
    where.push("action_type = ?");
    params.push(query.actionType);
  }

  if (query.entityType) {
    where.push("entity_type = ?");
    params.push(query.entityType);
  }

  if (query.actorRole) {
    where.push("actor_role = ?");
    params.push(query.actorRole);
  }

  if (query.dateFrom) {
    where.push("created_at >= ?");
    params.push(`${query.dateFrom} 00:00:00`);
  }

  if (query.dateTo) {
    where.push("created_at <= ?");
    params.push(`${query.dateTo} 23:59:59`);
  }

  if (query.keyword) {
    const keyword = `%${String(query.keyword).trim()}%`;
    where.push(`(
      actor_name LIKE ? OR actor_email LIKE ? OR action_type LIKE ? OR entity_type LIKE ?
      OR entity_id LIKE ? OR entity_label LIKE ? OR message LIKE ?
    )`);
    params.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword);
  }

  return { where, params };
}

function parseMetadata(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function mapAuditLog(row) {
  return {
    id: row.id,
    actor_user_id: row.actor_user_id,
    actor_name: row.actor_name,
    actor_email: row.actor_email,
    actor_role: row.actor_role,
    action_type: row.action_type,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    entity_label: row.entity_label,
    message: row.message,
    metadata: parseMetadata(row.metadata_json),
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    created_at: row.created_at
  };
}

async function getAuditLogs(query) {
  const { where, params } = buildWhere(query || {});
  const { page, limit, offset } = normalizePagination(query || {});
  const [[countRow]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM admin_audit_logs WHERE ${where.join(" AND ")}`,
    params
  );
  const [rows] = await pool.execute(
    `
      SELECT *
      FROM admin_audit_logs
      WHERE ${where.join(" AND ")}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `,
    params.concat([limit, offset])
  );
  const total = Number(countRow.total || 0);

  return {
    logs: rows.map(mapAuditLog),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

async function exportAuditLogs(query) {
  const { where, params } = buildWhere(query || {});
  const [rows] = await pool.execute(
    `
      SELECT *
      FROM admin_audit_logs
      WHERE ${where.join(" AND ")}
      ORDER BY created_at DESC, id DESC
      LIMIT 5000
    `,
    params
  );

  return rows.map(mapAuditLog);
}

async function getAuditFilterOptions() {
  const [actions] = await pool.execute(
    `SELECT DISTINCT action_type AS value FROM admin_audit_logs WHERE action_type IS NOT NULL ORDER BY action_type ASC`
  );
  const [entities] = await pool.execute(
    `SELECT DISTINCT entity_type AS value FROM admin_audit_logs WHERE entity_type IS NOT NULL ORDER BY entity_type ASC`
  );

  return {
    actionTypes: actions.map(function (row) { return row.value; }),
    entityTypes: entities.map(function (row) { return row.value; }),
    actorRoles: ["admin", "sales", "technician"]
  };
}

module.exports = {
  logAuditEvent,
  getAuditLogs,
  exportAuditLogs,
  getAuditFilterOptions
};
