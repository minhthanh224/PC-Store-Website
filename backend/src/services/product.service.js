const pool = require("../config/database");
const { formatProduct } = require("../utils/formatProduct");
const { getAvailableStockExpression } = require("./stock.service");

const PRODUCT_TYPES = ["pc_build", "laptop", "component", "monitor", "accessory", "service"];
const SORT_OPTIONS = ["newest", "price_asc", "price_desc", "name_asc"];
const SPEC_FILTERS = [
  {
    key: "cpu",
    label: "CPU",
    matchKeys: ["cpu", "processor", "bo_xu_ly", "bộ xử lý"]
  },
  {
    key: "gpu",
    label: "GPU",
    matchKeys: ["gpu", "vga", "graphics", "card_do_hoa", "đồ họa"]
  },
  {
    key: "ram",
    label: "RAM",
    matchKeys: ["ram", "memory", "bo_nho", "bộ nhớ"]
  },
  {
    key: "storage",
    label: "SSD / Lưu trữ",
    matchKeys: ["storage", "ssd", "hdd", "luu_tru", "lưu trữ", "ổ cứng"]
  },
  {
    key: "display_size",
    label: "Màn hình",
    matchKeys: ["display_size", "screen_size", "màn hình", "man_hinh", "display"]
  },
  {
    key: "refresh_rate",
    label: "Tần số quét",
    matchKeys: ["refresh_rate", "tan_so_quet", "tần số quét"]
  },
  {
    key: "panel",
    label: "Tấm nền",
    matchKeys: ["panel", "tam_nen", "tấm nền"]
  }
];
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

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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

function normalizeSpecText(value) {
  return String(value || "").trim().toLowerCase();
}

function getSpecMatchValues(filter) {
  return filter.matchKeys.map(normalizeSpecText).filter(Boolean);
}

function buildSpecFilterCondition(filter) {
  const matchValues = getSpecMatchValues(filter);
  const placeholders = matchValues.map(function () {
    return "?";
  }).join(", ");

  return {
    clause: `
      EXISTS (
        SELECT 1
        FROM product_specs ps_filter
        WHERE ps_filter.product_id = p.id
          AND (
            LOWER(ps_filter.spec_key) IN (${placeholders})
            OR LOWER(COALESCE(ps_filter.spec_label, '')) IN (${placeholders})
          )
          AND ps_filter.spec_value = ?
      )
    `,
    params: matchValues.concat(matchValues)
  };
}

async function resolveCategoryIds(categoryValue) {
  const rawValue = String(categoryValue || "").trim();

  if (!rawValue) {
    return [];
  }

  const categoryId = Number(rawValue);
  const idParam = Number.isInteger(categoryId) ? categoryId : 0;

  const [rows] = await pool.execute(
    `
      WITH RECURSIVE category_tree AS (
        SELECT id
        FROM categories
        WHERE id = ? OR slug = ?
        UNION ALL
        SELECT child.id
        FROM categories child
        INNER JOIN category_tree parent ON parent.id = child.parent_id
      )
      SELECT DISTINCT id
      FROM category_tree
    `,
    [idParam, rawValue]
  );

  return rows.map(function (row) {
    return row.id;
  });
}

function formatSpecValue(spec) {
  const value = String(spec.spec_value || "").trim();
  const unit = String(spec.unit || "").trim();

  if (!value || !unit) {
    return value;
  }

  if (value.toLowerCase().endsWith(unit.toLowerCase())) {
    return value;
  }

  return `${value} ${unit}`;
}

