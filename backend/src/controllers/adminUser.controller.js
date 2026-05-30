const bcrypt = require("bcryptjs");
const pool = require("../config/database");

const ROLES = ["customer", "sales", "technician", "admin"];
const STATUSES = ["active", "inactive"];

function validateUserBody(body, requirePassword) {
  const fullName = String(body.full_name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = body.phone ? String(body.phone).trim() : null;
  const password = body.password || "";
  const role = body.role || "customer";
  const status = body.status || "active";

  if (!fullName || !email || (requirePassword && !password)) {
    throw Object.assign(new Error("Vui lòng nhập họ tên, email và mật khẩu."), { statusCode: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error("Email không hợp lệ."), { statusCode: 400 });
  }
  if (password && password.length < 6) {
    throw Object.assign(new Error("Mật khẩu phải có ít nhất 6 ký tự."), { statusCode: 400 });
  }
  if (!ROLES.includes(role) || !STATUSES.includes(status)) {
    throw Object.assign(new Error("Vai trò hoặc trạng thái tài khoản không hợp lệ."), { statusCode: 400 });
  }

  return { fullName, email, phone, password, role, status };
}

async function getUsers(req, res) {
  const keyword = String(req.query.keyword || "").trim();
  const role = ROLES.includes(req.query.role) ? req.query.role : null;
  const status = STATUSES.includes(req.query.status) ? req.query.status : null;
  const where = ["1 = 1"];
  const params = [];

  if (keyword) {
    where.push("(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)");
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (role) {
    where.push("role = ?");
    params.push(role);
  }
  if (status) {
    where.push("status = ?");
    params.push(status);
  }

  const [users] = await pool.execute(
    `SELECT id, full_name, email, phone, role, status, created_at, updated_at
     FROM users WHERE ${where.join(" AND ")} ORDER BY created_at DESC, id DESC`,
    params
  );
  res.json({ success: true, data: users });
}

async function createUser(req, res) {
  const user = validateUserBody(req.body, true);
  try {
    const [result] = await pool.execute(
      `INSERT INTO users (full_name, email, phone, password_hash, role, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.fullName, user.email, user.phone, await bcrypt.hash(user.password, 10), user.role, user.status]
    );
    res.status(201).json({ success: true, message: "Tạo tài khoản thành công.", data: { id: result.insertId } });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res.status(409).json({ success: false, message: "Email đã được sử dụng." });
      return;
    }
    throw error;
  }
}

async function updateUser(req, res) {
  const id = Number(req.params.id);
  const user = validateUserBody(req.body, false);
  const values = [user.fullName, user.email, user.phone, user.role, user.status];
  let passwordSql = "";

  if (user.password) {
    passwordSql = ", password_hash = ?";
    values.push(await bcrypt.hash(user.password, 10));
  }
  values.push(id);

  try {
    const [result] = await pool.execute(
      `UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, status = ?${passwordSql} WHERE id = ?`,
      values
    );
    if (!result.affectedRows) {
      res.status(404).json({ success: false, message: "Không tìm thấy tài khoản." });
      return;
    }
    res.json({ success: true, message: "Cập nhật tài khoản thành công." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res.status(409).json({ success: false, message: "Email đã được sử dụng." });
      return;
    }
    throw error;
  }
}

module.exports = { getUsers, createUser, updateUser };
