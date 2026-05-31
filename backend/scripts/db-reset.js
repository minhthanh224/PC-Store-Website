require("dotenv").config({ path: require("path").join(__dirname, "../.env"), quiet: true });

const fs = require("fs/promises");
const path = require("path");
const mysql = require("mysql2/promise");

const PROJECT_ROOT = path.join(__dirname, "../..");
const SCHEMA_PATH = path.join(PROJECT_ROOT, "database/schema.sql");
const SEED_PATH = path.join(PROJECT_ROOT, "database/seed.sql");

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to reset database while NODE_ENV=production.");
  }

  if (process.env.CONFIRM_DB_RESET !== "YES") {
    throw new Error("Set CONFIRM_DB_RESET=YES to reset and reseed the local database.");
  }

  const database = process.env.DB_NAME || "se104_pc_store";
  assertSafeDatabaseName(database);
  const config = {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    charset: "utf8mb4",
    multipleStatements: true
  };

  const schemaSql = stripDatabaseDirectives(await fs.readFile(SCHEMA_PATH, "utf8"));
  const seedSql = stripDatabaseDirectives(await fs.readFile(SEED_PATH, "utf8"));
  const connection = await mysql.createConnection(config);

  try {
    if (database === "se104_pc_store") {
      console.warn("[db:reset] Warning: DB_NAME is se104_pc_store. This will reset your main local demo database.");
    }

    console.log(`[db:reset] Resetting database ${database}...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await connection.query(`
      CREATE DATABASE \`${database}\`
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci
    `);
    await connection.query(`USE \`${database}\``);
    await connection.query(schemaSql);
    await connection.query(seedSql);
    await printSummary(connection);
    console.log("[db:reset] Done.");
  } finally {
    await connection.end();
  }
}

function assertSafeDatabaseName(database) {
  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error("DB_NAME must contain only letters, numbers, and underscores.");
  }
}

function stripDatabaseDirectives(sql) {
  return sql
    .replace(/CREATE\s+DATABASE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?[A-Za-z0-9_]+`?(?:\s+CHARACTER\s+SET\s+\S+)?(?:\s+COLLATE\s+\S+)?\s*;/gi, "")
    .replace(/DROP\s+DATABASE\s+IF\s+EXISTS\s+`?[A-Za-z0-9_]+`?\s*;/gi, "")
    .replace(/USE\s+`?[A-Za-z0-9_]+`?\s*;/gi, "");
}

async function printSummary(connection) {
  const [rows] = await connection.query(`
    SELECT 'users' AS name, COUNT(*) AS total FROM users
    UNION ALL SELECT 'products', COUNT(*) FROM products
    UNION ALL SELECT 'orders', COUNT(*) FROM orders
    UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
    UNION ALL SELECT 'order_events', COUNT(*) FROM order_events
    UNION ALL SELECT 'serial_numbers', COUNT(*) FROM serial_numbers
    UNION ALL SELECT 'warranty_tickets', COUNT(*) FROM warranty_tickets
    UNION ALL SELECT 'product_reviews', COUNT(*) FROM product_reviews
    UNION ALL SELECT 'wishlists', COUNT(*) FROM wishlists
  `);

  console.log("[db:reset] Seed summary:");
  rows.forEach(function (row) {
    console.log(`[db:reset] - ${row.name}: ${Number(row.total || 0)}`);
  });
}

main().catch(function (error) {
  console.error(`[db:reset] ${error.message}`);
  process.exit(1);
});
