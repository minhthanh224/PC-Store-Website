const pool = require("../config/database");

async function getBrands(req, res) {
  const [brands] = await pool.execute(
    `
      SELECT id, name, slug, description
      FROM brands
      WHERE status = 'active'
      ORDER BY name ASC
    `
  );

  res.json({
    success: true,
    data: brands
  });
}

module.exports = {
  getBrands
};
