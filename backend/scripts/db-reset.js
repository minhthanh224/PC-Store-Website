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
    await connection.query(`
      CREATE DATABASE IF NOT EXISTS \`${database}\`
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci
    `);
    await connection.query(`USE \`${database}\``);
    await connection.query(schemaSql);
    await connection.query(seedSql);
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
    .replace(/CREATE\s+DATABASE\s+IF\s+NOT\s+EXISTS\s+`?[A-Za-z0-9_]+`?\s+CHARACTER\s+SET\s+utf8mb4\s+COLLATE\s+utf8mb4_unicode_ci\s*;/gi, "")
    .replace(/USE\s+`?[A-Za-z0-9_]+`?\s*;/gi, "");
}

main().catch(function (error) {
  console.error(`[db:reset] ${error.message}`);
  process.exit(1);
});
