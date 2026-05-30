const pool = require("../config/database");
const { logAuditEvent } = require("../services/adminAudit.service");

const STATUSES = ["active", "inactive"];

function buildCategoryTree(categories) {
  const map = {};
  const roots = [];

  categories.forEach(function (category) {
    map[category.id] = {
      ...category,
      children: []
    };
  });

  categories.forEach(function (category) {
    if (category.parent_id && map[category.parent_id]) {
      map[category.parent_id].children.push(map[category.id]);
    } else {
      roots.push(map[category.id]);
    }
  });

  return roots;
}

function validateCategory(body, currentId) {
  const name = (body.name || "").trim();
  const slug = (body.slug || "").trim();
  const status = body.status || "active";
  const parentId = body.parent_id ? Number(body.parent_id) : null;

  if (!name || !slug) {
    const error = new Error("Vui lòng nhập tên danh mục và slug.");
    error.statusCode = 400;
    throw error;
  }

  if (!STATUSES.includes(status)) {
    const error = new Error("Trạng thái danh mục không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }

  if (currentId && parentId === Number(currentId)) {
    const error = new Error("Danh mục không thể là cha của chính nó.");
    error.statusCode = 400;
    throw error;
  }

  return {
    parent_id: parentId,
    name,
    slug,
    description: body.description ? body.description.trim() : null,
    status
  };
}

async function ensureCategoryReferences(category, currentId) {
  const params = [category.slug];
  let currentFilter = "";

  if (currentId) {
    currentFilter = "AND id <> ?";
    params.push(currentId);
  }

  const [duplicates] = await pool.execute(
    `SELECT id FROM categories WHERE slug = ? ${currentFilter} LIMIT 1`,
    params
  );

  if (duplicates.length > 0) {
    const error = new Error("Slug danh mục đã tồn tại.");
    error.statusCode = 409;
    throw error;
  }

  if (category.parent_id) {
    const [parents] = await pool.execute(
      "SELECT id FROM categories WHERE id = ? LIMIT 1",
      [category.parent_id]
    );

    if (parents.length === 0) {
      const error = new Error("Danh mục cha không tồn tại.");
      error.statusCode = 400;
      throw error;
    }
  }
}

async function getCategories(req, res) {
  const [categories] = await pool.execute(
    `
      SELECT id, parent_id, name, slug, description, status, created_at, updated_at
      FROM categories
      ORDER BY COALESCE(parent_id, id) ASC, parent_id IS NOT NULL ASC, id ASC
    `
  );

  res.json({
    success: true,
    data: req.query.tree === "true" ? buildCategoryTree(categories) : categories
  });
}

async function createCategory(req, res) {
  const category = validateCategory(req.body);
  await ensureCategoryReferences(category);

  const [result] = await pool.execute(
    `
      INSERT INTO categories (parent_id, name, slug, description, status)
      VALUES (?, ?, ?, ?, ?)
    `,
    [category.parent_id, category.name, category.slug, category.description, category.status]
  );

  await logAuditEvent(req, {
    action_type: "create_category",
    entity_type: "category",
    entity_id: result.insertId,
    entity_label: category.name,
    message: `Tạo danh mục ${category.name}.`,
    metadata: { slug: category.slug, parent_id: category.parent_id, status: category.status }
  });

  res.status(201).json({
    success: true,
    message: "Tạo danh mục thành công.",
    data: {
      id: result.insertId,
      ...category
    }
  });
}

async function updateCategory(req, res) {
  const id = Number(req.params.id);
  const category = validateCategory(req.body, id);
  await ensureCategoryReferences(category, id);

  const [result] = await pool.execute(
    `
      UPDATE categories
      SET parent_id = ?, name = ?, slug = ?, description = ?, status = ?
      WHERE id = ?
    `,
    [category.parent_id, category.name, category.slug, category.description, category.status, id]
  );

  if (result.affectedRows === 0) {
    res.status(404).json({
      success: false,
      message: "Không tìm thấy danh mục."
    });
    return;
  }

  await logAuditEvent(req, {
    action_type: "update_category",
    entity_type: "category",
    entity_id: id,
    entity_label: category.name,
    message: `Cập nhật danh mục ${category.name}.`,
    metadata: { slug: category.slug, parent_id: category.parent_id, status: category.status }
  });

  res.json({
    success: true,
    message: "Cập nhật danh mục thành công."
  });
}

async function updateCategoryStatus(req, res) {
  const status = req.body.status;

  if (!STATUSES.includes(status)) {
    res.status(400).json({
      success: false,
      message: "Trạng thái danh mục không hợp lệ."
    });
    return;
  }

  const [result] = await pool.execute(
    "UPDATE categories SET status = ? WHERE id = ?",
    [status, Number(req.params.id)]
  );

  if (result.affectedRows === 0) {
    res.status(404).json({
      success: false,
      message: "Không tìm thấy danh mục."
    });
    return;
  }

  await logAuditEvent(req, {
    action_type: "update_category_status",
    entity_type: "category",
    entity_id: req.params.id,
    message: `Cập nhật trạng thái danh mục #${req.params.id} thành ${status}.`,
    metadata: { status }
  });

  res.json({
    success: true,
    message: "Cập nhật trạng thái danh mục thành công."
  });
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus
};