async function buildProductFilters(query) {
  const where = ["p.status = 'active'"];
  const params = [];

  if (query.keyword) {
    const keyword = `%${query.keyword.trim()}%`;
    where.push("(p.name LIKE ? OR p.sku LIKE ? OR p.short_description LIKE ?)");
    params.push(keyword, keyword, keyword);
  }

  if (query.category) {
    const categoryIds = await resolveCategoryIds(query.category);

    if (!categoryIds.length) {
      where.push("1 = 0");
    } else {
      where.push(`p.category_id IN (${categoryIds.map(function () {
        return "?";
      }).join(", ")})`);
      params.push(...categoryIds);
    }
  }

  if (query.brand) {
    where.push("b.slug = ?");
    params.push(query.brand);
  }

  if (query.productType && PRODUCT_TYPES.includes(query.productType)) {
    where.push("p.product_type = ?");
    params.push(query.productType);
  } else {
    where.push("p.product_type <> 'service'");
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

  SPEC_FILTERS.forEach(function (filter) {
    const value = query[filter.key] ? String(query[filter.key]).trim() : "";

    if (!value) {
      return;
    }

    const condition = buildSpecFilterCondition(filter);
    where.push(condition.clause);
    params.push(...condition.params, value);
  });

  return {
    whereClause: where.join(" AND "),
    params
  };
}

function rowMatchesSpecFilter(row, filter) {
  const matchValues = getSpecMatchValues(filter);
  const specKey = normalizeSpecText(row.spec_key);
  const specLabel = normalizeSpecText(row.spec_label);

  return matchValues.includes(specKey) || matchValues.includes(specLabel);
}

async function getProductFilterOptions() {
  const allMatchValues = Array.from(new Set(SPEC_FILTERS.flatMap(getSpecMatchValues)));
  const placeholders = allMatchValues.map(function () {
    return "?";
  }).join(", ");

  const [rows] = await pool.execute(
    `
      SELECT DISTINCT
        ps.spec_key,
        COALESCE(NULLIF(ps.spec_label, ''), ps.spec_key) AS spec_label,
        ps.spec_value,
        ps.unit,
        ps.sort_order
      FROM product_specs ps
      INNER JOIN products p ON p.id = ps.product_id
      WHERE p.status = 'active'
        AND p.product_type <> 'service'
        AND ps.spec_value IS NOT NULL
        AND ps.spec_value <> ''
        AND (
          ps.filter_enabled = 1
          OR LOWER(ps.spec_key) IN (${placeholders})
          OR LOWER(COALESCE(ps.spec_label, '')) IN (${placeholders})
        )
      ORDER BY ps.sort_order ASC, ps.spec_value ASC
    `,
    allMatchValues.concat(allMatchValues)
  );

  return SPEC_FILTERS.map(function (filter) {
    const seenValues = new Set();
    const options = rows
      .filter(function (row) {
        return rowMatchesSpecFilter(row, filter);
      })
      .map(function (row) {
        const value = String(row.spec_value || "").trim();

        if (!value || seenValues.has(value)) {
          return null;
        }

        seenValues.add(value);
        return {
          value,
          label: formatSpecValue(row)
        };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return a.label.localeCompare(b.label, "vi", { numeric: true });
      });

    return {
      key: filter.key,
      label: filter.label,
      options
    };
  }).filter(function (filter) {
    return filter.options.length > 0;
  });
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
      SELECT product_id, spec_key, COALESCE(NULLIF(spec_label, ''), spec_key) AS spec_label, spec_value, unit
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
      specsByProduct[spec.product_id].push(`${spec.spec_label}: ${formatSpecValue(spec)}`);
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
  const { whereClause, params } = await buildProductFilters(query);

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
      SELECT
        id,
        spec_group,
        spec_key,
        COALESCE(NULLIF(spec_label, ''), spec_key) AS spec_label,
        spec_value,
        unit,
        compare_enabled,
        filter_enabled,
        sort_order
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
      label: spec.spec_label,
      value: spec.spec_value,
      unit: spec.unit,
      compare_enabled: Boolean(spec.compare_enabled),
      filter_enabled: Boolean(spec.filter_enabled),
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

async function getProductHighlights(productId) {
  const [rows] = await pool.execute(
    `
      SELECT id, title, description, icon, sort_order
      FROM product_highlights
      WHERE product_id = ?
      ORDER BY sort_order ASC, id ASC
    `,
    [productId]
  );

  return rows;
}

async function getProductCommitments(product) {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        scope_type,
        scope_value,
        title,
        description,
        icon,
        sort_order
      FROM commitments
      WHERE scope_type = 'global'
        OR (scope_type = 'product' AND scope_value IN (?, ?))
        OR (scope_type = 'category' AND scope_value IN (?, ?))
      ORDER BY
        CASE scope_type
          WHEN 'product' THEN 1
          WHEN 'category' THEN 2
          ELSE 3
        END ASC,
        sort_order ASC,
        id ASC
    `,
    [
      product.sku,
      String(product.id),
      product.category ? product.category.slug : "",
      product.category ? product.category.name : ""
    ]
  );

  return rows;
}

async function getProductPromotions(productId) {
  const [rows] = await pool.execute(
    `
      SELECT
        pr.id,
        pr.promo_code,
        pr.title,
        pr.description,
        pr.promo_type,
        pr.discount_type,
        pr.discount_value,
        pr.start_date,
        pr.end_date,
        pp.sort_order
      FROM product_promotions pp
      INNER JOIN promotions pr ON pr.id = pp.promotion_id
      WHERE pp.product_id = ?
        AND pr.status = 'active'
        AND (pr.start_date IS NULL OR pr.start_date <= CURRENT_DATE())
        AND (pr.end_date IS NULL OR pr.end_date >= CURRENT_DATE())
      ORDER BY pp.sort_order ASC, pr.id ASC
    `,
    [productId]
  );

  return rows.map(function (promotion) {
    return {
      ...promotion,
      discount_value: promotion.discount_value === null ? null : Number(promotion.discount_value)
    };
  });
}

async function getBundleOffers(productId) {
  const [rows] = await pool.execute(
    `
      SELECT
        bo.id,
        bo.title,
        bo.discount_type,
        bo.discount_value,
        bo.bundle_price,
        bo.sort_order,
        p.id AS addon_product_id,
        p.name AS addon_name,
        p.slug AS addon_slug,
        p.sku AS addon_sku,
        p.product_type AS addon_product_type,
        p.requires_serial AS addon_requires_serial,
        p.base_price AS addon_base_price,
        p.sale_price AS addon_sale_price,
        b.name AS addon_brand_name,
        c.name AS addon_category_name,
        c.slug AS addon_category_slug,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
          LIMIT 1
        ) AS addon_primary_image,
        ${getAvailableStockExpression("p")} AS addon_available_stock
      FROM bundle_offers bo
      INNER JOIN products p ON p.id = bo.addon_product_id
      LEFT JOIN brands b ON b.id = p.brand_id
      INNER JOIN categories c ON c.id = p.category_id
      WHERE bo.main_product_id = ?
        AND bo.status = 'active'
        AND p.status = 'active'
      ORDER BY bo.sort_order ASC, bo.id ASC
    `,
    [productId]
  );

  return rows.map(function (offer) {
    return {
      id: offer.id,
      title: offer.title,
      discount_type: offer.discount_type,
      discount_value: offer.discount_value === null ? null : Number(offer.discount_value),
      bundle_price: offer.bundle_price === null ? null : Number(offer.bundle_price),
      sort_order: offer.sort_order,
      addon_product: {
        id: offer.addon_product_id,
        name: offer.addon_name,
        slug: offer.addon_slug,
        sku: offer.addon_sku,
        product_type: offer.addon_product_type,
        requires_serial: Boolean(offer.addon_requires_serial),
        base_price: Number(offer.addon_base_price || 0),
        sale_price: offer.addon_sale_price === null ? null : Number(offer.addon_sale_price),
        primary_image: offer.addon_primary_image || null,
        brand_name: offer.addon_brand_name || null,
        category_name: offer.addon_category_name || null,
        category_slug: offer.addon_category_slug || null,
        available_stock: Number(offer.addon_available_stock || 0)
      }
    };
  });
}

async function getWarrantyPackages(productId) {
  const [rows] = await pool.execute(
    `
      SELECT
        wp.id,
        wp.package_code,
        wp.title,
        wp.duration_months,
        wp.price,
        wp.description,
        pwp.sort_order
      FROM product_warranty_packages pwp
      INNER JOIN warranty_packages wp ON wp.id = pwp.warranty_package_id
      WHERE pwp.product_id = ?
        AND wp.status = 'active'
      ORDER BY pwp.sort_order ASC, wp.id ASC
    `,
    [productId]
  );

  return rows.map(function (item) {
    return {
      ...item,
      price: Number(item.price || 0)
    };
  });
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
  const [images, specs, relatedProducts, highlights, commitments, promotions, bundleOffers, warrantyPackages] = await Promise.all([
    getProductImages(product.id),
    getProductSpecs(product.id),
    getRelatedProducts(product.id, product.category.id),
    getProductHighlights(product.id),
    getProductCommitments(product),
    getProductPromotions(product.id),
    getBundleOffers(product.id),
    getWarrantyPackages(product.id)
  ]);

  return {
    ...product,
    images,
    specs,
    related_products: relatedProducts,
    highlights,
    commitments,
    promotions,
    bundle_offers: bundleOffers,
    warranty_packages: warrantyPackages
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
      WHERE p.slug = ? AND p.status = 'active' AND pr.status IN ('approved', 'pending')
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
    throw createError("Vui lòng chọn đánh giá từ 1 đến 5 sao.", 400);
  }

  const [products] = await pool.execute(
    "SELECT id FROM products WHERE slug = ? AND status = 'active' LIMIT 1",
    [slug]
  );

  if (products.length === 0) {
    throw createError("Không tìm thấy sản phẩm đang bán.", 404);
  }

  const productId = products[0].id;
  const [completedOrders] = await pool.execute(
    `
      SELECT oi.id
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      WHERE o.user_id = ?
        AND o.status = 'completed'
        AND oi.product_id = ?
      LIMIT 1
    `,
    [userId, productId]
  );

  if (completedOrders.length === 0) {
    throw createError("Bạn chỉ có thể đánh giá sản phẩm đã mua và đã hoàn thành đơn hàng.", 403);
  }

  const [existingReviews] = await pool.execute(
    `
      SELECT id
      FROM product_reviews
      WHERE user_id = ? AND product_id = ?
      LIMIT 1
    `,
    [userId, productId]
  );

  if (existingReviews.length > 0) {
    throw createError("Bạn đã đánh giá sản phẩm này.", 409);
  }

  const [result] = await pool.execute(
    `
      INSERT INTO product_reviews (product_id, user_id, rating, comment, status)
      VALUES (?, ?, ?, ?, 'approved')
    `,
    [productId, userId, rating, comment]
  );

  return {
    id: result.insertId,
    status: "approved"
  };
}

module.exports = {
  getFeaturedProducts,
  getProducts,
  getProductFilterOptions,
  getProductBySlug,
  getProductReviews,
  createProductReview
};
