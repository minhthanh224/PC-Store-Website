const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const pool = require("../src/config/database");

const MIN_SERIALS_PER_PRODUCT = Number(process.env.DEMO_SERIALS_PER_PRODUCT || 3);

function assertCanRun() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[db:seed-demo-serials] Refusing to seed demo serials in production.");
  }

  if (process.env.CONFIRM_DEMO_SERIALS !== "YES") {
    throw new Error("[db:seed-demo-serials] Set CONFIRM_DEMO_SERIALS=YES to insert demo serials.");
  }
}

function makeSerialCode(product, index) {
  const cleanSku = String(product.sku || `P${product.id}`)
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `DEMO-${cleanSku}-${String(index).padStart(3, "0")}`;
}

async function seedDemoSerials() {
  assertCanRun();

  const connection = await pool.getConnection();
  let inserted = 0;

  try {
    await connection.beginTransaction();

    const [products] = await connection.execute(
      `
        SELECT
          p.id,
          p.sku,
          p.name,
          COALESCE(SUM(CASE WHEN sn.status = 'in_stock' THEN 1 ELSE 0 END), 0) AS in_stock_count
        FROM products p
        LEFT JOIN serial_numbers sn ON sn.product_id = p.id
        WHERE p.requires_serial = 1
          AND p.status = 'active'
        GROUP BY p.id
        ORDER BY p.id ASC
      `
    );

    for (const product of products) {
      const missingCount = Math.max(MIN_SERIALS_PER_PRODUCT - Number(product.in_stock_count || 0), 0);

      for (let i = 1; i <= missingCount; i += 1) {
        const serialCode = makeSerialCode(product, Number(product.in_stock_count || 0) + i);

        await connection.execute(
          `
            INSERT IGNORE INTO serial_numbers (product_id, serial_code, status, import_date, note)
            VALUES (?, ?, 'in_stock', CURRENT_DATE(), ?)
          `,
          [product.id, serialCode, "Demo serial generated for local SE104 testing."]
        );
        inserted += 1;
      }
    }

    await connection.commit();
    console.log(`[db:seed-demo-serials] Products checked: ${products.length}`);
    console.log(`[db:seed-demo-serials] Serial rows inserted: ${inserted}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

seedDemoSerials().catch(function (error) {
  console.error(error.message);
  process.exit(1);
});
