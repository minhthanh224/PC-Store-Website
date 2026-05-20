const pool = require("../config/database");
const { logDatabaseError } = require("../utils/logDatabaseError");

async function testDatabaseConnection(req, res) {
  try {
    const [rows] = await pool.query("SELECT 1 AS result");

    res.json({
      success: true,
      message: "Database connection successful",
      data: {
        result: rows[0].result
      }
    });
  } catch (error) {
    logDatabaseError("GET /api/db-test", error);

    res.status(503).json({
      success: false,
      message: "Database connection failed. Please check that MySQL is running and the database settings are correct."
    });
  }
}

module.exports = {
  testDatabaseConnection
};
