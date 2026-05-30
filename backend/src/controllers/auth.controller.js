const bcrypt = require("bcryptjs");
const pool = require("../config/database");
const generateToken = require("../utils/generateToken");
const { logDatabaseError } = require("../utils/logDatabaseError");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatUser(user) {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
}

async function register(req, res) {
  const fullName = (req.body.full_name || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const phone = req.body.phone ? req.body.phone.trim() : null;
  const password = req.body.password || "";

  if (!fullName || !email || !phone || !password) {
    res.status(400).json({
      success: false,
      message: "Vui lòng nhập họ tên, số điện thoại, email và mật khẩu."
    });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({
      success: false,
      message: "Email không hợp lệ."
    });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({
      success: false,
      message: "Mật khẩu phải có ít nhất 6 ký tự."
    });
    return;
  }

  const [existingUsers] = await pool.execute(
    "SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1",
    [email, phone]
  );

  if (existingUsers.length > 0) {
    res.status(409).json({
      success: false,
      message: "Email hoặc số điện thoại đã được sử dụng."
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.execute(
    `
      INSERT INTO users (full_name, email, phone, password_hash, role, status)
      VALUES (?, ?, ?, ?, 'customer', 'active')
    `,
    [fullName, email, phone, passwordHash]
  );

  const [users] = await pool.execute(
    `
      SELECT id, full_name, email, phone, role, status, created_at, updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [result.insertId]
  );
  const user = formatUser(users[0]);

  res.status(201).json({
    success: true,
    message: "Đăng ký tài khoản thành công.",
    data: {
      user,
      token: generateToken(user)
    }
  });
}

async function login(req, res) {
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";

  if (!email || !password) {
    res.status(400).json({
      success: false,
      message: "Vui lòng nhập email và mật khẩu."
    });
    return;
  }

  try {
    const [users] = await pool.execute(
      `
        SELECT id, full_name, email, phone, password_hash, role, status, created_at, updated_at
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
      [email]
    );

    if (users.length === 0) {
      res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng."
      });
      return;
    }

    const userRecord = users[0];

    if (userRecord.status !== "active") {
      res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa hoặc ngừng hoạt động."
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, userRecord.password_hash);

    if (!passwordMatches) {
      res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng."
      });
      return;
    }

    const user = formatUser(userRecord);

    res.json({
      success: true,
      message: "Đăng nhập thành công.",
      data: {
        user,
        token: generateToken(user)
      }
    });
  } catch (error) {
    logDatabaseError("POST /api/auth/login", error);
    throw error;
  }
}

async function getMe(req, res) {
  res.json({
    success: true,
    data: {
      user: formatUser(req.user)
    }
  });
}

module.exports = {
  register,
  login,
  getMe,
  formatUser
};
