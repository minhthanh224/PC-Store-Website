const path = require("path");
const fs = require("fs/promises");
const AdmZip = require("adm-zip");
const { parse } = require("csv-parse/sync");
const pool = require("../config/database");

const FRONTEND_ROOT = path.join(__dirname, "../../../frontend");
const PRODUCT_IMAGE_PUBLIC_ROOT = "assets/images/products";
const PRODUCT_IMAGE_TARGET_ROOT = path.join(FRONTEND_ROOT, PRODUCT_IMAGE_PUBLIC_ROOT);
const REQUIRED_FILES = ["products.csv"];
const OPTIONAL_FILES = [
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

function createValidationIssue(file, line, field, message) {
  return {
    file,
    line: line || null,
    field: field || null,
    message
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
      bySlug: new Map()
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
    bySlug: new Map(rows.map(function (row) { return [row.slug, row]; }))
  };
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
      stock_quantity: requiresSerial === true ? 0 : stockQuantity,
      status,
      is_featured: isFeatured === true,
      primary_image: primaryImage
    });
  });

  return products;
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
    const product = productsBySku.get(sku) || existingProductsBySku.get(sku);

    if (!sku) {
      errors.push(createValidationIssue("product_images.csv", line, "sku", "SKU là bắt buộc."));
    } else if (!product) {
      errors.push(createValidationIssue("product_images.csv", line, "sku", `SKU không tồn tại trong products.csv hoặc database: ${sku}.`));
    }

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
      const exists = images.some(function (image) {
        return image.sku === sku && image.image_path === normalizeCsvPath(product.primary_image);
      });

      if (!exists) {
        images.push({
          line: product.line,
          sku,
          image_path: normalizeCsvPath(product.primary_image),
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
    const product = productsBySku.get(sku) || existingProductsBySku.get(sku);

    if (!sku) {
      errors.push(createValidationIssue("product_specs.csv", line, "sku", "SKU là bắt buộc."));
    } else if (!product) {
      errors.push(createValidationIssue("product_specs.csv", line, "sku", `SKU không tồn tại trong products.csv hoặc database: ${sku}.`));
    }

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

function addOptionalFileWarnings(byRelativePath, warnings) {
  const skippedOptionalFiles = [];

  OPTIONAL_FILES.forEach(function (fileName) {
    if (byRelativePath.has(fileName.toLowerCase())) {
      const skipped = {
        file: fileName,
        reason: "Phase 1 chỉ import products.csv, product_images.csv, product_specs.csv và images/."
      };
      skippedOptionalFiles.push(skipped);
      warnings.push(createValidationIssue(fileName, null, null, `${fileName} được phát hiện nhưng chưa import trong phase 1.`));
    }
  });

  return skippedOptionalFiles;
}

async function analyzeZip(zipBuffer) {
  const errors = [];
  const warnings = [];
  const { byRelativePath } = buildZipEntryMap(zipBuffer, errors);

  REQUIRED_FILES.forEach(function (fileName) {
    if (!byRelativePath.has(fileName.toLowerCase())) {
      errors.push(createValidationIssue(fileName, null, null, `Zip thiếu ${fileName}.`));
    }
  });

  const skippedOptionalFiles = addOptionalFileWarnings(byRelativePath, warnings);
  const productsEntry = byRelativePath.get("products.csv");
  const imagesEntry = byRelativePath.get("product_images.csv");
  const specsEntry = byRelativePath.get("product_specs.csv");
  const productRows = readCsvRows(productsEntry, "products.csv", errors);
  const imageRows = readCsvRows(imagesEntry, "product_images.csv", errors);
  const specRows = readCsvRows(specsEntry, "product_specs.csv", errors);

  requireColumns(productRows, "products.csv", [
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
  requireColumns(imageRows, "product_images.csv", ["sku", "image_path", "alt_text", "is_primary", "sort_order", "image_type"], errors);
  requireColumns(specRows, "product_specs.csv", ["sku", "spec_group", "spec_key", "spec_value"], errors);
  warnMissingOptionalColumns(specRows, "product_specs.csv", ["spec_label", "unit", "sort_order", "compare_enabled", "filter_enabled"], warnings);

  const products = validateProducts(productRows, byRelativePath, errors, warnings);
  const productsBySku = new Map(products.filter(function (product) {
    return product.sku;
  }).map(function (product) {
    return [product.sku, product];
  }));

  const referencedSkus = Array.from(new Set([
    ...products.map(function (product) { return product.sku; }),
    ...imageRows.map(function (row) { return clean(row.sku); }),
    ...specRows.map(function (row) { return clean(row.sku); })
  ].filter(Boolean)));
  const existingProducts = await loadExistingProducts(
    referencedSkus,
    products.map(function (product) { return product.slug; })
  );

  products.forEach(function (product) {
    const slugOwner = existingProducts.bySlug.get(product.slug);

    if (slugOwner && slugOwner.sku !== product.sku) {
      errors.push(createValidationIssue("products.csv", product.line, "slug", `Slug ${product.slug} đã thuộc SKU ${slugOwner.sku}.`));
    }
  });

  const images = validateImages(imageRows, productsBySku, existingProducts.bySku, byRelativePath, errors, warnings);
  const specs = validateSpecs(specRows, productsBySku, existingProducts.bySku, errors, warnings);
  const createCount = products.filter(function (product) {
    return !existingProducts.bySku.has(product.sku);
  }).length;
  const updateCount = products.length - createCount;

  return {
    zipBuffer,
    byRelativePath,
    products,
    images,
    specs,
    errors,
    warnings,
    skippedOptionalFiles,
    totalProducts: products.length,
    createCount,
    updateCount,
    imageCount: images.length,
    specCount: specs.length,
    sampleProducts: products.slice(0, 5).map(function (product) {
      return {
        sku: product.sku,
        name: product.name,
        product_type: product.product_type,
        base_price: product.base_price,
        status: product.status
      };
    }),
    canCommit: errors.length === 0
  };
}

function publicPreviewResult(analysis) {
  return {
    totalProducts: analysis.totalProducts,
    createCount: analysis.createCount,
    updateCount: analysis.updateCount,
    imageCount: analysis.imageCount,
    specCount: analysis.specCount,
    errors: analysis.errors,
    warnings: analysis.warnings,
    skippedOptionalFiles: analysis.skippedOptionalFiles,
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

async function importProducts(zipBuffer) {
  const analysis = await analyzeZip(zipBuffer);

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
  const productsBySku = new Map();
  const imageGroups = new Map();
  const specGroups = new Map();

  analysis.products.forEach(function (product) {
    productsBySku.set(product.sku, product);
  });
  analysis.images.forEach(function (image) {
    if (!imageGroups.has(image.sku)) {
      imageGroups.set(image.sku, []);
    }
    imageGroups.get(image.sku).push(image);
  });
  analysis.specs.forEach(function (spec) {
    if (!specGroups.has(spec.sku)) {
      specGroups.set(spec.sku, []);
    }
    specGroups.get(spec.sku).push(spec);
  });

  try {
    await connection.beginTransaction();

    for (const product of analysis.products) {
      const brandId = await ensureBrand(connection, product.brand);
      const parentCategoryId = await ensureCategory(connection, product.category, null);
      const categoryId = product.subcategory
        ? await ensureCategory(connection, product.subcategory, parentCategoryId)
        : parentCategoryId;
      const [existing] = await connection.execute(
        "SELECT id FROM products WHERE sku = ? LIMIT 1",
        [product.sku]
      );

      if (existing.length) {
        await connection.execute(
          `
            UPDATE products
            SET
              category_id = ?,
              brand_id = ?,
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
            existing[0].id
          ]
        );
        product.id = existing[0].id;
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
      }
    }

    const allAssetSkus = Array.from(new Set([
      ...imageGroups.keys(),
      ...specGroups.keys()
    ]));

    if (allAssetSkus.length) {
      const [assetProducts] = await connection.execute(
        `
          SELECT id, sku, name
          FROM products
          WHERE sku IN (${allAssetSkus.map(function () { return "?"; }).join(", ")})
        `,
        allAssetSkus
      );

      assetProducts.forEach(function (product) {
        productsBySku.set(product.sku, {
          ...(productsBySku.get(product.sku) || {}),
          id: product.id,
          sku: product.sku,
          name: product.name
        });
      });
    }

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
