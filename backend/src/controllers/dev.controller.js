const pool = require("../config/database");
const { logDatabaseError } = require("../utils/logDatabaseError");

async function countRows(query) {
  const [rows] = await pool.execute(query);
  return rows[0].total;
}

async function getDatabaseSummary(req, res) {
  try {
    const [
      users,
      brands,
      categories,
      products,
      serialNumbers
    ] = await Promise.all([
      countRows("SELECT COUNT(*) AS total FROM users"),
      countRows("SELECT COUNT(*) AS total FROM brands"),
      countRows("SELECT COUNT(*) AS total FROM categories"),
      countRows("SELECT COUNT(*) AS total FROM products"),
      countRows("SELECT COUNT(*) AS total FROM serial_numbers")
    ]);

    res.json({
      success: true,
      data: {
        users,
        brands,
        categories,
        products,
        serialNumbers
      }
    });
  } catch (error) {
    logDatabaseError("GET /api/dev/db-summary", error);
    throw error;
  }
}

module.exports = {
  getDatabaseSummary
};
