const pool = require("../config/database");
const { getAvailableStockExpression } = require("./stock.service");

const PAYMENT_METHODS = ["cod", "bank_transfer"];

function normalizeQuantity(quantity) {
  const number = Number(quantity);

  if (!Number.isInteger(number) || number < 1) {
    return null;
  }

  return number;
}

function normalizeWarrantyPackageId(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function normalizeBundleOfferId(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function normalizeCartItemKey(value) {
  return value === undefined || value === null || value === "" ? "" : String(value);
}

function normalizePromotionCode(value) {
  const code = String(value || "").trim().toUpperCase();

  if (!code) {
    return null;
  }

  return code.replace(/\s+/g, "");
}

function isBundleAddonItem(item) {
  return item.is_bundle_addon === true || item.is_bundle_addon === 1 || item.is_bundle_addon === "1" || item.is_bundle_addon === "true";
}

function generateOrderCode() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const randomNumber = Math.floor(100000 + Math.random() * 900000);

  return `DH${year}${month}${day}${randomNumber}`;
}

function validateOrderBody(body) {
  const requiredFields = [
    "customer_name",
    "customer_phone",
    "province",
    "district",
    "ward",
    "address_line"
  ];

  for (const field of requiredFields) {
    if (!body[field] || !String(body[field]).trim()) {
      return "Vui lòng nhập đầy đủ thông tin giao hàng.";
    }
  }

  if (!PAYMENT_METHODS.includes(body.payment_method)) {
    return "Phương thức thanh toán không hợp lệ.";
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return "Giỏ hàng không có sản phẩm.";
  }

  return null;
}

function normalizeItems(items) {
  const itemMap = {};

  items.forEach(function (item, index) {
    const productId = Number(item.product_id);
    const quantity = normalizeQuantity(item.quantity);
    const rawWarrantyPackageId = item.warranty_package_id;
    const hasWarrantyPackageValue = rawWarrantyPackageId !== undefined && rawWarrantyPackageId !== null && rawWarrantyPackageId !== "";
    const warrantyPackageId = normalizeWarrantyPackageId(item.warranty_package_id);
    const isBundleAddon = isBundleAddonItem(item);
    const rawBundleOfferId = item.bundle_offer_id;
    const hasBundleOfferValue = rawBundleOfferId !== undefined && rawBundleOfferId !== null && rawBundleOfferId !== "";
    const bundleOfferId = normalizeBundleOfferId(rawBundleOfferId);
    const cartItemKey = normalizeCartItemKey(item.cart_item_key || item.item_key || item.key);
    const bundleParentKey = normalizeCartItemKey(item.bundle_parent_key);

    if (!Number.isInteger(productId) || productId < 1 || quantity === null) {
      return;
    }

    if (hasWarrantyPackageValue && warrantyPackageId === null) {
      itemMap[`invalid-warranty:${productId}:${rawWarrantyPackageId}:${index}`] = {
        product_id: productId,
        warranty_package_id: null,
        quantity,
        invalid_warranty_package_id: true
      };
      return;
    }

    if (isBundleAddon && (!hasBundleOfferValue || bundleOfferId === null || !bundleParentKey)) {
      itemMap[`invalid-bundle:${productId}:${rawBundleOfferId}:${index}`] = {
        product_id: productId,
        quantity,
        is_bundle_addon: true,
        bundle_offer_id: null,
        bundle_parent_key: bundleParentKey,
        invalid_bundle_offer_id: true
      };
      return;
    }

    if (isBundleAddon && warrantyPackageId) {
      itemMap[`invalid-addon-warranty:${productId}:${warrantyPackageId}:${index}`] = {
        product_id: productId,
        warranty_package_id: warrantyPackageId,
        quantity,
        is_bundle_addon: true,
        bundle_offer_id: bundleOfferId,
        bundle_parent_key: bundleParentKey,
        invalid_warranty_package_id: true
      };
      return;
    }

    const normalizedKey = isBundleAddon
      ? (cartItemKey || `bundle:${bundleParentKey}:${productId}:${bundleOfferId}`)
      : (cartItemKey || `main:${productId}:${warrantyPackageId || "none"}`);

    if (!itemMap[normalizedKey]) {
      itemMap[normalizedKey] = {
        cart_item_key: normalizedKey,
        product_id: productId,
        warranty_package_id: isBundleAddon ? null : warrantyPackageId,
        quantity: 0,
        is_bundle_addon: isBundleAddon,
        bundle_parent_key: isBundleAddon ? bundleParentKey : null,
        bundle_offer_id: isBundleAddon ? bundleOfferId : null
      };
    }

    itemMap[normalizedKey].quantity += quantity;
  });

  return Object.values(itemMap);
}

async function loadProductsForOrder(connection, normalizedItems) {
  const productIds = normalizedItems.map(function (item) {
    return item.product_id;
  });
  const placeholders = productIds.map(function () {
    return "?";
  }).join(", ");

  const [products] = await connection.execute(
    `
      SELECT
        p.id,
        p.name,
        p.sku,
        p.product_type,
        p.base_price,
        p.sale_price,
        p.warranty_months,
        p.requires_serial,
        p.stock_quantity,
        ${getAvailableStockExpression("p")} AS available_stock
      FROM products p
      WHERE p.status = 'active' AND p.id IN (${placeholders})
    `,
    productIds
  );

  const productMap = {};
  products.forEach(function (product) {
    productMap[product.id] = {
      ...product,
      base_price: Number(product.base_price),
      sale_price: product.sale_price === null ? null : Number(product.sale_price),
      available_stock: Number(product.available_stock),
      requires_serial: Boolean(product.requires_serial)
    };
  });

  return productMap;
}

async function loadWarrantyPackagesForOrder(connection, normalizedItems) {
  const packageItems = normalizedItems.filter(function (item) {
    return item.warranty_package_id;
  });

  if (!packageItems.length) {
    return {};
  }

  const productIds = Array.from(new Set(packageItems.map(function (item) {
    return item.product_id;
  })));
  const packageIds = Array.from(new Set(packageItems.map(function (item) {
    return item.warranty_package_id;
  })));
  const productPlaceholders = productIds.map(function () {
    return "?";
  }).join(", ");
  const packagePlaceholders = packageIds.map(function () {
    return "?";
  }).join(", ");

  const [rows] = await connection.execute(
    `
      SELECT
        pwp.product_id,
        wp.id AS warranty_package_id,
        wp.title,
        wp.duration_months,
        wp.price
      FROM product_warranty_packages pwp
      INNER JOIN warranty_packages wp ON wp.id = pwp.warranty_package_id
      WHERE pwp.product_id IN (${productPlaceholders})
        AND wp.id IN (${packagePlaceholders})
        AND wp.status = 'active'
    `,
    productIds.concat(packageIds)
  );

  return rows.reduce(function (map, row) {
    map[`${row.product_id}:${row.warranty_package_id}`] = {
      id: Number(row.warranty_package_id),
      title: row.title,
      duration_months: Number(row.duration_months || 0),
      price: Number(row.price || 0)
    };
    return map;
  }, {});
}

function resolveWarrantyPackageForItem(item, product, warrantyPackageMap) {
  if (!item.warranty_package_id) {
    return null;
  }

  if (product.product_type === "service") {
    const error = new Error("Dịch vụ kỹ thuật không áp dụng gói bảo hành mở rộng.");
    error.statusCode = 400;
    throw error;
  }

  const packageInfo = warrantyPackageMap[`${item.product_id}:${item.warranty_package_id}`];

  if (!packageInfo) {
    const error = new Error("Gói bảo hành đã chọn không hợp lệ hoặc không còn áp dụng cho sản phẩm.");
    error.statusCode = 400;
    throw error;
  }

  return packageInfo;
}

async function loadBundleOffersForOrder(connection, normalizedItems) {
  const addonItems = normalizedItems.filter(function (item) {
    return item.is_bundle_addon && item.bundle_offer_id;
  });

  if (!addonItems.length) {
    return {};
  }

  const offerIds = Array.from(new Set(addonItems.map(function (item) {
    return item.bundle_offer_id;
  })));
  const placeholders = offerIds.map(function () {
    return "?";
  }).join(", ");

  const [rows] = await connection.execute(
    `
      SELECT
        bo.id,
        bo.main_product_id,
        bo.addon_product_id,
        bo.title,
        bo.discount_type,
        bo.discount_value,
        bo.bundle_price,
        bo.status
      FROM bundle_offers bo
      WHERE bo.id IN (${placeholders})
        AND bo.status = 'active'
    `,
    offerIds
  );

  return rows.reduce(function (map, row) {
    map[Number(row.id)] = {
      id: Number(row.id),
      main_product_id: Number(row.main_product_id),
      addon_product_id: Number(row.addon_product_id),
      title: row.title,
      discount_type: row.discount_type,
      discount_value: row.discount_value === null ? null : Number(row.discount_value),
      bundle_price: row.bundle_price === null ? null : Number(row.bundle_price)
    };
    return map;
  }, {});
}

function getProductCurrentPrice(product) {
  return Number(product.sale_price || product.base_price || 0);
}

function calculateBundleUnitPrice(addonProduct, bundleOffer) {
  const originalPrice = getProductCurrentPrice(addonProduct);

  if (bundleOffer.bundle_price !== null && bundleOffer.bundle_price !== undefined) {
    return Math.max(Number(bundleOffer.bundle_price || 0), 0);
  }

  if (bundleOffer.discount_type === "percent" && bundleOffer.discount_value) {
    return Math.max(originalPrice * (1 - Number(bundleOffer.discount_value) / 100), 0);
  }

  if (bundleOffer.discount_type === "fixed" && bundleOffer.discount_value) {
    return Math.max(originalPrice - Number(bundleOffer.discount_value), 0);
  }

  return originalPrice;
}

function isPromotionCurrentlyActive(promotion) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (promotion.start_date) {
    const startDate = new Date(promotion.start_date);
    startDate.setHours(0, 0, 0, 0);

    if (startDate > today) {
      return false;
    }
  }

  if (promotion.end_date) {
    const endDate = new Date(promotion.end_date);
    endDate.setHours(23, 59, 59, 999);

    if (endDate < today) {
      return false;
    }
  }

  return true;
}

