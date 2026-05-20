const pool = require("../config/database");

function buildCategoryTree(categories) {
  const categoryMap = {};
  const roots = [];

  categories.forEach(function (category) {
    categoryMap[category.id] = {
      ...category,
      children: []
    };
  });

  categories.forEach(function (category) {
    const item = categoryMap[category.id];

    if (category.parent_id && categoryMap[category.parent_id]) {
      categoryMap[category.parent_id].children.push(item);
    } else {
      roots.push(item);
    }
  });

  return roots;
}

async function getCategories(req, res) {
  const [categories] = await pool.execute(
    `
      SELECT id, parent_id, name, slug, description
      FROM categories
      WHERE status = 'active'
      ORDER BY COALESCE(parent_id, id) ASC, parent_id IS NOT NULL ASC, id ASC
    `
  );

  if (req.query.tree === "true") {
    res.json({
      success: true,
      data: buildCategoryTree(categories)
    });
    return;
  }

  res.json({
    success: true,
    data: categories
  });
}

module.exports = {
  getCategories
};
