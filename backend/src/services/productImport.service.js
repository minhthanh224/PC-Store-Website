const path = require("path");
const fs = require("fs/promises");
const AdmZip = require("adm-zip");
const { parse } = require("csv-parse/sync");
const pool = require("../config/database");

const FRONTEND_ROOT = path.join(__dirname, "../../../frontend");
const PRODUCT_IMAGE_PUBLIC_ROOT = "assets/images/products";
const PRODUCT_IMAGE_TARGET_ROOT = path.join(FRONTEND_ROOT, PRODUCT_IMAGE_PUBLIC_ROOT);
const REQUIRED_FILES = ["products.csv"];
const OPTIONAL_CSV_FILES = [
  "product_images.csv",
  "product_specs.csv",
  "product_highlights.csv",
  "commitments.csv",
  "promotions.csv",
  "product_promotions.csv",
  "bundle_offers.csv",
  "warranty_packages.csv",
  "product_warranty_packages.csv"
];
const PRODUCT_TYPES = ["pc_build", "laptop", "component", "monitor", "accessory", "service"];
const PRODUCT_STATUSES = ["active", "inactive"];
const IMAGE_TYPES = ["main", "gallery", "spec", "banner", "thumbnail"];
const IMAGE_EXTENSIONS = [".webp", ".jpg", ".jpeg", ".png"];
const PROMO_TYPES = ["voucher", "gift", "installment", "event", "bundle"];
const PROMO_DISCOUNT_TYPES = ["percent", "fixed", "gift", "none"];
const BUNDLE_DISCOUNT_TYPES = ["percent", "fixed", "none"];
const IMPORT_MODES = ["strict", "updateBySlug", "replaceCatalog"];
const RESET_CONFIRM_TEXT = "RESET CATALOG";

function createValidationIssue(file, line, field, message, details) {
  return {
    file,
    line: line || null,
    field: field || null,
    message,
    ...(details || {})
  };
}