async function loadPromotionForOrder(connection, promotionCode) {
  if (!promotionCode) {
    return null;
  }

  const [promotions] = await connection.execute(
    `
      SELECT
        id,
        promo_code,
        title,
        description,
        promo_type,
        discount_type,
        discount_value,
        start_date,
        end_date,
        status
      FROM promotions
      WHERE UPPER(promo_code) = ?
        AND status = 'active'
      LIMIT 1
    `,
    [promotionCode]
  );

  if (!promotions.length) {
    const error = new Error("Mã ưu đãi không tồn tại hoặc đã ngừng áp dụng.");
    error.statusCode = 400;
    throw error;
  }

  const promotion = promotions[0];

  if (!isPromotionCurrentlyActive(promotion)) {
    const error = new Error("Mã ưu đãi chưa đến thời gian áp dụng hoặc đã hết hạn.");
    error.statusCode = 400;
    throw error;
  }

  if (promotion.promo_type === "bundle") {
    const error = new Error("Ưu đãi mua kèm được áp dụng qua sản phẩm mua kèm, không dùng như mã giảm giá đơn hàng.");
    error.statusCode = 400;
    throw error;
  }

  if (!['percent', 'fixed'].includes(promotion.discount_type)) {
    const error = new Error("Chương trình ưu đãi này không phải mã giảm giá trực tiếp cho đơn hàng.");
    error.statusCode = 400;
    throw error;
  }

  const [linkedProducts] = await connection.execute(
    `
      SELECT product_id
      FROM product_promotions
      WHERE promotion_id = ?
    `,
    [promotion.id]
  );

  const productIds = new Set(linkedProducts.map(function (row) {
    return Number(row.product_id);
  }));

  return {
    id: Number(promotion.id),
    promo_code: promotion.promo_code,
    title: promotion.title,
    description: promotion.description,
    promo_type: promotion.promo_type,
    discount_type: promotion.discount_type,
    discount_value: promotion.discount_value === null ? null : Number(promotion.discount_value),
    start_date: promotion.start_date,
    end_date: promotion.end_date,
    product_ids: productIds
  };
}

