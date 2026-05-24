const pool = require("../config/database");

const PRODUCT_TYPES = ["pc_build", "laptop", "component", "monitor", "accessory", "service"];
const STATUSES = ["active", "inactive"];

const adminProductSelect = `
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
    p.updated_at,
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
    CASE
      WHEN p.requires_serial = 1 THEN (
        SELECT COUNT(*)
        FROM serial_numbers sn
        WHERE sn.product_id = p.id AND sn.status = 'in_stock'
      )
      ELSE p.stock_quantity
    END AS available_stock
  FROM products p
  LEFT JOIN brands b ON b.id = p.brand_id
  INNER JOIN categories c ON c.id = p.category_id
`;

function toInteger(value, fieldName, minValue) {
  const number = Number(value);

  if (!Number.isInteger(number) || number < minValue) {
    const error = new Error(`${fieldName} không hợp lệ.`);
    error.statusCode = 400;
    throw error;
  }

  return number;
}

function toPrice(value, fieldName, nullable) {
  if ((value === null || value === undefined || value === "") && nullable) {
    return null;
  }

  const number = Number(value);

  if (Number.isNaN(number) || number < 0) {
    const error = new Error(`${fieldName} không hợp lệ.`);
    error.statusCode = 400;
    throw error;
  }

  return number;
}