function clean(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function normalizeBoolean(value, defaultValue) {
  const raw = clean(value).toLowerCase();

  if (!raw && defaultValue !== undefined) {
    return defaultValue;
  }

  if (["true", "1", "yes", "y", "co", "có"].includes(raw)) {
    return true;
  }

  if (["false", "0", "no", "n", "khong", "không"].includes(raw)) {
    return false;
  }

  return null;
}

function normalizeNumber(value, defaultValue) {
  const raw = clean(value);

  if (!raw && defaultValue !== undefined) {
    return defaultValue;
  }

  if (!raw) {
    return null;
  }

  const number = Number(raw.replace(/[,\s]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function normalizeDate(value) {
  const raw = clean(value);

  if (!raw) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return false;
  }

  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) {
    return false;
  }

  return raw;
}

function slugify(value, fallback) {
  const source = clean(value) || clean(fallback);
  const slug = source
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "aerotech-item";
}

function normalizeImportOptions(options) {
  const rawMode = clean(options && options.importMode) || "strict";
  const importMode = IMPORT_MODES.includes(rawMode) ? rawMode : "strict";

  return {
    importMode,
    confirmReset: clean(options && options.confirmReset)
  };
}

function normalizeZipEntryName(name) {
  const rawName = String(name || "");

  if (!rawName || rawName.includes("\\") || rawName.startsWith("/") || /^[a-z]:/i.test(rawName)) {
    return null;
  }

  const segments = rawName.replace(/^\.\/+/, "").split("/");

  if (segments.some(function (segment) {
    return segment === ".." || segment === "";
  })) {
    return null;
  }

  return segments.join("/");
}

function normalizeCsvPath(filePath) {
  const rawPath = clean(filePath);

  if (!rawPath || rawPath.includes("\\") || rawPath.startsWith("/") || /^[a-z]:/i.test(rawPath)) {
    return null;
  }

  const segments = rawPath.replace(/^\.\/+/, "").split("/");

  if (segments.some(function (segment) {
    return segment === ".." || segment === "";
  })) {
    return null;
  }

  return segments.join("/");
}

function buildZipEntryMap(zipBuffer, errors) {
  let zip;

  try {
    zip = new AdmZip(zipBuffer);
  } catch (error) {
    errors.push(createValidationIssue("zip", null, null, "File upload không phải zip hợp lệ."));
    return {
      entries: [],
      byRelativePath: new Map()
    };
  }

  const entries = [];

  zip.getEntries().forEach(function (entry) {
    if (entry.isDirectory) {
      return;
    }

    const safeName = normalizeZipEntryName(entry.entryName);

    if (!safeName) {
      errors.push(createValidationIssue("zip", null, "path", `Đường dẫn không an toàn trong zip: ${entry.entryName}`));
      return;
    }

    entries.push({
      entry,
      safeName
    });
  });

  let rootPrefix = "";
  const namesWithFolder = entries.filter(function (item) {
    return item.safeName.includes("/");
  });

  if (entries.length > 0 && namesWithFolder.length === entries.length) {
    const firstSegment = entries[0].safeName.split("/")[0];
    const sameRoot = entries.every(function (item) {
      return item.safeName.split("/")[0] === firstSegment;
    });

    if (sameRoot) {
      rootPrefix = `${firstSegment}/`;
    }
  }

  const byRelativePath = new Map();

  entries.forEach(function (item) {
    const relativePath = rootPrefix && item.safeName.startsWith(rootPrefix)
      ? item.safeName.slice(rootPrefix.length)
      : item.safeName;

    item.relativePath = relativePath;
    byRelativePath.set(relativePath.toLowerCase(), item.entry);
  });

  return {
    entries,
    byRelativePath
  };
}

function readCsvRows(entry, fileName, errors) {
  if (!entry) {
    return [];
  }

  try {
    const parsed = parse(entry.getData().toString("utf8"), {
      bom: true,
      columns: function (headers) {
        return headers.map(function (header) {
          return clean(header);
        });
      },
      skip_empty_lines: true,
      info: true,
      relax_column_count: true
    });

    return parsed.map(function (item) {
      return {
        ...item.record,
        __line: item.info.lines
      };
    });
  } catch (error) {
    errors.push(createValidationIssue(fileName, null, null, `Không đọc được CSV: ${error.message}`));
    return [];
  }
}

function requireColumns(rows, fileName, columns, errors) {
  if (!rows.length) {
    return;
  }

  columns.forEach(function (column) {
    if (!Object.prototype.hasOwnProperty.call(rows[0], column)) {
      errors.push(createValidationIssue(fileName, 1, column, `Thiếu cột ${column}.`));
    }
  });
}

function warnMissingOptionalColumns(rows, fileName, columns, warnings) {
  if (!rows.length) {
    return;
  }

  columns.forEach(function (column) {
    if (!Object.prototype.hasOwnProperty.call(rows[0], column)) {
      warnings.push(createValidationIssue(fileName, 1, column, `Thiếu cột ${column}; hệ thống sẽ dùng giá trị mặc định.`));
    }
  });
}

function getEntryForCsvPath(byRelativePath, filePath) {
  const normalizedPath = normalizeCsvPath(filePath);

  if (!normalizedPath) {
    return null;
  }

  return byRelativePath.get(normalizedPath.toLowerCase()) || null;
}

function getImagePublicPath(imagePath, sku) {
  const normalizedPath = normalizeCsvPath(imagePath);
  const segments = normalizedPath.split("/");
  let imageRelativePath;

  if (segments[0].toLowerCase() === "images") {
    imageRelativePath = segments.slice(1).join("/");
  } else {
    imageRelativePath = `${slugify(sku, sku)}/${segments[segments.length - 1]}`;
  }

  if (!imageRelativePath.includes("/")) {
    imageRelativePath = `${slugify(sku, sku)}/${imageRelativePath}`;
  }

  return `${PRODUCT_IMAGE_PUBLIC_ROOT}/${imageRelativePath}`;
}

async function loadExistingProducts(skus, slugs) {
  const skuList = Array.from(new Set(skus.filter(Boolean)));
  const slugList = Array.from(new Set(slugs.filter(Boolean)));
  const params = [];
  const clauses = [];

  if (skuList.length) {
    clauses.push(`sku IN (${skuList.map(function () { return "?"; }).join(", ")})`);
    params.push(...skuList);
  }

  if (slugList.length) {
    clauses.push(`slug IN (${slugList.map(function () { return "?"; }).join(", ")})`);
    params.push(...slugList);
  }

  if (!clauses.length) {
    return {
      bySku: new Map(),
      bySlug: new Map(),
      byId: new Map()
    };
  }

  const [rows] = await pool.execute(
    `
      SELECT id, sku, slug, name
      FROM products
      WHERE ${clauses.join(" OR ")}
    `,
    params
  );

  return {
    bySku: new Map(rows.map(function (row) { return [row.sku, row]; })),
    bySlug: new Map(rows.map(function (row) { return [row.slug, row]; })),
    byId: new Map(rows.map(function (row) { return [Number(row.id), row]; }))
  };
}

async function loadExistingPromotions(codes) {
  const codeList = Array.from(new Set(codes.filter(Boolean)));

  if (!codeList.length) {
    return new Map();
  }

  const [rows] = await pool.execute(
    `
      SELECT id, promo_code
      FROM promotions
      WHERE promo_code IN (${codeList.map(function () { return "?"; }).join(", ")})
    `,
    codeList
  );

  return new Map(rows.map(function (row) {
    return [row.promo_code, row];
  }));
}

async function loadExistingWarrantyPackages(codes) {
  const codeList = Array.from(new Set(codes.filter(Boolean)));

  if (!codeList.length) {
    return new Map();
  }

  const [rows] = await pool.execute(
    `
      SELECT id, package_code
      FROM warranty_packages
      WHERE package_code IN (${codeList.map(function () { return "?"; }).join(", ")})
    `,
    codeList
  );

  return new Map(rows.map(function (row) {
    return [row.package_code, row];
  }));
}

async function getCatalogDependencyCounts() {
  const [rows] = await pool.execute(
    `
      SELECT 'orders' AS name, COUNT(*) AS total FROM order_items
      UNION ALL
      SELECT 'serial_numbers' AS name, COUNT(*) AS total FROM serial_numbers
      UNION ALL
      SELECT 'warranty_tickets' AS name, COUNT(*) AS total FROM warranty_tickets
      UNION ALL
      SELECT 'product_reviews' AS name, COUNT(*) AS total FROM product_reviews
      UNION ALL
      SELECT 'wishlists' AS name, COUNT(*) AS total FROM wishlists
    `
  );

  return rows.reduce(function (counts, row) {
    counts[row.name] = Number(row.total || 0);
    return counts;
  }, {});
}

function validateProducts(rows, byRelativePath, errors, warnings) {
  const products = [];
  const seenSkus = new Set();
  const seenSlugs = new Set();

  rows.forEach(function (row) {
    const line = row.__line;
    const rawSku = String(row.sku || "");
    const sku = clean(row.sku);
    const name = clean(row.name);
    let slug = clean(row.slug);
    const brand = clean(row.brand);
    const category = clean(row.category);
    const subcategory = clean(row.subcategory);
    const productType = clean(row.product_type);
    const basePrice = normalizeNumber(row.base_price);
    const salePrice = normalizeNumber(row.sale_price, null);
    const warrantyMonths = normalizeNumber(row.warranty_months, 0);
    const requiresSerial = normalizeBoolean(row.requires_serial, false);
    const stockQuantity = normalizeNumber(row.stock_quantity, 0);
    const status = clean(row.status) || "active";
    const isFeatured = normalizeBoolean(row.is_featured, false);
    const primaryImage = clean(row.primary_image);

    if (!sku) {
      errors.push(createValidationIssue("products.csv", line, "sku", "SKU là bắt buộc."));
    } else {
      if (rawSku !== sku) {
        errors.push(createValidationIssue("products.csv", line, "sku", "SKU không được có khoảng trắng đầu/cuối."));
      }

      if (/[\/\\.]/.test(sku)) {
        errors.push(createValidationIssue("products.csv", line, "sku", "SKU không được chứa /, \\, hoặc dấu chấm."));
      }

      if (seenSkus.has(sku)) {
        errors.push(createValidationIssue("products.csv", line, "sku", `SKU bị trùng trong file: ${sku}.`));
      }

      seenSkus.add(sku);
    }

    if (!name) {
      errors.push(createValidationIssue("products.csv", line, "name", "Tên sản phẩm là bắt buộc."));
    }

    if (!slug) {
      slug = slugify(name, sku);
      warnings.push(createValidationIssue("products.csv", line, "slug", `Slug trống, hệ thống sẽ dùng ${slug}.`));
    }

    if (seenSlugs.has(slug)) {
      errors.push(createValidationIssue("products.csv", line, "slug", `Slug bị trùng trong file: ${slug}.`));
    }

    seenSlugs.add(slug);

    if (!brand) {
      errors.push(createValidationIssue("products.csv", line, "brand", "Brand là bắt buộc."));
    }

    if (!category) {
      errors.push(createValidationIssue("products.csv", line, "category", "Category là bắt buộc."));
    }

    if (!PRODUCT_TYPES.includes(productType)) {
      errors.push(createValidationIssue("products.csv", line, "product_type", `product_type không hợp lệ: ${productType}.`));
    }

    if (basePrice === null || basePrice < 0) {
      errors.push(createValidationIssue("products.csv", line, "base_price", "base_price phải là số >= 0."));
    }

    if (salePrice !== null && salePrice < 0) {
      errors.push(createValidationIssue("products.csv", line, "sale_price", "sale_price phải là số >= 0."));
    }

    if (salePrice !== null && basePrice !== null && salePrice > basePrice) {
      errors.push(createValidationIssue("products.csv", line, "sale_price", "sale_price không được lớn hơn base_price."));
    }

    if (warrantyMonths === null || warrantyMonths < 0 || !Number.isInteger(warrantyMonths)) {
      errors.push(createValidationIssue("products.csv", line, "warranty_months", "warranty_months phải là số nguyên >= 0."));
    }

    if (requiresSerial === null) {
      errors.push(createValidationIssue("products.csv", line, "requires_serial", "requires_serial phải là TRUE/FALSE."));
    }

    if (stockQuantity === null || stockQuantity < 0 || !Number.isInteger(stockQuantity)) {
      errors.push(createValidationIssue("products.csv", line, "stock_quantity", "stock_quantity phải là số nguyên >= 0."));
    }

    if (!PRODUCT_STATUSES.includes(status)) {
      errors.push(createValidationIssue("products.csv", line, "status", `status không hợp lệ: ${status}.`));
    }

    if (primaryImage) {
      const safeImagePath = normalizeCsvPath(primaryImage);
      const ext = safeImagePath ? path.extname(safeImagePath).toLowerCase() : "";

      if (!safeImagePath) {
        errors.push(createValidationIssue("products.csv", line, "primary_image", "primary_image có đường dẫn không an toàn."));
      } else if (!IMAGE_EXTENSIONS.includes(ext)) {
        errors.push(createValidationIssue("products.csv", line, "primary_image", "primary_image phải là file .webp, .jpg, .jpeg hoặc .png."));
      } else if (!getEntryForCsvPath(byRelativePath, safeImagePath)) {
        errors.push(createValidationIssue("products.csv", line, "primary_image", `Không tìm thấy ảnh trong zip: ${safeImagePath}.`));
      }
    }

    if (requiresSerial === true && stockQuantity > 0) {
      warnings.push(createValidationIssue("products.csv", line, "stock_quantity", "Sản phẩm quản lý theo serial sẽ dùng tồn theo serial; stock_quantity vật lý được lưu là 0."));
    }

    if (productType === "service" && stockQuantity > 0) {
      warnings.push(createValidationIssue("products.csv", line, "stock_quantity", "Sản phẩm dịch vụ không dùng tồn vật lý; stock_quantity sẽ được lưu là 0."));
    }

    products.push({
      line,
      sku,
      name,
      slug,
      brand,
      category,
      subcategory,
      product_type: productType,
      short_description: clean(row.short_description) || null,
      description: clean(row.description) || null,
      base_price: basePrice,
      sale_price: salePrice,
      warranty_months: warrantyMonths,
      requires_serial: requiresSerial === true,
      stock_quantity: requiresSerial === true || productType === "service" ? 0 : stockQuantity,
      status,
      is_featured: isFeatured === true,
      featured_section: clean(row.featured_section) || null,
      primary_image: primaryImage
    });
  });

  return products;
}

function hasProductReference(sku, productsBySku, existingProductsBySku) {
  return Boolean(productsBySku.get(sku) || existingProductsBySku.get(sku));
}

function validateProductReference(fileName, row, fieldName, sku, productsBySku, existingProductsBySku, errors) {
  if (!sku) {
    errors.push(createValidationIssue(fileName, row.__line, fieldName, `${fieldName} là bắt buộc.`));
    return false;
  }

  if (!hasProductReference(sku, productsBySku, existingProductsBySku)) {
    errors.push(createValidationIssue(fileName, row.__line, fieldName, `SKU không tồn tại trong products.csv hoặc database: ${sku}.`));
    return false;
  }

  return true;
}

function validateImages(rows, productsBySku, existingProductsBySku, byRelativePath, errors, warnings) {
  const images = [];
  const primaryBySku = new Map();

  rows.forEach(function (row) {
    const line = row.__line;
    const sku = clean(row.sku);
    const imagePath = clean(row.image_path);
    const altText = clean(row.alt_text);
    const isPrimary = normalizeBoolean(row.is_primary, false);
    const sortOrder = normalizeNumber(row.sort_order, 0);
    const imageType = clean(row.image_type) || "gallery";

    validateProductReference("product_images.csv", row, "sku", sku, productsBySku, existingProductsBySku, errors);

    if (!imagePath) {
      errors.push(createValidationIssue("product_images.csv", line, "image_path", "image_path là bắt buộc."));
    }

    const safeImagePath = normalizeCsvPath(imagePath);
    const ext = safeImagePath ? path.extname(safeImagePath).toLowerCase() : "";

    if (imagePath && !safeImagePath) {
      errors.push(createValidationIssue("product_images.csv", line, "image_path", "image_path có đường dẫn không an toàn."));
    } else if (imagePath && !IMAGE_EXTENSIONS.includes(ext)) {
      errors.push(createValidationIssue("product_images.csv", line, "image_path", "Ảnh phải là .webp, .jpg, .jpeg hoặc .png."));
    } else if (imagePath && !getEntryForCsvPath(byRelativePath, safeImagePath)) {
      errors.push(createValidationIssue("product_images.csv", line, "image_path", `Không tìm thấy ảnh trong zip: ${safeImagePath}.`));
    }

    if (isPrimary === null) {
      errors.push(createValidationIssue("product_images.csv", line, "is_primary", "is_primary phải là TRUE/FALSE."));
    }

    if (sortOrder === null || !Number.isInteger(sortOrder)) {
      errors.push(createValidationIssue("product_images.csv", line, "sort_order", "sort_order phải là số nguyên."));
    }

    if (!IMAGE_TYPES.includes(imageType)) {
      errors.push(createValidationIssue("product_images.csv", line, "image_type", `image_type không hợp lệ: ${imageType}.`));
    }

    if (isPrimary === true) {
      primaryBySku.set(sku, true);
    }

    images.push({
      line,
      sku,
      image_path: safeImagePath || imagePath,
      image_url: safeImagePath ? getImagePublicPath(safeImagePath, sku) : "",
      alt_text: altText,
      is_primary: isPrimary === true,
      sort_order: sortOrder || 0,
      image_type: imageType
    });
  });

  productsBySku.forEach(function (product, sku) {
    if (product.primary_image) {
      const normalizedPrimaryImage = normalizeCsvPath(product.primary_image);
      const exists = images.some(function (image) {
        return image.sku === sku && image.image_path === normalizedPrimaryImage;
      });

      if (!exists) {
        images.push({
          line: product.line,
          sku,
          image_path: normalizedPrimaryImage,
          image_url: getImagePublicPath(product.primary_image, sku),
          alt_text: product.name,
          is_primary: true,
          sort_order: 0,
          image_type: "main"
        });
      }

      primaryBySku.set(sku, true);
    }
  });

  productsBySku.forEach(function (product, sku) {
    if (!primaryBySku.get(sku)) {
      warnings.push(createValidationIssue("product_images.csv", product.line, "is_primary", `Sản phẩm ${sku} chưa có primary image; frontend sẽ dùng fallback.`));
    }
  });

  return images;
}

function validateSpecs(rows, productsBySku, existingProductsBySku, errors, warnings) {
  const specs = [];

  rows.forEach(function (row) {
    const line = row.__line;
    const sku = clean(row.sku);
    const specGroup = clean(row.spec_group);
    const specKey = clean(row.spec_key);
    const specLabel = clean(row.spec_label) || specKey;
    const specValue = clean(row.spec_value);
    const unit = clean(row.unit);
    const sortOrder = normalizeNumber(row.sort_order, 0);
    const compareEnabled = normalizeBoolean(row.compare_enabled, true);
    const filterEnabled = normalizeBoolean(row.filter_enabled, false);

    validateProductReference("product_specs.csv", row, "sku", sku, productsBySku, existingProductsBySku, errors);

    if (!specGroup) {
      errors.push(createValidationIssue("product_specs.csv", line, "spec_group", "spec_group là bắt buộc."));
    }

    if (!specKey) {
      errors.push(createValidationIssue("product_specs.csv", line, "spec_key", "spec_key là bắt buộc."));
    } else if (!/^[a-z0-9_-]+$/.test(specKey)) {
      warnings.push(createValidationIssue("product_specs.csv", line, "spec_key", "spec_key nên dùng lowercase, số, gạch ngang hoặc gạch dưới."));
    }

    if (!specValue) {
      errors.push(createValidationIssue("product_specs.csv", line, "spec_value", "spec_value là bắt buộc."));
    }

    if (sortOrder === null || !Number.isInteger(sortOrder)) {
      errors.push(createValidationIssue("product_specs.csv", line, "sort_order", "sort_order phải là số nguyên."));
    }

    if (compareEnabled === null) {
      errors.push(createValidationIssue("product_specs.csv", line, "compare_enabled", "compare_enabled phải là TRUE/FALSE."));
    }

    if (filterEnabled === null) {
      errors.push(createValidationIssue("product_specs.csv", line, "filter_enabled", "filter_enabled phải là TRUE/FALSE."));
    }

    specs.push({
      line,
      sku,
      spec_group: specGroup,
      spec_key: specKey,
      spec_label: specLabel,
      spec_value: specValue,
      unit: unit || null,
      sort_order: sortOrder || 0,
      compare_enabled: compareEnabled,
      filter_enabled: filterEnabled
    });
  });

  return specs;
}

function validateHighlights(rows, productsBySku, existingProductsBySku, errors) {
  return rows.map(function (row) {
    const sku = clean(row.sku);
    const title = clean(row.title);
    const sortOrder = normalizeNumber(row.sort_order, 0);

    validateProductReference("product_highlights.csv", row, "sku", sku, productsBySku, existingProductsBySku, errors);

    if (!title) {
      errors.push(createValidationIssue("product_highlights.csv", row.__line, "title", "title là bắt buộc."));
    }

    if (sortOrder === null || !Number.isInteger(sortOrder)) {
      errors.push(createValidationIssue("product_highlights.csv", row.__line, "sort_order", "sort_order phải là số nguyên."));
    }

    return {
      line: row.__line,
      sku,
      title,
      description: clean(row.description) || null,
      icon: clean(row.icon) || null,
      sort_order: sortOrder || 0
    };
  });
}

function validateCommitments(rows, productsBySku, existingProductsBySku, errors) {
  const scopeTypes = ["global", "category", "product"];

  return rows.map(function (row) {
    const scopeType = clean(row.scope_type) || "global";
    const scopeValue = clean(row.scope_value);
    const title = clean(row.title);
    const sortOrder = normalizeNumber(row.sort_order, 0);

    if (!scopeTypes.includes(scopeType)) {
      errors.push(createValidationIssue("commitments.csv", row.__line, "scope_type", `scope_type không hợp lệ: ${scopeType}.`));
    }

    if (scopeType === "product") {
      validateProductReference("commitments.csv", row, "scope_value", scopeValue, productsBySku, existingProductsBySku, errors);
    }

    if (scopeType === "category" && !scopeValue) {
      errors.push(createValidationIssue("commitments.csv", row.__line, "scope_value", "scope_value là bắt buộc khi scope_type=category."));
    }

    if (!title) {
      errors.push(createValidationIssue("commitments.csv", row.__line, "title", "title là bắt buộc."));
    }

    if (sortOrder === null || !Number.isInteger(sortOrder)) {
      errors.push(createValidationIssue("commitments.csv", row.__line, "sort_order", "sort_order phải là số nguyên."));
    }

    return {
      line: row.__line,
      scope_type: scopeType,
      scope_value: scopeType === "global" ? null : scopeValue,
      title,
      description: clean(row.description) || null,
      icon: clean(row.icon) || null,
      sort_order: sortOrder || 0
    };
  });
}

function validatePromotions(rows, errors, warnings) {
  const seenCodes = new Set();
  const today = new Date().toISOString().slice(0, 10);

  return rows.map(function (row) {
    const promoCode = clean(row.promo_code);
    const title = clean(row.title);
    const promoType = clean(row.promo_type) || "event";
    const discountType = clean(row.discount_type) || "none";
    const discountValue = normalizeNumber(row.discount_value, null);
    const startDate = normalizeDate(row.start_date);
    const endDate = normalizeDate(row.end_date);
    const status = clean(row.status) || "active";

    if (!promoCode) {
      errors.push(createValidationIssue("promotions.csv", row.__line, "promo_code", "promo_code là bắt buộc."));
    } else if (seenCodes.has(promoCode)) {
      errors.push(createValidationIssue("promotions.csv", row.__line, "promo_code", `promo_code bị trùng trong file: ${promoCode}.`));
    }
    seenCodes.add(promoCode);

    if (!title) {
      errors.push(createValidationIssue("promotions.csv", row.__line, "title", "title là bắt buộc."));
    }

    if (!PROMO_TYPES.includes(promoType)) {
      errors.push(createValidationIssue("promotions.csv", row.__line, "promo_type", `promo_type không hợp lệ: ${promoType}.`));
    }

    if (!PROMO_DISCOUNT_TYPES.includes(discountType)) {
      errors.push(createValidationIssue("promotions.csv", row.__line, "discount_type", `discount_type không hợp lệ: ${discountType}.`));
    }

    if (discountValue !== null && discountValue < 0) {
      errors.push(createValidationIssue("promotions.csv", row.__line, "discount_value", "discount_value phải là số >= 0."));
    }

    if (startDate === false) {
      errors.push(createValidationIssue("promotions.csv", row.__line, "start_date", "start_date phải theo định dạng YYYY-MM-DD."));
    }

    if (endDate === false) {
      errors.push(createValidationIssue("promotions.csv", row.__line, "end_date", "end_date phải theo định dạng YYYY-MM-DD."));
    }

    if (!PRODUCT_STATUSES.includes(status)) {
      errors.push(createValidationIssue("promotions.csv", row.__line, "status", `status không hợp lệ: ${status}.`));
    }

    if (endDate && endDate < today) {
      warnings.push(createValidationIssue("promotions.csv", row.__line, "end_date", `Promotion ${promoCode} đã hết hạn.`));
    }

    return {
      line: row.__line,
      promo_code: promoCode,
      title,
      description: clean(row.description) || null,
      promo_type: promoType,
      discount_type: discountType,
      discount_value: discountValue,
      start_date: startDate || null,
      end_date: endDate || null,
      status
    };
  });
}

function validateProductPromotions(rows, productsBySku, existingProductsBySku, promotionCodes, existingPromotions, errors) {
  return rows.map(function (row) {
    const sku = clean(row.sku);
    const promoCode = clean(row.promo_code);
    const sortOrder = normalizeNumber(row.sort_order, 0);

    validateProductReference("product_promotions.csv", row, "sku", sku, productsBySku, existingProductsBySku, errors);

    if (!promoCode) {
      errors.push(createValidationIssue("product_promotions.csv", row.__line, "promo_code", "promo_code là bắt buộc."));
    } else if (!promotionCodes.has(promoCode) && !existingPromotions.has(promoCode)) {
      errors.push(createValidationIssue("product_promotions.csv", row.__line, "promo_code", `promo_code không tồn tại trong promotions.csv hoặc database: ${promoCode}.`));
    }

    if (sortOrder === null || !Number.isInteger(sortOrder)) {
      errors.push(createValidationIssue("product_promotions.csv", row.__line, "sort_order", "sort_order phải là số nguyên."));
    }

    return {
      line: row.__line,
      sku,
      promo_code: promoCode,
      sort_order: sortOrder || 0
    };
  });
}

function validateBundleOffers(rows, productsBySku, existingProductsBySku, errors) {
  return rows.map(function (row) {
    const mainSku = clean(row.main_sku);
    const addonSku = clean(row.addon_sku);
    const title = clean(row.title);
    const discountType = clean(row.discount_type) || "none";
    const discountValue = normalizeNumber(row.discount_value, null);
    const bundlePrice = normalizeNumber(row.bundle_price, null);
    const sortOrder = normalizeNumber(row.sort_order, 0);

    validateProductReference("bundle_offers.csv", row, "main_sku", mainSku, productsBySku, existingProductsBySku, errors);
    validateProductReference("bundle_offers.csv", row, "addon_sku", addonSku, productsBySku, existingProductsBySku, errors);

    if (!title) {
      errors.push(createValidationIssue("bundle_offers.csv", row.__line, "title", "title là bắt buộc."));
    }

    if (!BUNDLE_DISCOUNT_TYPES.includes(discountType)) {
      errors.push(createValidationIssue("bundle_offers.csv", row.__line, "discount_type", `discount_type không hợp lệ: ${discountType}.`));
    }

    if (discountValue !== null && discountValue < 0) {
      errors.push(createValidationIssue("bundle_offers.csv", row.__line, "discount_value", "discount_value phải là số >= 0."));
    }

    if (bundlePrice !== null && bundlePrice < 0) {
      errors.push(createValidationIssue("bundle_offers.csv", row.__line, "bundle_price", "bundle_price phải là số >= 0."));
    }

    if (sortOrder === null || !Number.isInteger(sortOrder)) {
      errors.push(createValidationIssue("bundle_offers.csv", row.__line, "sort_order", "sort_order phải là số nguyên."));
    }

    return {
      line: row.__line,
      main_sku: mainSku,
      addon_sku: addonSku,
      title,
      discount_type: discountType,
      discount_value: discountValue,
      bundle_price: bundlePrice,
      sort_order: sortOrder || 0
    };
  });
}

function validateWarrantyPackages(rows, errors) {
  const seenCodes = new Set();

  return rows.map(function (row) {
    const packageCode = clean(row.package_code);
    const title = clean(row.title);
    const durationMonths = normalizeNumber(row.duration_months, 0);
    const price = normalizeNumber(row.price, 0);
    const status = clean(row.status) || "active";

    if (!packageCode) {
      errors.push(createValidationIssue("warranty_packages.csv", row.__line, "package_code", "package_code là bắt buộc."));
    } else if (seenCodes.has(packageCode)) {
      errors.push(createValidationIssue("warranty_packages.csv", row.__line, "package_code", `package_code bị trùng trong file: ${packageCode}.`));
    }
    seenCodes.add(packageCode);

    if (!title) {
      errors.push(createValidationIssue("warranty_packages.csv", row.__line, "title", "title là bắt buộc."));
    }

    if (durationMonths === null || durationMonths < 0 || !Number.isInteger(durationMonths)) {
      errors.push(createValidationIssue("warranty_packages.csv", row.__line, "duration_months", "duration_months phải là số nguyên >= 0."));
    }

    if (price === null || price < 0) {
      errors.push(createValidationIssue("warranty_packages.csv", row.__line, "price", "price phải là số >= 0."));
    }

    if (!PRODUCT_STATUSES.includes(status)) {
      errors.push(createValidationIssue("warranty_packages.csv", row.__line, "status", `status không hợp lệ: ${status}.`));
    }

    return {
      line: row.__line,
      package_code: packageCode,
      title,
      duration_months: durationMonths,
      price,
      description: clean(row.description) || null,
      status
    };
  });
}

function validateProductWarrantyPackages(rows, productsBySku, existingProductsBySku, warrantyPackageCodes, existingWarrantyPackages, errors) {
  return rows.map(function (row) {
    const sku = clean(row.sku);
    const packageCode = clean(row.package_code);
    const sortOrder = normalizeNumber(row.sort_order, 0);

    validateProductReference("product_warranty_packages.csv", row, "sku", sku, productsBySku, existingProductsBySku, errors);

    if (!packageCode) {
      errors.push(createValidationIssue("product_warranty_packages.csv", row.__line, "package_code", "package_code là bắt buộc."));
    } else if (!warrantyPackageCodes.has(packageCode) && !existingWarrantyPackages.has(packageCode)) {
      errors.push(createValidationIssue("product_warranty_packages.csv", row.__line, "package_code", `package_code không tồn tại trong warranty_packages.csv hoặc database: ${packageCode}.`));
    }

    if (sortOrder === null || !Number.isInteger(sortOrder)) {
      errors.push(createValidationIssue("product_warranty_packages.csv", row.__line, "sort_order", "sort_order phải là số nguyên."));
    }

    return {
      line: row.__line,
      sku,
      package_code: packageCode,
      sort_order: sortOrder || 0
    };
  });
}

function resolveProductTargets(products, existingProducts, options, errors, warnings) {
  const conflictSummary = {
    mode: options.importMode,
    strictConflictCount: 0,
    updateBySlugCount: 0,
    updateBySkuCount: 0,
    createCount: 0,
    slugConflicts: []
  };

  products.forEach(function (product) {
    const skuOwner = existingProducts.bySku.get(product.sku);
    const slugOwner = existingProducts.bySlug.get(product.slug);

    product.import_action = "create";
    product.final_sku = product.sku;
    product.target_product_id = null;

    if (options.importMode === "replaceCatalog") {
      conflictSummary.createCount += 1;
      return;
    }

    if (skuOwner && slugOwner && Number(skuOwner.id) !== Number(slugOwner.id)) {
      errors.push(createValidationIssue(
        "products.csv",
        product.line,
        "slug",
        `CSV SKU ${product.sku} đang trỏ product ${skuOwner.slug}, nhưng slug ${product.slug} thuộc SKU ${slugOwner.sku}.`,
        { csvSku: product.sku, dbSku: slugOwner.sku, conflictType: "sku_slug_cross_match" }
      ));
      conflictSummary.strictConflictCount += 1;
      conflictSummary.slugConflicts.push({ slug: product.slug, csvSku: product.sku, dbSku: slugOwner.sku });
      return;
    }

    if (skuOwner) {
      product.import_action = "updateBySku";
      product.target_product_id = skuOwner.id;
      product.final_sku = skuOwner.sku;
      conflictSummary.updateBySkuCount += 1;
      return;
    }

    if (slugOwner) {
      conflictSummary.slugConflicts.push({ slug: product.slug, csvSku: product.sku, dbSku: slugOwner.sku });

      if (options.importMode === "updateBySlug") {
        product.import_action = "updateBySlug";
        product.target_product_id = slugOwner.id;
        product.final_sku = slugOwner.sku;
        product.slug_matched_sku = slugOwner.sku;
        conflictSummary.updateBySlugCount += 1;
        warnings.push(createValidationIssue(
          "products.csv",
          product.line,
          "slug",
          `File import dùng SKU mới ${product.sku} nhưng DB đang có SKU ${slugOwner.sku} cho cùng slug. Hệ thống sẽ cập nhật product hiện có và giữ SKU ${slugOwner.sku}.`,
          { csvSku: product.sku, dbSku: slugOwner.sku, conflictType: "slug_match_keep_sku" }
        ));
        return;
      }

      errors.push(createValidationIssue(
        "products.csv",
        product.line,
        "slug",
        `Slug ${product.slug} đã tồn tại với SKU ${slugOwner.sku}. Bật updateBySlug nếu muốn cập nhật product hiện có và giữ SKU cũ.`,
        { csvSku: product.sku, dbSku: slugOwner.sku, conflictType: "slug_conflict" }
      ));
      conflictSummary.strictConflictCount += 1;
      return;
    }

    conflictSummary.createCount += 1;
  });

  return conflictSummary;
}

function addMissingOptionalFileWarnings(byRelativePath, warnings) {
  OPTIONAL_CSV_FILES.forEach(function (fileName) {
    if (!byRelativePath.has(fileName.toLowerCase())) {
      warnings.push(createValidationIssue(fileName, null, null, `Không có ${fileName}, bỏ qua phần dữ liệu tương ứng.`));
    }
  });
}

function getCsvEntry(byRelativePath, fileName) {
  return byRelativePath.get(fileName.toLowerCase()) || null;
}

function collectReferencedSkus(rowsByFile, products) {
  return Array.from(new Set([
    ...products.map(function (product) { return product.sku; }),
    ...rowsByFile.productImages.map(function (row) { return clean(row.sku); }),
    ...rowsByFile.productSpecs.map(function (row) { return clean(row.sku); }),
    ...rowsByFile.productHighlights.map(function (row) { return clean(row.sku); }),
    ...rowsByFile.commitments.filter(function (row) { return clean(row.scope_type) === "product"; }).map(function (row) { return clean(row.scope_value); }),
    ...rowsByFile.productPromotions.map(function (row) { return clean(row.sku); }),
    ...rowsByFile.bundleOffers.map(function (row) { return clean(row.main_sku); }),
    ...rowsByFile.bundleOffers.map(function (row) { return clean(row.addon_sku); }),
    ...rowsByFile.productWarrantyPackages.map(function (row) { return clean(row.sku); })
  ].filter(Boolean)));
}

async function analyzeZip(zipBuffer, rawOptions) {
  const options = normalizeImportOptions(rawOptions);
  const errors = [];
  const warnings = [];
  const { byRelativePath } = buildZipEntryMap(zipBuffer, errors);

  REQUIRED_FILES.forEach(function (fileName) {
    if (!byRelativePath.has(fileName.toLowerCase())) {
      errors.push(createValidationIssue(fileName, null, null, `Zip thiếu ${fileName}.`));
    }
  });

  addMissingOptionalFileWarnings(byRelativePath, warnings);

  if (options.importMode === "replaceCatalog") {
    if (process.env.NODE_ENV === "production") {
      errors.push(createValidationIssue("import", null, "importMode", "replaceCatalog bị chặn khi NODE_ENV=production."));
    }

    if (options.confirmReset !== RESET_CONFIRM_TEXT) {
      errors.push(createValidationIssue("import", null, "confirmReset", `Vui lòng nhập ${RESET_CONFIRM_TEXT} để xác nhận reset catalog.`));
    } else {
      warnings.push(createValidationIssue("import", null, "importMode", "Chế độ này sẽ xóa catalog hiện tại trước khi import. Chỉ dùng cho demo/dev."));
    }
  }

  const rowsByFile = {
    products: readCsvRows(getCsvEntry(byRelativePath, "products.csv"), "products.csv", errors),
    productImages: readCsvRows(getCsvEntry(byRelativePath, "product_images.csv"), "product_images.csv", errors),
    productSpecs: readCsvRows(getCsvEntry(byRelativePath, "product_specs.csv"), "product_specs.csv", errors),
    productHighlights: readCsvRows(getCsvEntry(byRelativePath, "product_highlights.csv"), "product_highlights.csv", errors),
    commitments: readCsvRows(getCsvEntry(byRelativePath, "commitments.csv"), "commitments.csv", errors),
    promotions: readCsvRows(getCsvEntry(byRelativePath, "promotions.csv"), "promotions.csv", errors),
    productPromotions: readCsvRows(getCsvEntry(byRelativePath, "product_promotions.csv"), "product_promotions.csv", errors),
    bundleOffers: readCsvRows(getCsvEntry(byRelativePath, "bundle_offers.csv"), "bundle_offers.csv", errors),
    warrantyPackages: readCsvRows(getCsvEntry(byRelativePath, "warranty_packages.csv"), "warranty_packages.csv", errors),
    productWarrantyPackages: readCsvRows(getCsvEntry(byRelativePath, "product_warranty_packages.csv"), "product_warranty_packages.csv", errors)
  };

  requireColumns(rowsByFile.products, "products.csv", [
    "sku",
    "name",
    "slug",
    "brand",
    "category",
    "subcategory",
    "product_type",
    "short_description",
    "description",
    "base_price",
    "sale_price",
    "warranty_months",
    "requires_serial",
    "stock_quantity",
    "status",
    "is_featured",
    "featured_section",
    "primary_image"
  ], errors);
  requireColumns(rowsByFile.productImages, "product_images.csv", ["sku", "image_path", "alt_text", "is_primary", "sort_order", "image_type"], errors);
  requireColumns(rowsByFile.productSpecs, "product_specs.csv", ["sku", "spec_group", "spec_key", "spec_value"], errors);
  warnMissingOptionalColumns(rowsByFile.productSpecs, "product_specs.csv", ["spec_label", "unit", "sort_order", "compare_enabled", "filter_enabled"], warnings);
  requireColumns(rowsByFile.productHighlights, "product_highlights.csv", ["sku", "title", "description", "icon", "sort_order"], errors);
  requireColumns(rowsByFile.commitments, "commitments.csv", ["scope_type", "scope_value", "title", "description", "icon", "sort_order"], errors);
  requireColumns(rowsByFile.promotions, "promotions.csv", ["promo_code", "title", "description", "promo_type", "discount_type", "discount_value", "start_date", "end_date", "status"], errors);
  requireColumns(rowsByFile.productPromotions, "product_promotions.csv", ["sku", "promo_code", "sort_order"], errors);
  requireColumns(rowsByFile.bundleOffers, "bundle_offers.csv", ["main_sku", "addon_sku", "title", "discount_type", "discount_value", "bundle_price", "sort_order"], errors);
  requireColumns(rowsByFile.warrantyPackages, "warranty_packages.csv", ["package_code", "title", "duration_months", "price", "description", "status"], errors);
  requireColumns(rowsByFile.productWarrantyPackages, "product_warranty_packages.csv", ["sku", "package_code", "sort_order"], errors);

  const products = validateProducts(rowsByFile.products, byRelativePath, errors, warnings);
  const referencedSkus = collectReferencedSkus(rowsByFile, products);
  const existingProducts = options.importMode === "replaceCatalog"
    ? { bySku: new Map(), bySlug: new Map(), byId: new Map() }
    : await loadExistingProducts(referencedSkus, products.map(function (product) { return product.slug; }));
  const productsBySku = new Map(products.filter(function (product) {
    return product.sku;
  }).map(function (product) {
    return [product.sku, product];
  }));
  const conflictSummary = resolveProductTargets(products, existingProducts, options, errors, warnings);
  const promotionCodes = new Set(rowsByFile.promotions.map(function (row) {
    return clean(row.promo_code);
  }).filter(Boolean));
  const warrantyPackageCodes = new Set(rowsByFile.warrantyPackages.map(function (row) {
    return clean(row.package_code);
  }).filter(Boolean));
  const existingPromotions = options.importMode === "replaceCatalog"
    ? new Map()
    : await loadExistingPromotions([
        ...promotionCodes,
        ...rowsByFile.productPromotions.map(function (row) { return clean(row.promo_code); })
      ]);
  const existingWarrantyPackages = options.importMode === "replaceCatalog"
    ? new Map()
    : await loadExistingWarrantyPackages([
        ...warrantyPackageCodes,
        ...rowsByFile.productWarrantyPackages.map(function (row) { return clean(row.package_code); })
      ]);

  let dependencyCounts = {};
  if (options.importMode === "replaceCatalog") {
    dependencyCounts = await getCatalogDependencyCounts();
    const blockingDependencies = Object.entries(dependencyCounts).filter(function (entry) {
      return entry[1] > 0;
    });

    if (blockingDependencies.length) {
      errors.push(createValidationIssue(
        "import",
        null,
        "replaceCatalog",
        "Không thể reset catalog vì database đang có đơn hàng/serial/bảo hành/review/wishlist liên quan sản phẩm. Hãy dùng db:reset cho môi trường dev nếu muốn reset toàn bộ dữ liệu demo.",
        { dependencyCounts }
      ));
    }
  }

  const images = validateImages(rowsByFile.productImages, productsBySku, existingProducts.bySku, byRelativePath, errors, warnings);
  const specs = validateSpecs(rowsByFile.productSpecs, productsBySku, existingProducts.bySku, errors, warnings);
  const highlights = validateHighlights(rowsByFile.productHighlights, productsBySku, existingProducts.bySku, errors);
  const commitments = validateCommitments(rowsByFile.commitments, productsBySku, existingProducts.bySku, errors);
  const promotions = validatePromotions(rowsByFile.promotions, errors, warnings);
  const productPromotions = validateProductPromotions(rowsByFile.productPromotions, productsBySku, existingProducts.bySku, promotionCodes, existingPromotions, errors);
  const bundleOffers = validateBundleOffers(rowsByFile.bundleOffers, productsBySku, existingProducts.bySku, errors);
  const warrantyPackages = validateWarrantyPackages(rowsByFile.warrantyPackages, errors);
  const productWarrantyPackages = validateProductWarrantyPackages(rowsByFile.productWarrantyPackages, productsBySku, existingProducts.bySku, warrantyPackageCodes, existingWarrantyPackages, errors);

  return {
    zipBuffer,
    byRelativePath,
    options,
    products,
    images,
    specs,
    highlights,
    commitments,
    promotions,
    productPromotions,
    bundleOffers,
    warrantyPackages,
    productWarrantyPackages,
    rowsByFile,
    existingProducts,
    dependencyCounts,
    conflictSummary,
    errors,
    warnings,
    skippedFiles: [],
    skippedOptionalFiles: [],
    totalProducts: products.length,
    createCount: conflictSummary.createCount,
    updateBySkuCount: conflictSummary.updateBySkuCount,
    updateBySlugCount: conflictSummary.updateBySlugCount,
    updateCount: conflictSummary.updateBySkuCount + conflictSummary.updateBySlugCount,
    imageCount: images.length,
    specCount: specs.length,
    highlightCount: highlights.length,
    commitmentCount: commitments.length,
    promotionCount: promotions.length,
    productPromotionCount: productPromotions.length,
    bundleOfferCount: bundleOffers.length,
    warrantyPackageCount: warrantyPackages.length,
    productWarrantyPackageCount: productWarrantyPackages.length,
    sampleProducts: products.slice(0, 5).map(function (product) {
      return {
        sku: product.sku,
        name: product.name,
        product_type: product.product_type,
        base_price: product.base_price,
        status: product.status,
        import_action: product.import_action,
        final_sku: product.final_sku
      };
    }),
    canCommit: errors.length === 0
  };
}

function publicPreviewResult(analysis) {
  return {
    importMode: analysis.options.importMode,
    totalProducts: analysis.totalProducts,
    createCount: analysis.createCount,
    updateCount: analysis.updateCount,
    updateBySkuCount: analysis.updateBySkuCount,
    updateBySlugCount: analysis.updateBySlugCount,
    imageCount: analysis.imageCount,
    specCount: analysis.specCount,
    highlightCount: analysis.highlightCount,
    commitmentCount: analysis.commitmentCount,
    promotionCount: analysis.promotionCount,
    productPromotionCount: analysis.productPromotionCount,
    bundleOfferCount: analysis.bundleOfferCount,
    warrantyPackageCount: analysis.warrantyPackageCount,
    productWarrantyPackageCount: analysis.productWarrantyPackageCount,
    errors: analysis.errors,
    warnings: analysis.warnings,
    skippedFiles: analysis.skippedFiles,
    skippedOptionalFiles: analysis.skippedOptionalFiles,
    conflictSummary: analysis.conflictSummary,
    dependencyCounts: analysis.dependencyCounts,
    sampleProducts: analysis.sampleProducts,
    canCommit: analysis.canCommit
  };
}

async function ensureUniqueSlug(connection, baseSlug, tableName) {
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const [rows] = await connection.execute(
      `SELECT id FROM ${tableName} WHERE slug = ? LIMIT 1`,
      [candidate]
    );

    if (!rows.length) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

async function ensureBrand(connection, name) {
  const [existing] = await connection.execute(
    "SELECT id FROM brands WHERE name = ? LIMIT 1",
    [name]
  );

  if (existing.length) {
    return existing[0].id;
  }

  const slug = await ensureUniqueSlug(connection, slugify(name, "brand"), "brands");
  const [result] = await connection.execute(
    "INSERT INTO brands (name, slug, status) VALUES (?, ?, 'active')",
    [name, slug]
  );

  return result.insertId;
}

async function ensureCategory(connection, name, parentId) {
  const categorySlug = slugify(name, "category");
  const [existingBySlug] = await connection.execute(
    "SELECT id FROM categories WHERE slug = ? LIMIT 1",
    [categorySlug]
  );

  if (existingBySlug.length) {
    return existingBySlug[0].id;
  }

  const [existingByName] = await connection.execute(
    parentId
      ? "SELECT id FROM categories WHERE name = ? AND parent_id = ? LIMIT 1"
      : "SELECT id FROM categories WHERE name = ? AND parent_id IS NULL LIMIT 1",
    parentId ? [name, parentId] : [name]
  );

  if (existingByName.length) {
    return existingByName[0].id;
  }

  const slug = await ensureUniqueSlug(connection, categorySlug, "categories");
  const [result] = await connection.execute(
    "INSERT INTO categories (parent_id, name, slug, status) VALUES (?, ?, ?, 'active')",
    [parentId || null, name, slug]
  );

  return result.insertId;
}

async function copyImageFromZip(entry, image, copiedFiles, copiedTargetSet) {
  if (!entry) {
    const error = new Error(`Không tìm thấy ảnh trong zip: ${image.image_path}`);
    error.statusCode = 400;
    throw error;
  }

  const publicPath = image.image_url;
  const absolutePath = path.join(FRONTEND_ROOT, publicPath);
  const relativeCheck = path.relative(PRODUCT_IMAGE_TARGET_ROOT, absolutePath);

  if (relativeCheck.startsWith("..") || path.isAbsolute(relativeCheck)) {
    const error = new Error("Đường dẫn ảnh import không an toàn.");
    error.statusCode = 400;
    throw error;
  }

  if (copiedTargetSet.has(absolutePath)) {
    return;
  }

  const existed = await fs.stat(absolutePath).then(function () {
    return true;
  }).catch(function () {
    return false;
  });

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, entry.getData());
  copiedFiles.push({
    absolutePath,
    existed
  });
  copiedTargetSet.add(absolutePath);
}

async function cleanupCopiedFiles(copiedFiles) {
  await Promise.all(copiedFiles.filter(function (file) {
    return !file.existed;
  }).map(function (file) {
    return fs.rm(file.absolutePath, { force: true });
  }));
}

function groupBy(items, keyGetter) {
  const map = new Map();

  items.forEach(function (item) {
    const key = keyGetter(item);

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(item);
  });

  return map;
}

async function resetCatalog(connection) {
  await connection.query("SET FOREIGN_KEY_CHECKS = 0");

  try {
    await connection.execute("DELETE FROM product_warranty_packages");
    await connection.execute("DELETE FROM warranty_packages");
    await connection.execute("DELETE FROM bundle_offers");
    await connection.execute("DELETE FROM product_promotions");
    await connection.execute("DELETE FROM promotions");
    await connection.execute("DELETE FROM commitments");
    await connection.execute("DELETE FROM product_highlights");
    await connection.execute("DELETE FROM product_specs");
    await connection.execute("DELETE FROM product_images");
    await connection.execute("DELETE FROM products");
    await connection.execute("DELETE FROM categories");
    await connection.execute("DELETE FROM brands");
  } finally {
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  }
}

async function upsertProducts(connection, analysis) {
  const productsByImportSku = new Map();

  for (const product of analysis.products) {
    const brandId = await ensureBrand(connection, product.brand);
    const parentCategoryId = await ensureCategory(connection, product.category, null);
    const categoryId = product.subcategory
      ? await ensureCategory(connection, product.subcategory, parentCategoryId)
      : parentCategoryId;
    let productId = product.target_product_id;

    if (!productId && analysis.options.importMode !== "replaceCatalog") {
      const [existing] = await connection.execute(
        "SELECT id, sku FROM products WHERE sku = ? LIMIT 1",
        [product.sku]
      );

      if (existing.length) {
        productId = existing[0].id;
        product.final_sku = existing[0].sku;
      }
    }

    if (productId) {
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
          categoryId,
          brandId,
          product.final_sku,
          product.slug,
          product.name,
          product.product_type,
          product.short_description,
          product.description,
          product.base_price,
          product.sale_price,
          product.warranty_months,
          product.requires_serial ? 1 : 0,
          product.stock_quantity,
          product.status,
          product.is_featured ? 1 : 0,
          productId
        ]
      );
      product.id = productId;
    } else {
      const [result] = await connection.execute(
        `
          INSERT INTO products (
            category_id, brand_id, sku, slug, name, product_type, short_description, description,
            base_price, sale_price, warranty_months, requires_serial, stock_quantity, status, is_featured
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          categoryId,
          brandId,
          product.sku,
          product.slug,
          product.name,
          product.product_type,
          product.short_description,
          product.description,
          product.base_price,
          product.sale_price,
          product.warranty_months,
          product.requires_serial ? 1 : 0,
          product.stock_quantity,
          product.status,
          product.is_featured ? 1 : 0
        ]
      );
      product.id = result.insertId;
      product.final_sku = product.sku;
    }

    productsByImportSku.set(product.sku, {
      id: product.id,
      sku: product.final_sku,
      import_sku: product.sku,
      name: product.name,
      slug: product.slug
    });
    productsByImportSku.set(product.final_sku, {
      id: product.id,
      sku: product.final_sku,
      import_sku: product.sku,
      name: product.name,
      slug: product.slug
    });
  }

  return productsByImportSku;
}

async function loadProductsForSkus(connection, skus, productsByImportSku) {
  const missingSkus = Array.from(new Set(skus.filter(Boolean))).filter(function (sku) {
    return !productsByImportSku.has(sku);
  });

  if (!missingSkus.length) {
    return productsByImportSku;
  }

  const [rows] = await connection.execute(
    `
      SELECT id, sku, name, slug
      FROM products
      WHERE sku IN (${missingSkus.map(function () { return "?"; }).join(", ")})
    `,
    missingSkus
  );

  rows.forEach(function (product) {
    productsByImportSku.set(product.sku, product);
  });

  return productsByImportSku;
}

async function replaceImages(connection, analysis, productsBySku, copiedFiles, copiedTargetSet) {
  const imageGroups = groupBy(analysis.images, function (image) {
    return image.sku;
  });

  for (const [sku, images] of imageGroups.entries()) {
    const product = productsBySku.get(sku);

    if (!product || !product.id) {
      continue;
    }

    await connection.execute("DELETE FROM product_images WHERE product_id = ?", [product.id]);

    for (const image of images) {
      const entry = analysis.byRelativePath.get(image.image_path.toLowerCase());
      await copyImageFromZip(entry, image, copiedFiles, copiedTargetSet);
      await connection.execute(
        `
          INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `,
        [
          product.id,
          image.image_url,
          image.alt_text || product.name,
          image.is_primary ? 1 : 0,
          image.sort_order
        ]
      );
    }
  }
}

async function replaceSpecs(connection, analysis, productsBySku) {
  const specGroups = groupBy(analysis.specs, function (spec) {
    return spec.sku;
  });

  for (const [sku, specs] of specGroups.entries()) {
    const product = productsBySku.get(sku);

    if (!product || !product.id) {
      continue;
    }

    await connection.execute("DELETE FROM product_specs WHERE product_id = ?", [product.id]);

    for (const spec of specs) {
      await connection.execute(
        `
          INSERT INTO product_specs (
            product_id, spec_group, spec_key, spec_label, spec_value, unit,
            compare_enabled, filter_enabled, sort_order
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          product.id,
          spec.spec_group,
          spec.spec_key,
          spec.spec_label,
          spec.spec_value,
          spec.unit,
          spec.compare_enabled ? 1 : 0,
          spec.filter_enabled ? 1 : 0,
          spec.sort_order
        ]
      );
    }
  }
}

