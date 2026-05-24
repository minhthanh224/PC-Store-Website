const mysql = require("mysql2/promise");

const dbConfig = getDatabaseConfig();

const poolConfig = {
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(poolConfig);

function getDatabaseConfig() {
  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "se104_pc_store"
  };
}

module.exports = pool;