function calculatePromotionEligibleSubtotal(normalizedItems, promotion) {
  if (!promotion) {
    return 0;
  }

  return normalizedItems.reduce(function (total, item) {
    if (item.is_bundle_addon) {
      return total;
    }

    if (promotion.product_ids.size > 0 && !promotion.product_ids.has(Number(item.product_id))) {
      return total;
    }

    return total + (Number(item.unit_price || 0) * Number(item.quantity || 0));
  }, 0);
}

function calculatePromotionDiscountAmount(promotion, eligibleSubtotal) {
  if (!promotion) {
    return 0;
  }

  if (eligibleSubtotal <= 0) {
    const error = new Error("Mã ưu đãi không áp dụng cho sản phẩm nào trong giỏ hàng.");
    error.statusCode = 400;
    throw error;
  }

  if (promotion.discount_type === "percent") {
    return Math.min(Math.round(eligibleSubtotal * Number(promotion.discount_value || 0) / 100), eligibleSubtotal);
  }

  if (promotion.discount_type === "fixed") {
    return Math.min(Number(promotion.discount_value || 0), eligibleSubtotal);
  }

  return 0;
}

async function resolvePromotionForOrder(connection, promotionCode, normalizedItems) {
  const promotion = await loadPromotionForOrder(connection, promotionCode);

  if (!promotion) {
    return {
      promotion: null,
      eligibleSubtotal: 0,
      discountAmount: 0
    };
  }

  const eligibleSubtotal = calculatePromotionEligibleSubtotal(normalizedItems, promotion);
  const discountAmount = calculatePromotionDiscountAmount(promotion, eligibleSubtotal);

  return {
    promotion,
    eligibleSubtotal,
    discountAmount
  };
}

