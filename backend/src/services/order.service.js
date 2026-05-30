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

  items.forEach(function (item) {
    const productId = Number(item.product_id);
    const quantity = normalizeQuantity(item.quantity);
    const rawWarrantyPackageId = item.warranty_package_id;
    const hasWarrantyPackageValue = rawWarrantyPackageId !== undefined && rawWarrantyPackageId !== null && rawWarrantyPackageId !== "";
    const warrantyPackageId = normalizeWarrantyPackageId(item.warranty_package_id);

    if (!Number.isInteger(productId) || productId < 1 || quantity === null) {
      return;
    }

    if (hasWarrantyPackageValue && warrantyPackageId === null) {
      itemMap[`invalid:${productId}:${rawWarrantyPackageId}`] = {
        product_id: productId,
        warranty_package_id: null,
        quantity,
        invalid_warranty_package_id: true
      };
      return;
    }

    const key = `${productId}:${warrantyPackageId || "none"}`;

    if (!itemMap[key]) {
      itemMap[key] = {
        product_id: productId,
        warranty_package_id: warrantyPackageId,
        quantity: 0
      };
    }

    itemMap[key].quantity += quantity;
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

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const productMap = await loadProductsForOrder(connection, normalizedItems);
    const warrantyPackageMap = await loadWarrantyPackagesForOrder(connection, normalizedItems);
    let subtotal = 0;

    for (const item of normalizedItems) {
      const product = productMap[item.product_id];

      if (!product) {
        const error = new Error("Một sản phẩm trong giỏ hàng không còn khả dụng.");
        error.statusCode = 400;
        throw error;
      }

      if (product.available_stock < item.quantity) {
        const error = new Error(`Sản phẩm ${product.name} không đủ hàng khả dụng. Hiện chỉ còn ${product.available_stock} sản phẩm.`);
        error.statusCode = 400;
        throw error;
      }

      const unitPrice = product.sale_price || product.base_price;
      const warrantyPackage = resolveWarrantyPackageForItem(item, product, warrantyPackageMap);
      const warrantyPackagePrice = warrantyPackage ? warrantyPackage.price : 0;
      item.warranty_package = warrantyPackage;
      item.unit_price = unitPrice;
      item.line_unit_price = unitPrice + warrantyPackagePrice;
      item.total_price = item.line_unit_price * item.quantity;
      subtotal += item.total_price;
    }

    const shippingFee = subtotal >= 3000000 ? 0 : 40000;
    const discountAmount = 0;
    const totalAmount = subtotal + shippingFee - discountAmount;
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
              total_amount,
              note
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 'pending', ?, ?, ?, ?, ?)
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
      const lineUnitTotal = unitPrice + warrantyPackagePrice;
      const warrantyColumns = [
        warrantyPackage ? warrantyPackage.id : null,
        warrantyPackage ? warrantyPackage.title : null,
        warrantyPackage ? warrantyPackage.duration_months : null,
        warrantyPackagePrice
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
                warranty_package_price
              )
              VALUES (?, ?, NULL, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
            `,
            [
              orderId,
              product.id,
              product.name,
              product.sku,
              unitPrice,
              lineUnitTotal,
              product.warranty_months,
              ...warrantyColumns
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
              warranty_package_price
            )
            VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            ...warrantyColumns
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
      total_amount: totalAmount
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createOrder
};
