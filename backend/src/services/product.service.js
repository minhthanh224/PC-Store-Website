const pool = require("../config/database");
const { formatProduct } = require("../utils/formatProduct");
const { getAvailableStockExpression } = require("./stock.service");

const PRODUCT_TYPES = ["pc_build", "laptop", "component", "monitor", "accessory", "service"];
const SORT_OPTIONS = ["newest", "price_asc", "price_desc", "name_asc"];

const productCardSelect = `
  SELECT
    p.id,
    p.category_id,
    p.brand_id,
    p.sku,
    p.slug,
    p.name,
    p.product_type,
    p.short_description,
    p.description,
    p.base_price,
    p.sale_price,
    p.warranty_months,
    p.requires_serial,
    p.stock_quantity,
    p.status,
    p.is_featured,
    p.created_at,
    b.name AS brand_name,
    b.slug AS brand_slug,
    c.name AS category_name,
    c.slug AS category_slug,
    (
      SELECT pi.image_url
      FROM product_images pi
      WHERE pi.product_id = p.id
      ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
      LIMIT 1
    ) AS primary_image,
    ${getAvailableStockExpression("p")} AS available_stock
  FROM products p
  LEFT JOIN brands b ON b.id = p.brand_id
  INNER JOIN categories c ON c.id = p.category_id
`;

function normalizePositiveInteger(value, defaultValue, maxValue) {
  const number = Number(value);

  if (!Number.isInteger(number) || number < 1) {
    return defaultValue;
  }

  return Math.min(number, maxValue);
}

function normalizePrice(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  if (Number.isNaN(number) || number < 0) {
    return null;
  }

  return number;
}

function normalizeRequiresSerial(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (value === "true" || value === "1") {
    return 1;
  }

  if (value === "false" || value === "0") {
    return 0;
  }

  return null;
}

function getSortClause(sort) {
  if (sort === "price_asc") {
    return "ORDER BY COALESCE(p.sale_price, p.base_price) ASC, p.id DESC";
  }

  if (sort === "price_desc") {
    return "ORDER BY COALESCE(p.sale_price, p.base_price) DESC, p.id DESC";
  }

  if (sort === "name_asc") {
    return "ORDER BY p.name ASC, p.id DESC";
  }

  return "ORDER BY p.created_at DESC, p.id DESC";
}

function buildProductFilters(query) {
  const where = ["p.status = 'active'"];
  const params = [];

  if (query.keyword) {
    const keyword = `%${query.keyword.trim()}%`;
    where.push("(p.name LIKE ? OR p.sku LIKE ? OR p.short_description LIKE ?)");
    params.push(keyword, keyword, keyword);
  }

  if (query.category) {
    where.push(`
      p.category_id IN (
        SELECT child.id
        FROM categories child
        WHERE child.slug = ?
          OR child.parent_id = (
            SELECT parent.id
            FROM categories parent
            WHERE parent.slug = ?
            LIMIT 1
          )
      )
    `);
    params.push(query.category, query.category);
  }

  if (query.brand) {
    where.push("b.slug = ?");
    params.push(query.brand);
  }

  [
    ["cpu", "cpu"],
    ["ram", "ram"],
    ["vga", "vga"]
  ].forEach(function ([queryKey, specKey]) {
    if (query[queryKey]) {
      where.push(`EXISTS (
        SELECT 1
        FROM product_specs filter_spec
        WHERE filter_spec.product_id = p.id
          AND LOWER(filter_spec.spec_key) LIKE ?
          AND LOWER(filter_spec.spec_value) LIKE ?
      )`);
      params.push(`%${specKey}%`, `%${String(query[queryKey]).trim().toLowerCase()}%`);
    }
  });

  if (query.productType && PRODUCT_TYPES.includes(query.productType)) {
    where.push("p.product_type = ?");
    params.push(query.productType);
  }

  const minPrice = normalizePrice(query.minPrice);
  if (minPrice !== null) {
    where.push("COALESCE(p.sale_price, p.base_price) >= ?");
    params.push(minPrice);
  }

  const maxPrice = normalizePrice(query.maxPrice);
  if (maxPrice !== null) {
    where.push("COALESCE(p.sale_price, p.base_price) <= ?");
    params.push(maxPrice);
  }

  const requiresSerial = normalizeRequiresSerial(query.requiresSerial);
  if (requiresSerial !== null) {
    where.push("p.requires_serial = ?");
    params.push(requiresSerial);
  }

  return {
    whereClause: where.join(" AND "),
    params
  };
}

async function attachShortSpecs(products, limit = 4) {
  if (products.length === 0) {
    return products;
  }

  const productIds = products.map(function (product) {
    return product.id;
  });
  const placeholders = productIds.map(function () {
    return "?";
  }).join(", ");

  const [specRows] = await pool.execute(
    `
      SELECT product_id, spec_key, spec_value
      FROM product_specs
      WHERE product_id IN (${placeholders})
      ORDER BY product_id ASC, sort_order ASC, id ASC
    `,
    productIds
  );

  const specsByProduct = {};

  specRows.forEach(function (spec) {
    if (!specsByProduct[spec.product_id]) {
      specsByProduct[spec.product_id] = [];
    }

    if (specsByProduct[spec.product_id].length < limit) {
      specsByProduct[spec.product_id].push(`${spec.spec_key}: ${spec.spec_value}`);
    }
  });

  return products.map(function (product) {
    return {
      ...product,
      short_specs: specsByProduct[product.id] || []
    };
  });
}