function getEstimatedShippingFee(subtotal) {
  return subtotal >= 3000000 ? 0 : 40000;
}

async function priceAndValidateOrderItems(connection, normalizedItems) {
  const productMap = await loadProductsForOrder(connection, normalizedItems);
  const warrantyPackageMap = await loadWarrantyPackagesForOrder(connection, normalizedItems);
  const bundleOfferMap = await loadBundleOffersForOrder(connection, normalizedItems);
  const parentItemMap = normalizedItems.reduce(function (map, item) {
    if (!item.is_bundle_addon && item.cart_item_key) {
      map[item.cart_item_key] = item;
    }
    return map;
  }, {});
  const quantityByProduct = new Map();
  let subtotal = 0;

  for (const item of normalizedItems) {
    const product = productMap[item.product_id];

    if (!product) {
      const error = new Error("Một sản phẩm trong giỏ hàng không còn khả dụng.");
      error.statusCode = 400;
      throw error;
    }

    if (item.is_bundle_addon) {
      const parentItem = parentItemMap[item.bundle_parent_key];
      const parentProduct = parentItem ? productMap[parentItem.product_id] : null;
      const bundleOffer = validateBundleAddonItem(item, parentItem, product, bundleOfferMap);
      const originalUnitPrice = getProductCurrentPrice(product);
      const bundleUnitPrice = calculateBundleUnitPrice(product, bundleOffer);

      item.bundle_parent_product_id = parentProduct ? parentProduct.id : parentItem.product_id;
      item.bundle_parent_name_snapshot = parentProduct ? parentProduct.name : "Sản phẩm chính";
      item.bundle_offer = bundleOffer;
      item.unit_price = bundleUnitPrice;
      item.line_unit_price = bundleUnitPrice;
      item.total_price = bundleUnitPrice * item.quantity;
      item.original_unit_price = originalUnitPrice;
      item.bundle_unit_price = bundleUnitPrice;
    } else {
      const unitPrice = getProductCurrentPrice(product);
      const warrantyPackage = resolveWarrantyPackageForItem(item, product, warrantyPackageMap);
      const warrantyPackagePrice = warrantyPackage ? warrantyPackage.price : 0;

      item.warranty_package = warrantyPackage;
      item.unit_price = unitPrice;
      item.line_unit_price = unitPrice + warrantyPackagePrice;
      item.total_price = item.line_unit_price * item.quantity;
    }

    const currentQuantity = quantityByProduct.get(item.product_id) || 0;
    quantityByProduct.set(item.product_id, currentQuantity + item.quantity);
    subtotal += item.total_price;
  }

  for (const [productId, quantity] of quantityByProduct.entries()) {
    const product = productMap[productId];

    if (product.available_stock < quantity) {
      const error = new Error(`Sản phẩm ${product.name} không đủ hàng khả dụng. Hiện chỉ còn ${product.available_stock} sản phẩm.`);
      error.statusCode = 400;
      throw error;
    }
  }

  return { productMap, subtotal };
}

