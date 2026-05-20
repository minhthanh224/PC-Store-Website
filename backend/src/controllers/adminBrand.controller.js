const pool = require("../config/database");

const STATUSES = ["active", "inactive"];

function validateBrand(body) {
  const name = (body.name || "").trim();
  const slug = (body.slug || "").trim();
  const status = body.status || "active";

  if (!name || !slug) {
    const error = new Error("Vui lòng nhập tên thương hiệu và slug.");
    error.statusCode = 400;
    throw error;
  }

  if (!STATUSES.includes(status)) {
    const error = new Error("Trạng thái thương hiệu không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }

  return {
    name,
    slug,
    description: body.description ? body.description.trim() : null,
    status
  };
}

async function ensureUniqueBrand(brand, currentId) {
  const params = [brand.name, brand.slug];
  let currentFilter = "";

  if (currentId) {
    currentFilter = "AND id <> ?";
    params.push(currentId);
  }

  const [rows] = await pool.execute(
    `SELECT id FROM brands WHERE (name = ? OR slug = ?) ${currentFilter} LIMIT 1`,
    params
  );

  if (rows.length > 0) {
    const error = new Error("Tên thương hiệu hoặc slug đã tồn tại.");
    error.statusCode = 409;
    throw error;
  }
}

async function getBrands(req, res) {
  const [brands] = await pool.execute(
    `
      SELECT id, name, slug, description, status, created_at, updated_at
      FROM brands
      ORDER BY name ASC
    `
  );

  res.json({
    success: true,
    data: brands
  });
}

async function createBrand(req, res) {
  const brand = validateBrand(req.body);
  await ensureUniqueBrand(brand);

  const [result] = await pool.execute(
    `
      INSERT INTO brands (name, slug, description, status)
      VALUES (?, ?, ?, ?)
    `,
    [brand.name, brand.slug, brand.description, brand.status]
  );

  res.status(201).json({
    success: true,
    message: "Tạo thương hiệu thành công.",
    data: {
      id: result.insertId,
      ...brand
    }
  });
}

async function updateBrand(req, res) {
  const id = Number(req.params.id);
  const brand = validateBrand(req.body);
  await ensureUniqueBrand(brand, id);

  const [result] = await pool.execute(
    `
      UPDATE brands
      SET name = ?, slug = ?, description = ?, status = ?
      WHERE id = ?
    `,
    [brand.name, brand.slug, brand.description, brand.status, id]
  );

  if (result.affectedRows === 0) {
    res.status(404).json({
      success: false,
      message: "Không tìm thấy thương hiệu."
    });
    return;
  }

  res.json({
    success: true,
    message: "Cập nhật thương hiệu thành công."
  });
}

async function updateBrandStatus(req, res) {
  const status = req.body.status;

  if (!STATUSES.includes(status)) {
    res.status(400).json({
      success: false,
      message: "Trạng thái thương hiệu không hợp lệ."
    });
    return;
  }

  const [result] = await pool.execute(
    "UPDATE brands SET status = ? WHERE id = ?",
    [status, Number(req.params.id)]
  );

  if (result.affectedRows === 0) {
    res.status(404).json({
      success: false,
      message: "Không tìm thấy thương hiệu."
    });
    return;
  }

  res.json({
    success: true,
    message: "Cập nhật trạng thái thương hiệu thành công."
  });
}

module.exports = {
  getBrands,
  createBrand,
  updateBrand,
  updateBrandStatus
};
