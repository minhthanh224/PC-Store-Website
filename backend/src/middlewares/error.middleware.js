const { isDatabaseError, logDatabaseError } = require("../utils/logDatabaseError");

function errorMiddleware(error, req, res, next) {
  if (isDatabaseError(error)) {
    logDatabaseError(`${req.method} ${req.originalUrl}`, error);
  }

  const statusCode = error.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  const message = statusCode >= 500
    ? "Có lỗi xảy ra trên máy chủ. Vui lòng thử lại sau."
    : (error.message || "Yêu cầu không hợp lệ.");

  res.status(statusCode).json({
    success: false,
    message
  });
}

module.exports = errorMiddleware;