function validateBundleAddonItem(item, parentItem, addonProduct, bundleOfferMap) {
  if (!parentItem) {
    const error = new Error("Sản phẩm mua kèm cần có sản phẩm chính trong giỏ hàng.");
    error.statusCode = 400;
    throw error;
  }

  if (item.quantity !== parentItem.quantity) {
    const error = new Error("Số lượng sản phẩm mua kèm phải khớp với sản phẩm chính.");
    error.statusCode = 400;
    throw error;
  }

  if (addonProduct.product_type === "service") {
    const error = new Error("Dịch vụ kỹ thuật không áp dụng mua kèm ưu đãi.");
    error.statusCode = 400;
    throw error;
  }

  const bundleOffer = bundleOfferMap[item.bundle_offer_id];

  if (!bundleOffer) {
    const error = new Error("Ưu đãi mua kèm không hợp lệ hoặc đã hết hiệu lực.");
    error.statusCode = 400;
    throw error;
  }

  if (Number(bundleOffer.main_product_id) !== Number(parentItem.product_id) || Number(bundleOffer.addon_product_id) !== Number(item.product_id)) {
    const error = new Error("Sản phẩm mua kèm không còn áp dụng cho sản phẩm chính.");
    error.statusCode = 400;
    throw error;
  }

  return bundleOffer;
}

