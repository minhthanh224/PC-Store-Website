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
  const config = {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    charset: "utf8mb4",
    multipleStatements: true
  };

  const schemaSql = rewriteDatabaseName(await fs.readFile(SCHEMA_PATH, "utf8"), database);
  const seedSql = rewriteDatabaseName(await fs.readFile(SEED_PATH, "utf8"), database);
  const connection = await mysql.createConnection(config);

  try {
    console.log(`[db:reset] Resetting database ${database}...`);
    await connection.query(schemaSql);
    await connection.query(seedSql);
    console.log("[db:reset] Done.");
  } finally {
    await connection.end();
  }
}

function rewriteDatabaseName(sql, database) {
  if (database === "se104_pc_store") {
    return sql;
  }

  return sql.replace(/\bse104_pc_store\b/g, database);
}

main().catch(function (error) {
  console.error(`[db:reset] ${error.message}`);
  process.exit(1);
});
