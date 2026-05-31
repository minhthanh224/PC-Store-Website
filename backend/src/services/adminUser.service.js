const bcrypt = require("bcryptjs");
const pool = require("../config/database");

const ROLES = ["admin", "sales", "technician", "customer"];
const STATUSES = ["active", "inactive"];

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

function normalizeUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: Number(row.id),
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function normalizeUserBody(body, options) {
  const requirePassword = options && options.requirePassword;
  const allowEmail = options && options.allowEmail;
  const fullName = String(body.full_name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = body.phone ? String(body.phone).trim() : null;
  const role = String(body.role || "customer").trim();
  const status = String(body.status || "active").trim();
  const password = String(body.password || "");

  if (!fullName) {
    throw createError("Vui lòng nhập họ tên người dùng.", 400);
  }

  if (allowEmail && (!email || !isValidEmail(email))) {
    throw createError("Email không hợp lệ.", 400);
  }

  if (!ROLES.includes(role)) {
    throw createError("Vai trò tài khoản không hợp lệ.", 400);
  }

  if (!STATUSES.includes(status)) {
    throw createError("Trạng thái tài khoản không hợp lệ.", 400);
  }

  if (requirePassword && !password) {
    throw createError("Vui lòng nhập mật khẩu tạm thời.", 400);
  }

  if (password && password.length < 6) {
    throw createError("Mật khẩu phải có ít nhất 6 ký tự.", 400);
  }

  return {
    full_name: fullName,
    email,
    phone,
    role,
    status,
    password
  };
}

async function getUserById(connection, userId, lockForUpdate) {
  const [rows] = await connection.execute(
    `
      SELECT id, full_name, email, phone, role, status, created_at, updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
      ${lockForUpdate ? "FOR UPDATE" : ""}
    `,
    [userId]
  );

  return normalizeUser(rows[0]);
}

function parseUserId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id < 1) {
    throw createError("Người dùng không hợp lệ.", 400);
  }

  return id;
}

function ensureSelfUpdateIsSafe(actor, currentUser, nextValues) {
  if (!actor || Number(actor.id) !== Number(currentUser.id)) {
    return;
  }

  if (nextValues.role !== currentUser.role) {
    throw createError("Bạn không thể tự thay đổi vai trò của chính mình.", 400);
  }

  if (nextValues.status !== "active") {
    throw createError("Bạn không thể tự khóa tài khoản của chính mình.", 400);
  }
}

async function ensureAdminContinuity(connection, currentUser, nextValues) {
  const demotesAdmin = currentUser.role === "admin" && nextValues.role !== "admin";
  const deactivatesAdmin = currentUser.role === "admin" && nextValues.status !== "active";

  if (!demotesAdmin && !deactivatesAdmin) {
    return;
  }

  const [[row]] = await connection.execute(
    `
      SELECT COUNT(*) AS total
      FROM users
      WHERE role = 'admin'
        AND status = 'active'
        AND id <> ?
    `,
    [currentUser.id]
  );

  if (Number(row.total || 0) < 1) {
    throw createError("Không thể khóa hoặc hạ quyền quản trị viên active cuối cùng.", 400);
  }
}

async function getUsers(query) {
  const where = ["1 = 1"];
  const params = [];

  if (query.keyword && String(query.keyword).trim()) {
    const keyword = `%${String(query.keyword).trim()}%`;
    where.push("(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)");
    params.push(keyword, keyword, keyword);
  }

  if (query.role && ROLES.includes(query.role)) {
    where.push("role = ?");
    params.push(query.role);
  }

  if (query.status && STATUSES.includes(query.status)) {
    where.push("status = ?");
    params.push(query.status);
  }

  const { page, limit, offset } = normalizePagination(query);
  const whereSql = where.join(" AND ");
  const [[countRow]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM users WHERE ${whereSql}`,
    params
  );
  const [rows] = await pool.execute(
    `
      SELECT id, full_name, email, phone, role, status, created_at, updated_at
      FROM users
      WHERE ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `,
    params.concat([limit, offset])
  );
  const total = Number(countRow.total || 0);

  return {
    users: rows.map(normalizeUser),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

async function createUser(body) {
  const user = normalizeUserBody(body, {
    requirePassword: true,
    allowEmail: true
  });

  const passwordHash = await bcrypt.hash(user.password, 10);

  try {
    const [result] = await pool.execute(
      `
        INSERT INTO users (full_name, email, phone, password_hash, role, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [user.full_name, user.email, user.phone, passwordHash, user.role, user.status]
    );

    const created = await getUserById(pool, result.insertId, false);

    return {
      user: created,
      previous: null
    };
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw createError("Email đã được sử dụng.", 409);
    }

    throw error;
  }
}

async function updateUser(userId, body, actor) {
  const id = parseUserId(userId);
  const nextValues = normalizeUserBody(body, {
    requirePassword: false,
    allowEmail: false
  });
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const currentUser = await getUserById(connection, id, true);

    if (!currentUser) {
      throw createError("Không tìm thấy người dùng.", 404);
    }

    ensureSelfUpdateIsSafe(actor, currentUser, nextValues);
    await ensureAdminContinuity(connection, currentUser, nextValues);

    await connection.execute(
      `
        UPDATE users
        SET full_name = ?, phone = ?, role = ?, status = ?
        WHERE id = ?
      `,
      [nextValues.full_name, nextValues.phone, nextValues.role, nextValues.status, id]
    );

    const updatedUser = await getUserById(connection, id, false);
    await connection.commit();

    return {
      user: updatedUser,
      previous: currentUser
    };
  } catch (error) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      throw createError("Thông tin người dùng bị trùng.", 409);
    }

    throw error;
  } finally {
    connection.release();
  }
}

async function updateUserStatus(userId, status, actor) {
  const id = parseUserId(userId);

  if (!STATUSES.includes(status)) {
    throw createError("Trạng thái tài khoản không hợp lệ.", 400);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const currentUser = await getUserById(connection, id, true);

    if (!currentUser) {
      throw createError("Không tìm thấy người dùng.", 404);
    }

    const nextValues = {
      full_name: currentUser.full_name,
      phone: currentUser.phone,
      role: currentUser.role,
      status
    };

    ensureSelfUpdateIsSafe(actor, currentUser, nextValues);
    await ensureAdminContinuity(connection, currentUser, nextValues);

    await connection.execute(
      "UPDATE users SET status = ? WHERE id = ?",
      [status, id]
    );

    const updatedUser = await getUserById(connection, id, false);
    await connection.commit();

    return {
      user: updatedUser,
      previous: currentUser
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function resetUserPassword(userId, body, actor) {
  const id = parseUserId(userId);
  const password = String(body.password || "");

  if (Number(actor && actor.id) === id) {
    throw createError("Vui lòng đổi mật khẩu của chính bạn ở trang tài khoản.", 400);
  }

  if (password.length < 6) {
    throw createError("Mật khẩu tạm thời phải có ít nhất 6 ký tự.", 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const currentUser = await getUserById(connection, id, true);

    if (!currentUser) {
      throw createError("Không tìm thấy người dùng.", 404);
    }

    await connection.execute(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [passwordHash, id]
    );

    const updatedUser = await getUserById(connection, id, false);
    await connection.commit();

    return {
      user: updatedUser,
      previous: currentUser
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  ROLES,
  STATUSES,
  getUsers,
  createUser,
  updateUser,
  updateUserStatus,
  resetUserPassword
};