async function createOrder(user, body) {
  const validationError = validateOrderBody(body);

  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  const normalizedItems = normalizeItems(body.items);

  if (normalizedItems.length === 0) {
    const error = new Error("Giỏ hàng không có sản phẩm hợp lệ.");
    error.statusCode = 400;
    throw error;
  }

  if (normalizedItems.some(function (item) { return item.invalid_warranty_package_id; })) {
    const error = new Error("Gói bảo hành đã chọn không hợp lệ hoặc không còn áp dụng cho sản phẩm.");
    error.statusCode = 400;
    throw error;
  }

  if (normalizedItems.some(function (item) { return item.invalid_bundle_offer_id; })) {
    const error = new Error("Ưu đãi mua kèm không hợp lệ hoặc đã hết hiệu lực.");
    error.statusCode = 400;
    throw error;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { productMap, subtotal } = await priceAndValidateOrderItems(connection, normalizedItems);
    const promotionCode = normalizePromotionCode(body.promotion_code || body.promo_code);
    const promotionResult = await resolvePromotionForOrder(connection, promotionCode, normalizedItems);
    const shippingFee = getEstimatedShippingFee(subtotal);
    const discountAmount = promotionResult.discountAmount;
    const totalAmount = Math.max(subtotal + shippingFee - discountAmount, 0);
    let orderCode = generateOrderCode();
    let inserted = false;
    let orderId = null;

    for (let attempt = 0; attempt < 3 && !inserted; attempt += 1) {
      try {
        const [orderResult] = await connection.execute(
          `
            INSERT INTO orders (
              order_code,
              user_id,
              customer_name,
              customer_phone,
              customer_email,
              province,
              district,
              ward,
              address_line,
              payment_method,
              payment_status,
              status,
              subtotal_amount,
              shipping_fee,
              discount_amount,
              promotion_id,
              promotion_code_snapshot,
              promotion_title_snapshot,
              total_amount,
              note
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 'pending', ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            orderCode,
            user.id,
            String(body.customer_name).trim(),
            String(body.customer_phone).trim(),
            body.customer_email ? String(body.customer_email).trim() : user.email,
            String(body.province).trim(),
            String(body.district).trim(),
            String(body.ward).trim(),
            String(body.address_line).trim(),
            body.payment_method,
            subtotal,
            shippingFee,
            discountAmount,
            promotionResult.promotion ? promotionResult.promotion.id : null,
            promotionResult.promotion ? promotionResult.promotion.promo_code : null,
            promotionResult.promotion ? promotionResult.promotion.title : null,
            totalAmount,
            body.note ? String(body.note).trim() : null
          ]
        );
        orderId = orderResult.insertId;
        inserted = true;
      } catch (error) {
        if (error.code !== "ER_DUP_ENTRY") {
          throw error;
        }
        orderCode = generateOrderCode();
      }
    }

    if (!inserted) {
      const error = new Error("Không thể tạo mã đơn hàng. Vui lòng thử lại.");
      error.statusCode = 500;
      throw error;
    }

    for (const item of normalizedItems) {
      const product = productMap[item.product_id];
      const unitPrice = item.unit_price;
      const warrantyPackage = item.warranty_package;
      const warrantyPackagePrice = warrantyPackage ? warrantyPackage.price : 0;
      const lineUnitTotal = item.is_bundle_addon ? unitPrice : unitPrice + warrantyPackagePrice;
      const warrantyColumns = [
        warrantyPackage ? warrantyPackage.id : null,
        warrantyPackage ? warrantyPackage.title : null,
        warrantyPackage ? warrantyPackage.duration_months : null,
        item.is_bundle_addon ? 0 : warrantyPackagePrice
      ];
      const bundleOffer = item.bundle_offer;
      const bundleColumns = [
        item.is_bundle_addon ? 1 : 0,
        item.is_bundle_addon ? item.bundle_parent_key : null,
        item.is_bundle_addon ? item.bundle_parent_product_id : null,
        item.is_bundle_addon ? item.bundle_parent_name_snapshot : null,
        item.is_bundle_addon && bundleOffer ? bundleOffer.id : null,
        item.is_bundle_addon && bundleOffer ? bundleOffer.title : null,
        item.is_bundle_addon && bundleOffer ? bundleOffer.discount_type : null,
        item.is_bundle_addon && bundleOffer ? bundleOffer.discount_value : null,
        item.is_bundle_addon ? item.original_unit_price : null,
        item.is_bundle_addon ? item.bundle_unit_price : null
      ];

      if (product.requires_serial) {
        for (let count = 0; count < item.quantity; count += 1) {
          await connection.execute(
            `
              INSERT INTO order_items (
                order_id,
                product_id,
                serial_number_id,
                product_name_snapshot,
                sku_snapshot,
                unit_price,
                quantity,
                total_price,
                warranty_months_snapshot,
                warranty_package_id,
                warranty_package_title,
                warranty_package_duration_months,
                warranty_package_price,
                is_bundle_addon,
                bundle_parent_key,
                bundle_parent_product_id,
                bundle_parent_name_snapshot,
                bundle_offer_id,
                bundle_offer_title,
                bundle_discount_type,
                bundle_discount_value,
                original_unit_price,
                bundle_unit_price
              )
              VALUES (?, ?, NULL, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              orderId,
              product.id,
              product.name,
              product.sku,
              unitPrice,
              lineUnitTotal,
              product.warranty_months,
              ...warrantyColumns,
              ...bundleColumns
            ]
          );
        }
      } else {
        await connection.execute(
          `
            INSERT INTO order_items (
              order_id,
              product_id,
              serial_number_id,
              product_name_snapshot,
              sku_snapshot,
              unit_price,
              quantity,
              total_price,
              warranty_months_snapshot,
              warranty_package_id,
              warranty_package_title,
              warranty_package_duration_months,
              warranty_package_price,
              is_bundle_addon,
              bundle_parent_key,
              bundle_parent_product_id,
              bundle_parent_name_snapshot,
              bundle_offer_id,
              bundle_offer_title,
              bundle_discount_type,
              bundle_discount_value,
              original_unit_price,
              bundle_unit_price
            )
            VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            orderId,
            product.id,
            product.name,
            product.sku,
            unitPrice,
            item.quantity,
            item.total_price,
            product.warranty_months,
            ...warrantyColumns,
            ...bundleColumns
          ]
        );
      }
    }

    await connection.commit();

    return {
      order_id: orderId,
      order_code: orderCode,
      subtotal_amount: subtotal,
      shipping_fee: shippingFee,
      discount_amount: discountAmount,
      promotion: promotionResult.promotion ? {
        id: promotionResult.promotion.id,
        code: promotionResult.promotion.promo_code,
        title: promotionResult.promotion.title,
        eligible_subtotal: promotionResult.eligibleSubtotal
      } : null,
      total_amount: totalAmount
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function previewPromotion(user, body) {
  const normalizedItems = normalizeItems(Array.isArray(body.items) ? body.items : []);
  const promotionCode = normalizePromotionCode(body.promotion_code || body.promo_code);

  if (!normalizedItems.length) {
    const error = new Error("Giỏ hàng không có sản phẩm hợp lệ.");
    error.statusCode = 400;
    throw error;
  }

  if (!promotionCode) {
    const error = new Error("Vui lòng nhập mã ưu đãi.");
    error.statusCode = 400;
    throw error;
  }

  if (normalizedItems.some(function (item) { return item.invalid_warranty_package_id; })) {
    const error = new Error("Gói bảo hành đã chọn không hợp lệ hoặc không còn áp dụng cho sản phẩm.");
    error.statusCode = 400;
    throw error;
  }

  if (normalizedItems.some(function (item) { return item.invalid_bundle_offer_id; })) {
    const error = new Error("Ưu đãi mua kèm không hợp lệ hoặc đã hết hiệu lực.");
    error.statusCode = 400;
    throw error;
  }

  const connection = await pool.getConnection();

  try {
    const { subtotal } = await priceAndValidateOrderItems(connection, normalizedItems);
    const promotionResult = await resolvePromotionForOrder(connection, promotionCode, normalizedItems);
    const shippingFee = getEstimatedShippingFee(subtotal);
    const totalAmount = Math.max(subtotal + shippingFee - promotionResult.discountAmount, 0);

    return {
      subtotal_amount: subtotal,
      shipping_fee: shippingFee,
      discount_amount: promotionResult.discountAmount,
      eligible_subtotal: promotionResult.eligibleSubtotal,
      total_amount: totalAmount,
      promotion: promotionResult.promotion ? {
        id: promotionResult.promotion.id,
        code: promotionResult.promotion.promo_code,
        title: promotionResult.promotion.title,
        description: promotionResult.promotion.description,
        promo_type: promotionResult.promotion.promo_type,
        discount_type: promotionResult.promotion.discount_type,
        discount_value: promotionResult.promotion.discount_value
      } : null
    };
  } finally {
    connection.release();
  }
}

module.exports = {
  createOrder,
  previewPromotion
};
