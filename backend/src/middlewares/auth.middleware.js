const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const { isDatabaseError, logDatabaseError } = require("../utils/logDatabaseError");

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Bạn cần đăng nhập để thực hiện thao tác này."
    });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.execute(
      `
        SELECT id, full_name, email, phone, role, status, created_at, updated_at
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [payload.id]
    );

    if (rows.length === 0 || rows[0].status !== "active") {
      res.status(401).json({
        success: false,
        message: "Tài khoản không hợp lệ hoặc đã bị khóa."
      });
      return;
    }

    req.user = rows[0];
    next();
  } catch (error) {
    if (isDatabaseError(error)) {
      logDatabaseError("AUTH middleware user lookup", error);
    }

    res.status(401).json({
      success: false,
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."
    });
  }
}

module.exports = authMiddleware;
module.exports.requireAuth = authMiddleware;