function toBoolean(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function formatAdminProduct(product) {
  return {
    ...product,
    base_price: Number(product.base_price),
    sale_price: product.sale_price === null ? null : Number(product.sale_price),
    requires_serial: Boolean(product.requires_serial),
    is_featured: Boolean(product.is_featured),
    available_stock: Number(product.available_stock || 0)
  };
}

function normalizeProductBody(body) {
  const name = (body.name || "").trim();
  const sku = (body.sku || "").trim();
  const slug = (body.slug || "").trim();
  const productType = body.product_type;
  const status = body.status || "active";
  const requiresSerial = toBoolean(body.requires_serial);
  const stockQuantity = requiresSerial ? 0 : toInteger(body.stock_quantity || 0, "Tồn kho", 0);

  if (!name || !sku || !slug) {
    const error = new Error("Vui lòng nhập tên sản phẩm, SKU và slug.");
    error.statusCode = 400;
    throw error;
  }

  if (!PRODUCT_TYPES.includes(productType)) {
    const error = new Error("Loại sản phẩm không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }

  if (!STATUSES.includes(status)) {
    const error = new Error("Trạng thái sản phẩm không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }

  return {
    category_id: toInteger(body.category_id, "Danh mục", 1),
    brand_id: body.brand_id ? toInteger(body.brand_id, "Thương hiệu", 1) : null,
    sku,
    slug,
    name,
    product_type: productType,
    short_description: body.short_description ? body.short_description.trim() : null,
    description: body.description ? body.description.trim() : null,
    base_price: toPrice(body.base_price, "Giá bán", false),
    sale_price: toPrice(body.sale_price, "Giá khuyến mãi", true),
    warranty_months: toInteger(body.warranty_months || 0, "Bảo hành", 0),
    requires_serial: requiresSerial ? 1 : 0,
    stock_quantity: stockQuantity,
    status,
    is_featured: toBoolean(body.is_featured) ? 1 : 0,
    images: Array.isArray(body.images) ? body.images : [],
    specs: Array.isArray(body.specs) ? body.specs : []
  };
}

async function ensureReferences(connection, product) {
  const [categories] = await connection.execute(
    "SELECT id FROM categories WHERE id = ? LIMIT 1",
    [product.category_id]
  );

  if (categories.length === 0) {
    const error = new Error("Danh mục không tồn tại.");
    error.statusCode = 400;
    throw error;
  }

  if (product.brand_id) {
    const [brands] = await connection.execute(
      "SELECT id FROM brands WHERE id = ? LIMIT 1",
      [product.brand_id]
    );

    if (brands.length === 0) {
      const error = new Error("Thương hiệu không tồn tại.");
      error.statusCode = 400;
      throw error;
    }
  }
}

async function ensureUniqueSkuSlug(connection, product, currentProductId) {
  const params = [product.sku, product.slug];
  let currentFilter = "";

  if (currentProductId) {
    currentFilter = "AND id <> ?";
    params.push(currentProductId);
  }

  const [rows] = await connection.execute(
    `
      SELECT sku, slug
      FROM products
      WHERE (sku = ? OR slug = ?) ${currentFilter}
      LIMIT 1
    `,
    params
  );

  if (rows.length > 0) {
    const error = new Error("SKU hoặc slug đã được sử dụng.");
    error.statusCode = 409;
    throw error;
  }
}

async function replaceImages(connection, productId, images) {
  await connection.execute("DELETE FROM product_images WHERE product_id = ?", [productId]);

  for (const image of images) {
    if (!image.image_url || !String(image.image_url).trim()) {
      continue;
    }

    await connection.execute(
      `
        INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        productId,
        String(image.image_url).trim(),
        image.alt_text ? String(image.alt_text).trim() : null,
        toBoolean(image.is_primary) ? 1 : 0,
        Number.isInteger(Number(image.sort_order)) ? Number(image.sort_order) : 0
      ]
    );
  }
}

async function replaceSpecs(connection, productId, specs) {
  await connection.execute("DELETE FROM product_specs WHERE product_id = ?", [productId]);

  for (const spec of specs) {
    if (!spec.spec_key || !spec.spec_value) {
      continue;
    }

    await connection.execute(
      `
        INSERT INTO product_specs (product_id, spec_group, spec_key, spec_value, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        productId,
        spec.spec_group ? String(spec.spec_group).trim() : null,
        String(spec.spec_key).trim(),
        String(spec.spec_value).trim(),
        Number.isInteger(Number(spec.sort_order)) ? Number(spec.sort_order) : 0
      ]
    );
  }
}

function buildFilters(query) {
  const where = ["1 = 1"];
  const params = [];

  if (query.keyword) {
    const keyword = `%${query.keyword.trim()}%`;
    where.push("(p.name LIKE ? OR p.sku LIKE ? OR p.slug LIKE ?)");
    params.push(keyword, keyword, keyword);
  }

  if (query.category) {
    if (Number.isInteger(Number(query.category))) {
      where.push("p.category_id = ?");
      params.push(Number(query.category));
    } else {
      where.push("c.slug = ?");
      params.push(query.category);
    }
  }

  if (query.brand) {
    if (Number.isInteger(Number(query.brand))) {
      where.push("p.brand_id = ?");
      params.push(Number(query.brand));
    } else {
      where.push("b.slug = ?");
      params.push(query.brand);
    }
  }

  if (query.productType && PRODUCT_TYPES.includes(query.productType)) {
    where.push("p.product_type = ?");
    params.push(query.productType);
  }

  if (query.status && STATUSES.includes(query.status)) {
    where.push("p.status = ?");
    params.push(query.status);
  }

  if (query.requiresSerial === "true" || query.requiresSerial === "1") {
    where.push("p.requires_serial = 1");
  }

  if (query.requiresSerial === "false" || query.requiresSerial === "0") {
    where.push("p.requires_serial = 0");
  }

  return {
    whereClause: where.join(" AND "),
    params
  };
}

function normalizePagination(query) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 12, 1), 100);

  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
}

async function getProducts(query) {
  const { whereClause, params } = buildFilters(query);
  const { page, limit, offset } = normalizePagination(query);
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
      ${adminProductSelect}
      WHERE ${whereClause}
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ? OFFSET ?
    `,
    params.concat([limit, offset])
  );

  const total = Number(countRow.total);

  return {
    products: rows.map(formatAdminProduct),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

async function getProductById(id) {
  const [rows] = await pool.execute(
    `${adminProductSelect} WHERE p.id = ? LIMIT 1`,
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  const [images] = await pool.execute(
    `
      SELECT id, image_url, alt_text, is_primary, sort_order
      FROM product_images
      WHERE product_id = ?
      ORDER BY sort_order ASC, id ASC
    `,
    [id]
  );
  const [specs] = await pool.execute(
    `
      SELECT id, spec_group, spec_key, spec_value, sort_order
      FROM product_specs
      WHERE product_id = ?
      ORDER BY sort_order ASC, id ASC
    `,
    [id]
  );

  return {
    ...formatAdminProduct(rows[0]),
    images: images.map(function (image) {
      return {
        ...image,
        is_primary: Boolean(image.is_primary)
      };
    }),
    specs
  };
}

async function createProduct(body) {
  const product = normalizeProductBody(body);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await ensureReferences(connection, product);
    await ensureUniqueSkuSlug(connection, product);

    const [result] = await connection.execute(
      `
        INSERT INTO products (
          category_id, brand_id, sku, slug, name, product_type, short_description, description,
          base_price, sale_price, warranty_months, requires_serial, stock_quantity, status, is_featured
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        product.category_id,
        product.brand_id,
        product.sku,
        product.slug,
        product.name,
        product.product_type,
        product.short_description,
        product.description,
        product.base_price,
        product.sale_price,
        product.warranty_months,
        product.requires_serial,
        product.stock_quantity,
        product.status,
        product.is_featured
      ]
    );

    await replaceImages(connection, result.insertId, product.images);
    await replaceSpecs(connection, result.insertId, product.specs);
    await connection.commit();

    return getProductById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateProduct(id, body) {
  const product = normalizeProductBody(body);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.execute("SELECT id FROM products WHERE id = ? LIMIT 1", [id]);
    if (existing.length === 0) {
      const error = new Error("Không tìm thấy sản phẩm.");
      error.statusCode = 404;
      throw error;
    }

    await ensureReferences(connection, product);
    await ensureUniqueSkuSlug(connection, product, id);

    await connection.execute(
      `
        UPDATE products
        SET
          category_id = ?,
          brand_id = ?,
          sku = ?,
          slug = ?,
          name = ?,
          product_type = ?,
          short_description = ?,
          description = ?,
          base_price = ?,
          sale_price = ?,
          warranty_months = ?,
          requires_serial = ?,
          stock_quantity = ?,
          status = ?,
          is_featured = ?
        WHERE id = ?
      `,
      [
        product.category_id,
        product.brand_id,
        product.sku,
        product.slug,
        product.name,
        product.product_type,
        product.short_description,
        product.description,
        product.base_price,
        product.sale_price,
        product.warranty_months,
        product.requires_serial,
        product.stock_quantity,
        product.status,
        product.is_featured,
        id
      ]
    );

    await replaceImages(connection, id, product.images);
    await replaceSpecs(connection, id, product.specs);
    await connection.commit();

    return getProductById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateProductStatus(id, status) {
  if (!STATUSES.includes(status)) {
    const error = new Error("Trạng thái sản phẩm không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }

  const [result] = await pool.execute(
    "UPDATE products SET status = ? WHERE id = ?",
    [status, id]
  );

  if (result.affectedRows === 0) {
    const error = new Error("Không tìm thấy sản phẩm.");
    error.statusCode = 404;
    throw error;
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
  PRODUCT_TYPES,
  STATUSES
};