async function getFeaturedProducts() {
  const [rows] = await pool.execute(
    `
      ${productCardSelect}
      WHERE p.status = 'active' AND p.is_featured = 1
      ORDER BY p.product_type ASC, p.created_at DESC, p.id DESC
    `
  );

  const productsWithSpecs = await attachShortSpecs(rows);
  return productsWithSpecs.map(formatProduct);
}

async function getProducts(query) {
  const page = normalizePositiveInteger(query.page, 1, 1000);
  const limit = normalizePositiveInteger(query.limit, 12, 48);
  const offset = (page - 1) * limit;
  const sort = SORT_OPTIONS.includes(query.sort) ? query.sort : "newest";
  const { whereClause, params } = buildProductFilters(query);

  const [[countRow]] = await pool.execute(
    `
      SELECT COUNT(*) AS total
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      INNER JOIN categories c ON c.id = p.category_id
      WHERE ${whereClause}
    `,
    params
  );

  const [rows] = await pool.execute(
    `
      ${productCardSelect}
      WHERE ${whereClause}
      ${getSortClause(sort)}
      LIMIT ? OFFSET ?
    `,
    params.concat([limit, offset])
  );

  const productsWithSpecs = await attachShortSpecs(rows);
  const total = Number(countRow.total);

  return {
    products: productsWithSpecs.map(formatProduct),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

async function getProductImages(productId) {
  const [rows] = await pool.execute(
    `
      SELECT id, image_url, alt_text, is_primary, sort_order
      FROM product_images
      WHERE product_id = ?
      ORDER BY is_primary DESC, sort_order ASC, id ASC
    `,
    [productId]
  );

  return rows.map(function (image) {
    return {
      ...image,
      is_primary: Boolean(image.is_primary)
    };
  });
}

async function getProductSpecs(productId) {
  const [rows] = await pool.execute(
    `
      SELECT id, spec_group, spec_key, spec_value, sort_order
      FROM product_specs
      WHERE product_id = ?
      ORDER BY sort_order ASC, id ASC
    `,
    [productId]
  );

  const groups = [];

  rows.forEach(function (spec) {
    const groupName = spec.spec_group || "Thông số";
    let group = groups.find(function (item) {
      return item.group === groupName;
    });

    if (!group) {
      group = {
        group: groupName,
        items: []
      };
      groups.push(group);
    }

    group.items.push({
      id: spec.id,
      key: spec.spec_key,
      value: spec.spec_value,
      sort_order: spec.sort_order
    });
  });

  return groups;
}

async function getRelatedProducts(productId, categoryId) {
  const [rows] = await pool.execute(
    `
      ${productCardSelect}
      WHERE p.status = 'active' AND p.category_id = ? AND p.id <> ?
      ORDER BY p.is_featured DESC, p.created_at DESC, p.id DESC
      LIMIT 4
    `,
    [categoryId, productId]
  );

  const productsWithSpecs = await attachShortSpecs(rows, 3);
  return productsWithSpecs.map(formatProduct);
}

async function getProductBySlug(slug) {
  const [rows] = await pool.execute(
    `
      ${productCardSelect}
      WHERE p.status = 'active' AND p.slug = ?
      LIMIT 1
    `,
    [slug]
  );

  if (rows.length === 0) {
    return null;
  }

  const productWithSpecs = await attachShortSpecs(rows);
  const product = formatProduct(productWithSpecs[0]);
  const [images, specs, relatedProducts] = await Promise.all([
    getProductImages(product.id),
    getProductSpecs(product.id),
    getRelatedProducts(product.id, product.category.id)
  ]);

  return {
    ...product,
    images,
    specs,
    related_products: relatedProducts
  };
}

async function getProductReviews(slug) {
  const [rows] = await pool.execute(
    `
      SELECT
        pr.id,
        pr.rating,
        pr.comment,
        pr.created_at,
        u.full_name AS reviewer_name
      FROM product_reviews pr
      INNER JOIN products p ON p.id = pr.product_id
      LEFT JOIN users u ON u.id = pr.user_id
      WHERE p.slug = ? AND p.status = 'active' AND pr.status = 'approved'
      ORDER BY pr.created_at DESC, pr.id DESC
    `,
    [slug]
  );

  return rows.map(function (review) {
    return {
      ...review,
      rating: Number(review.rating)
    };
  });
}

async function createProductReview(slug, userId, body) {
  const rating = Number(body.rating);
  const comment = body.comment ? String(body.comment).trim() : null;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    const error = new Error("Vui lòng chọn đánh giá từ 1 đến 5 sao.");
    error.statusCode = 400;
    throw error;
  }

  const [products] = await pool.execute(
    "SELECT id FROM products WHERE slug = ? AND status = 'active' LIMIT 1",
    [slug]
  );

  if (products.length === 0) {
    const error = new Error("Không tìm thấy sản phẩm đang bán.");
    error.statusCode = 404;
    throw error;
  }

  const [purchases] = await pool.execute(
    `
      SELECT oi.id
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = ? AND o.user_id = ? AND o.status = 'completed'
      LIMIT 1
    `,
    [products[0].id, userId]
  );

  if (purchases.length === 0) {
    const error = new Error("Chỉ khách hàng đã mua sản phẩm mới có thể gửi đánh giá.");
    error.statusCode = 403;
    throw error;
  }

  const [result] = await pool.execute(
    `
      INSERT INTO product_reviews (product_id, user_id, rating, comment, status)
      VALUES (?, ?, ?, ?, 'pending')
    `,
    [products[0].id, userId, rating, comment]
  );

  return {
    id: result.insertId,
    status: "pending"
  };
}

module.exports = {
  getFeaturedProducts,
  getProducts,
  getProductBySlug,
  getProductReviews,
  createProductReview
};