async function replaceHighlights(connection, analysis, productsBySku) {
  const highlightGroups = groupBy(analysis.highlights, function (highlight) {
    return highlight.sku;
  });

  for (const [sku, highlights] of highlightGroups.entries()) {
    const product = productsBySku.get(sku);

    if (!product || !product.id) {
      continue;
    }

    await connection.execute("DELETE FROM product_highlights WHERE product_id = ?", [product.id]);

    for (const highlight of highlights) {
      await connection.execute(
        `
          INSERT INTO product_highlights (product_id, title, description, icon, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `,
        [product.id, highlight.title, highlight.description, highlight.icon, highlight.sort_order]
      );
    }
  }
}

async function replaceCommitments(connection, analysis, productsBySku) {
  if (!analysis.rowsByFile.commitments.length && !analysis.byRelativePath.has("commitments.csv")) {
    return;
  }

  await connection.execute("DELETE FROM commitments");

  for (const commitment of analysis.commitments) {
    let scopeValue = commitment.scope_value;

    if (commitment.scope_type === "product") {
      const product = productsBySku.get(commitment.scope_value);
      scopeValue = product ? product.sku : commitment.scope_value;
    }

    await connection.execute(
      `
        INSERT INTO commitments (scope_type, scope_value, title, description, icon, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        commitment.scope_type,
        scopeValue,
        commitment.title,
        commitment.description,
        commitment.icon,
        commitment.sort_order
      ]
    );
  }
}

async function upsertPromotions(connection, promotions) {
  if (!promotions.length) {
    return new Map();
  }

  const codes = promotions.map(function (promotion) {
    return promotion.promo_code;
  });

  for (const promotion of promotions) {
    await connection.execute(
      `
        INSERT INTO promotions (
          promo_code, title, description, promo_type, discount_type, discount_value,
          start_date, end_date, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          description = VALUES(description),
          promo_type = VALUES(promo_type),
          discount_type = VALUES(discount_type),
          discount_value = VALUES(discount_value),
          start_date = VALUES(start_date),
          end_date = VALUES(end_date),
          status = VALUES(status)
      `,
      [
        promotion.promo_code,
        promotion.title,
        promotion.description,
        promotion.promo_type,
        promotion.discount_type,
        promotion.discount_value,
        promotion.start_date,
        promotion.end_date,
        promotion.status
      ]
    );
  }

  return loadPromotionIds(connection, codes);
}

async function loadPromotionIds(connection, codes) {
  const codeList = Array.from(new Set(codes.filter(Boolean)));

  if (!codeList.length) {
    return new Map();
  }

  const [rows] = await connection.execute(
    `
      SELECT id, promo_code
      FROM promotions
      WHERE promo_code IN (${codeList.map(function () { return "?"; }).join(", ")})
    `,
    codeList
  );

  return new Map(rows.map(function (row) {
    return [row.promo_code, row.id];
  }));
}

async function replaceProductPromotions(connection, analysis, productsBySku, promotionIds) {
  if (!analysis.productPromotions.length) {
    return;
  }

  const productIds = Array.from(new Set(analysis.productPromotions.map(function (item) {
    const product = productsBySku.get(item.sku);
    return product && product.id;
  }).filter(Boolean)));

  for (const productId of productIds) {
    await connection.execute("DELETE FROM product_promotions WHERE product_id = ?", [productId]);
  }

  for (const item of analysis.productPromotions) {
    const product = productsBySku.get(item.sku);
    const promotionId = promotionIds.get(item.promo_code);

    if (!product || !promotionId) {
      continue;
    }

    await connection.execute(
      `
        INSERT IGNORE INTO product_promotions (product_id, promotion_id, sort_order)
        VALUES (?, ?, ?)
      `,
      [product.id, promotionId, item.sort_order]
    );
  }
}

async function replaceBundleOffers(connection, analysis, productsBySku) {
  if (!analysis.bundleOffers.length) {
    return;
  }

  const mainProductIds = Array.from(new Set(analysis.bundleOffers.map(function (item) {
    const product = productsBySku.get(item.main_sku);
    return product && product.id;
  }).filter(Boolean)));

  for (const productId of mainProductIds) {
    await connection.execute("DELETE FROM bundle_offers WHERE main_product_id = ?", [productId]);
  }

  for (const item of analysis.bundleOffers) {
    const mainProduct = productsBySku.get(item.main_sku);
    const addonProduct = productsBySku.get(item.addon_sku);

    if (!mainProduct || !addonProduct) {
      continue;
    }

    await connection.execute(
      `
        INSERT INTO bundle_offers (
          main_product_id, addon_product_id, title, discount_type, discount_value,
          bundle_price, sort_order, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
      `,
      [
        mainProduct.id,
        addonProduct.id,
        item.title,
        item.discount_type,
        item.discount_value,
        item.bundle_price,
        item.sort_order
      ]
    );
  }
}

async function upsertWarrantyPackages(connection, warrantyPackages) {
  if (!warrantyPackages.length) {
    return new Map();
  }

  const codes = warrantyPackages.map(function (item) {
    return item.package_code;
  });

  for (const item of warrantyPackages) {
    await connection.execute(
      `
        INSERT INTO warranty_packages (package_code, title, duration_months, price, description, status)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          duration_months = VALUES(duration_months),
          price = VALUES(price),
          description = VALUES(description),
          status = VALUES(status)
      `,
      [item.package_code, item.title, item.duration_months, item.price, item.description, item.status]
    );
  }

  return loadWarrantyPackageIds(connection, codes);
}

async function loadWarrantyPackageIds(connection, codes) {
  const codeList = Array.from(new Set(codes.filter(Boolean)));

  if (!codeList.length) {
    return new Map();
  }

  const [rows] = await connection.execute(
    `
      SELECT id, package_code
      FROM warranty_packages
      WHERE package_code IN (${codeList.map(function () { return "?"; }).join(", ")})
    `,
    codeList
  );

  return new Map(rows.map(function (row) {
    return [row.package_code, row.id];
  }));
}

async function replaceProductWarrantyPackages(connection, analysis, productsBySku, warrantyPackageIds) {
  if (!analysis.productWarrantyPackages.length) {
    return;
  }

  const productIds = Array.from(new Set(analysis.productWarrantyPackages.map(function (item) {
    const product = productsBySku.get(item.sku);
    return product && product.id;
  }).filter(Boolean)));

  for (const productId of productIds) {
    await connection.execute("DELETE FROM product_warranty_packages WHERE product_id = ?", [productId]);
  }

  for (const item of analysis.productWarrantyPackages) {
    const product = productsBySku.get(item.sku);
    const packageId = warrantyPackageIds.get(item.package_code);

    if (!product || !packageId) {
      continue;
    }

    await connection.execute(
      `
        INSERT IGNORE INTO product_warranty_packages (product_id, warranty_package_id, sort_order)
        VALUES (?, ?, ?)
      `,
      [product.id, packageId, item.sort_order]
    );
  }
}

async function importProducts(zipBuffer, rawOptions) {
  const analysis = await analyzeZip(zipBuffer, rawOptions);

  if (!analysis.canCommit) {
    return {
      ...publicPreviewResult(analysis),
      imported: false,
      importedProducts: 0
    };
  }

  const connection = await pool.getConnection();
  const copiedFiles = [];
  const copiedTargetSet = new Set();

  try {
    await connection.beginTransaction();

    if (analysis.options.importMode === "replaceCatalog") {
      await resetCatalog(connection);
    }

    let productsBySku = await upsertProducts(connection, analysis);
    productsBySku = await loadProductsForSkus(connection, collectReferencedSkus(analysis.rowsByFile, analysis.products), productsBySku);
    await replaceImages(connection, analysis, productsBySku, copiedFiles, copiedTargetSet);
    await replaceSpecs(connection, analysis, productsBySku);
    await replaceHighlights(connection, analysis, productsBySku);
    await replaceCommitments(connection, analysis, productsBySku);

    const promotionIds = new Map([
      ...await loadPromotionIds(connection, analysis.productPromotions.map(function (item) { return item.promo_code; })),
      ...await upsertPromotions(connection, analysis.promotions)
    ]);
    await replaceProductPromotions(connection, analysis, productsBySku, promotionIds);
    await replaceBundleOffers(connection, analysis, productsBySku);

    const warrantyPackageIds = new Map([
      ...await loadWarrantyPackageIds(connection, analysis.productWarrantyPackages.map(function (item) { return item.package_code; })),
      ...await upsertWarrantyPackages(connection, analysis.warrantyPackages)
    ]);
    await replaceProductWarrantyPackages(connection, analysis, productsBySku, warrantyPackageIds);

    await connection.commit();

    return {
      ...publicPreviewResult(analysis),
      imported: true,
      importedProducts: analysis.products.length,
      copiedImageCount: copiedFiles.length
    };
  } catch (error) {
    await connection.rollback();
    await cleanupCopiedFiles(copiedFiles);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  analyzeZip,
  importProducts,
  publicPreviewResult
};
