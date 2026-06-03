require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const bcrypt = require("bcryptjs");
const pool = require("../src/config/database");

const CONFIRM_ENV = "CONFIRM_DEMO_BUSINESS_DATA";
const DEMO_PASSWORD = "Password123!";
const DEMO_MARKER = "[DEMO_BUSINESS_DATA]";
const ORDER_PREFIX = "DEMO-BIZ-";
const TICKET_PREFIX = "DEMO-WT-";
const SERIAL_PREFIX = "BIZ-DEMO";
const SHIPPING_THRESHOLD = 3000000;
const SHIPPING_FEE = 40000;

const DEMO_CUSTOMERS = [
  ["demo.long@example.com", "Trần Minh Long", "0901000001", "22 Nguyễn Huệ"],
  ["demo.khach@example.com", "Nguyễn Văn Khách", "0901000002", "18 Lê Lợi"],
  ["demo.anh@example.com", "Phạm Gia Anh", "0901000003", "45 Cách Mạng Tháng Tám"],
  ["demo.minh@example.com", "Lê Minh Đức", "0901000004", "102 Hai Bà Trưng"],
  ["demo.hoa@example.com", "Võ Thanh Hòa", "0901000005", "9 Trần Hưng Đạo"],
  ["demo.linh@example.com", "Đỗ Mỹ Linh", "0901000006", "71 Pasteur"],
  ["demo.khang@example.com", "Bùi Quốc Khang", "0901000007", "33 Điện Biên Phủ"],
  ["demo.trang@example.com", "Hoàng Thu Trang", "0901000008", "16 Nguyễn Trãi"],
  ["demo.phuc@example.com", "Mai Hữu Phúc", "0901000009", "88 Lý Thường Kiệt"],
  ["demo.van@example.com", "Đặng Bảo Vân", "0901000010", "12 Phan Đình Phùng"]
];

const REVIEW_COMMENTS = [
  "Máy đóng gói kỹ, hiệu năng đúng như tư vấn.",
  "Sản phẩm hoạt động ổn, giao hàng nhanh.",
  "Cấu hình phù hợp nhu cầu học tập và làm việc.",
  "Shop hỗ trợ cài đặt ban đầu rất tốt.",
  "Màn hình và bàn phím dùng thoải mái.",
  "Giá hợp lý, thông tin sản phẩm rõ ràng.",
  "Đã dùng vài ngày, chưa gặp lỗi.",
  "Tư vấn chọn cấu hình khá sát nhu cầu.",
  "Phụ kiện đi kèm đầy đủ.",
  "Bảo hành điện tử tra cứu được serial."
];

const WARRANTY_STATUSES = [
  "received",
  "repairing",
  "waiting_parts",
  "done",
  "returned",
  "rejected",
  "received",
  "repairing",
  "waiting_parts",
  "done"
];

function assertCanRun() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Không chạy seed demo business data trong NODE_ENV=production.");
  }

  if (process.env[CONFIRM_ENV] !== "YES") {
    throw new Error(`Đặt ${CONFIRM_ENV}=YES trước khi chạy script này.`);
  }
}

function createStats() {
  return {
    usersInserted: 0,
    usersUpdated: 0,
    addressesInserted: 0,
    promotionsUpserted: 0,
    warrantyPackagesUpserted: 0,
    bundleOffersUpserted: 0,
    serialsInserted: 0,
    serialsAssigned: 0,
    ordersInserted: 0,
    ordersSkipped: 0,
    orderItemsInserted: 0,
    orderEventsInserted: 0,
    productStockAdjusted: 0,
    reviewsInserted: 0,
    reviewsSkipped: 0,
    warrantyTicketsInserted: 0,
    warrantyTicketsSkipped: 0
  };
}

async function queryOne(connection, sql, params) {
  const [rows] = await connection.execute(sql, params);
  return rows[0] || null;
}

function toNumber(value) {
  if (value === null || value === undefined) {
    return 0;
  }
  return Number(value);
}

function productPrice(product) {
  const salePrice = toNumber(product.sale_price);
  const basePrice = toNumber(product.base_price);
  return salePrice > 0 ? salePrice : basePrice;
}

function formatDateTime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function daysAgo(days, hour) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour || 9, 0, 0, 0);
  return formatDateTime(date);
}

function datePart(mysqlDateTime) {
  return String(mysqlDateTime).slice(0, 10);
}

function cleanSerialPart(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 46);
}

async function ensureDemoUsers(connection, passwordHash, stats) {
  const customers = [];

  for (let index = 0; index < DEMO_CUSTOMERS.length; index += 1) {
    const [email, fullName, phone, addressLine] = DEMO_CUSTOMERS[index];
    const existing = await queryOne(connection, "SELECT id FROM users WHERE email = ? LIMIT 1", [email]);

    if (existing) {
      await connection.execute(
        `
          UPDATE users
          SET full_name = ?, phone = ?, role = 'customer', status = 'active'
          WHERE id = ?
        `,
        [fullName, phone, existing.id]
      );
      stats.usersUpdated += 1;
      customers.push({ id: existing.id, email, full_name: fullName, phone, address_line: addressLine });
    } else {
      const [result] = await connection.execute(
        `
          INSERT INTO users (full_name, email, phone, password_hash, role, status)
          VALUES (?, ?, ?, ?, 'customer', 'active')
        `,
        [fullName, email, phone, passwordHash]
      );
      stats.usersInserted += 1;
      customers.push({ id: result.insertId, email, full_name: fullName, phone, address_line: addressLine });
    }
  }

  const lockedEmail = "demo.locked@example.com";
  const locked = await queryOne(connection, "SELECT id FROM users WHERE email = ? LIMIT 1", [lockedEmail]);
  if (locked) {
    await connection.execute(
      "UPDATE users SET full_name = ?, phone = ?, role = 'customer', status = 'inactive' WHERE id = ?",
      ["Tài khoản demo bị khóa", "0901000999", locked.id]
    );
    stats.usersUpdated += 1;
  } else {
    await connection.execute(
      `
        INSERT INTO users (full_name, email, phone, password_hash, role, status)
        VALUES (?, ?, ?, ?, 'customer', 'inactive')
      `,
      ["Tài khoản demo bị khóa", lockedEmail, "0901000999", passwordHash]
    );
    stats.usersInserted += 1;
  }

  for (const customer of customers) {
    const existingAddress = await queryOne(
      connection,
      "SELECT id FROM customer_addresses WHERE user_id = ? AND address_line = ? LIMIT 1",
      [customer.id, customer.address_line]
    );

    if (!existingAddress) {
      await connection.execute(
        `
          INSERT INTO customer_addresses (
            user_id,
            receiver_name,
            receiver_phone,
            province,
            district,
            ward,
            address_line,
            is_default
          )
          VALUES (?, ?, ?, 'TP. Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé', ?, 1)
        `,
        [customer.id, customer.full_name, customer.phone, customer.address_line]
      );
      stats.addressesInserted += 1;
    }
  }

  return customers;
}

async function ensureCommercialFixtures(connection, products, stats) {
  const year = new Date().getFullYear();
  const [promoResult] = await connection.execute(
    `
      INSERT INTO promotions (
        promo_code,
        title,
        description,
        promo_type,
        discount_type,
        discount_value,
        start_date,
        end_date,
        status
      )
      VALUES
        ('DEMO-TECH10', 'Giảm 10% phụ kiện demo', 'Mã ưu đãi dùng cho dữ liệu demo vận hành.', 'voucher', 'percent', 10, ?, ?, 'active'),
        ('DEMO-FREESHIP', 'Ưu đãi phí vận chuyển demo', 'Dữ liệu demo cho báo cáo khuyến mãi.', 'event', 'fixed', 40000, ?, ?, 'active')
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
    [`${year}-01-01`, `${year}-12-31`, `${year}-01-01`, `${year}-12-31`]
  );
  stats.promotionsUpserted += promoResult.affectedRows;

  const [warrantyResult] = await connection.execute(
    `
      INSERT INTO warranty_packages (package_code, title, duration_months, price, description, status)
      VALUES ('DEMO-CARE-12', 'Gia hạn bảo hành AeroCare 12 tháng', 12, 590000, 'Gói bảo hành mở rộng dùng cho dữ liệu demo.', 'active')
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        duration_months = VALUES(duration_months),
        price = VALUES(price),
        description = VALUES(description),
        status = VALUES(status)
    `
  );
  stats.warrantyPackagesUpserted += warrantyResult.affectedRows;

  const warrantyPackage = await queryOne(
    connection,
    "SELECT * FROM warranty_packages WHERE package_code = 'DEMO-CARE-12' LIMIT 1"
  );
  const promotion = await queryOne(
    connection,
    "SELECT * FROM promotions WHERE promo_code = 'DEMO-TECH10' LIMIT 1"
  );

  let bundleOffer = null;
  const physicalProducts = products.filter(function (product) {
    return product.product_type !== "service";
  });

  if (physicalProducts.length >= 2) {
    const mainProduct = physicalProducts[0];
    const addonProduct = physicalProducts.find(function (product) {
      return product.id !== mainProduct.id && !Number(product.requires_serial);
    }) || physicalProducts[1];

    bundleOffer = await queryOne(
      connection,
      `
        SELECT *
        FROM bundle_offers
        WHERE main_product_id = ? AND addon_product_id = ? AND title = 'Combo demo nâng cấp góc làm việc'
        LIMIT 1
      `,
      [mainProduct.id, addonProduct.id]
    );

    if (bundleOffer) {
      await connection.execute(
        `
          UPDATE bundle_offers
          SET discount_type = 'fixed',
              discount_value = 150000,
              bundle_price = ?,
              sort_order = 1,
              status = 'active'
          WHERE id = ?
        `,
        [Math.max(productPrice(addonProduct) - 150000, 0), bundleOffer.id]
      );
    } else {
      const [bundleResult] = await connection.execute(
        `
          INSERT INTO bundle_offers (
            main_product_id,
            addon_product_id,
            title,
            discount_type,
            discount_value,
            bundle_price,
            sort_order,
            status
          )
          VALUES (?, ?, 'Combo demo nâng cấp góc làm việc', 'fixed', 150000, ?, 1, 'active')
        `,
        [mainProduct.id, addonProduct.id, Math.max(productPrice(addonProduct) - 150000, 0)]
      );
      stats.bundleOffersUpserted += 1;
      bundleOffer = {
        id: bundleResult.insertId,
        main_product_id: mainProduct.id,
        addon_product_id: addonProduct.id,
        title: "Combo demo nâng cấp góc làm việc",
        discount_type: "fixed",
        discount_value: 150000,
        bundle_price: Math.max(productPrice(addonProduct) - 150000, 0)
      };
    }

    if (!bundleOffer.product) {
      bundleOffer.mainProduct = mainProduct;
      bundleOffer.addonProduct = addonProduct;
    }
  }

  return { promotion, warrantyPackage, bundleOffer };
}

async function loadProducts(connection) {
  const [rows] = await connection.execute(
    `
      SELECT
        p.*,
        b.name AS brand_name,
        c.name AS category_name
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.status = 'active'
      ORDER BY p.product_type ASC, p.requires_serial DESC, p.id ASC
    `
  );

  return rows;
}

function selectProduct(pool, index) {
  if (pool.length === 0) {
    return null;
  }

  return pool[index % pool.length];
}

async function ensureDemoSerials(connection, serializedProducts, stats) {
  for (const product of serializedProducts.slice(0, 8)) {
    const skuPart = cleanSerialPart(product.sku || product.id);

    for (let index = 1; index <= 8; index += 1) {
      const serialCode = `${SERIAL_PREFIX}-${skuPart}-${String(index).padStart(3, "0")}`;
      const existing = await queryOne(
        connection,
        "SELECT id FROM serial_numbers WHERE serial_code = ? LIMIT 1",
        [serialCode]
      );

      if (!existing) {
        await connection.execute(
          `
            INSERT INTO serial_numbers (product_id, serial_code, status, import_date, note)
            VALUES (?, ?, 'in_stock', CURRENT_DATE, ?)
          `,
          [product.id, serialCode, `${DEMO_MARKER} serial dự phòng cho demo`]
        );
        stats.serialsInserted += 1;
      }
    }
  }
}

async function claimDemoSerial(connection, product, soldDate, desiredStatus, stats) {
  const skuPart = cleanSerialPart(product.sku || product.id);
  let serial = await queryOne(
    connection,
    `
      SELECT id, serial_code
      FROM serial_numbers
      WHERE product_id = ?
        AND status = 'in_stock'
        AND serial_code LIKE ?
      ORDER BY id ASC
      LIMIT 1
      FOR UPDATE
    `,
    [product.id, `${SERIAL_PREFIX}-${skuPart}-%`]
  );

  if (!serial) {
    const serialCode = `${SERIAL_PREFIX}-${skuPart}-${Date.now()}`;
    const [result] = await connection.execute(
      `
        INSERT INTO serial_numbers (product_id, serial_code, status, import_date, note)
        VALUES (?, ?, 'in_stock', CURRENT_DATE, ?)
      `,
      [product.id, serialCode, `${DEMO_MARKER} serial bổ sung cho demo`]
    );
    stats.serialsInserted += 1;
    serial = { id: result.insertId, serial_code: serialCode };
  }

  await connection.execute(
    "UPDATE serial_numbers SET status = ?, sold_date = ?, note = ? WHERE id = ?",
    [desiredStatus, soldDate, `${DEMO_MARKER} serial đã gán cho đơn demo`, serial.id]
  );
  stats.serialsAssigned += 1;

  return serial;
}

function buildOrderSpecs(customers, products, fixtures) {
  const serialized = products.filter(function (product) {
    return Number(product.requires_serial) === 1 && product.product_type !== "service";
  });
  const nonSerialized = products.filter(function (product) {
    return Number(product.requires_serial) !== 1 && product.product_type !== "service" && toNumber(product.stock_quantity) > 4;
  });
  const services = products.filter(function (product) {
    return product.product_type === "service";
  });

  if (nonSerialized.length === 0 && serialized.length === 0) {
    throw new Error("Không có sản phẩm active phù hợp để tạo dữ liệu đơn hàng demo.");
  }

  const statuses = [
    "completed",
    "completed",
    "completed",
    "completed",
    "completed",
    "completed",
    "completed",
    "completed",
    "completed",
    "completed",
    "shipping",
    "shipping",
    "shipping",
    "shipping",
    "approved",
    "approved",
    "approved",
    "approved",
    "pending",
    "pending",
    "pending",
    "pending",
    "pending",
    "cancelled",
    "cancelled",
    "cancelled",
    "completed",
    "completed",
    "completed",
    "completed"
  ];

  return statuses.map(function (status, index) {
    const orderNumber = String(index + 1).padStart(4, "0");
    const customer = customers[index % customers.length];
    const createdAt = daysAgo(52 - index * 2, 9 + (index % 6));
    const items = [];

    if (index >= 26) {
      serialized.slice(0, 2).forEach(function (product) {
        items.push({
          product,
          quantity: 1,
          withWarrantyPackage: Boolean(fixtures.warrantyPackage && index % 2 === 0)
        });
      });

      nonSerialized.slice(index % Math.max(nonSerialized.length, 1)).concat(nonSerialized).slice(0, 3).forEach(function (product) {
        if (!items.some(function (item) { return item.product.id === product.id; })) {
          items.push({
            product,
            quantity: 1,
            withWarrantyPackage: false
          });
        }
      });

      return {
        code: `${ORDER_PREFIX}${orderNumber}`,
        status,
        customer,
        createdAt,
        paymentMethod: index % 2 === 0 ? "cod" : "bank_transfer",
        usePromotion: Boolean(fixtures.promotion && index % 2 === 1),
        items
      };
    }

    const shouldUseSerial = serialized.length > 0 && (status === "completed" || status === "shipping") && index % 2 === 0;
    const primaryProduct = shouldUseSerial
      ? selectProduct(serialized, index)
      : selectProduct(nonSerialized, index) || selectProduct(serialized, index);

    if (primaryProduct) {
      items.push({
        product: primaryProduct,
        quantity: Number(primaryProduct.requires_serial) ? 1 : (index % 3 === 0 ? 2 : 1),
        withWarrantyPackage: Boolean(fixtures.warrantyPackage && status === "completed" && index % 5 === 0)
      });
    }

    const extraProduct = selectProduct(nonSerialized.filter(function (product) {
      return !primaryProduct || product.id !== primaryProduct.id;
    }), index + 3);

    if (extraProduct && index % 3 === 1) {
      items.push({
        product: extraProduct,
        quantity: index % 4 === 0 ? 2 : 1,
        withWarrantyPackage: false
      });
    }

    if (services.length > 0 && index % 9 === 4) {
      items.push({
        product: selectProduct(services, index),
        quantity: 1,
        serviceLine: true
      });
    }

    if (fixtures.bundleOffer && fixtures.bundleOffer.mainProduct && fixtures.bundleOffer.addonProduct && index % 8 === 6) {
      items.length = 0;
      items.push({
        product: fixtures.bundleOffer.mainProduct,
        quantity: 1,
        bundleParentKey: `${ORDER_PREFIX}${orderNumber}-BUNDLE`
      });
      items.push({
        product: fixtures.bundleOffer.addonProduct,
        quantity: 1,
        bundleAddon: true,
        bundleParentKey: `${ORDER_PREFIX}${orderNumber}-BUNDLE`,
        bundleOffer: fixtures.bundleOffer
      });
    }

    return {
      code: `${ORDER_PREFIX}${orderNumber}`,
      status,
      customer,
      createdAt,
      paymentMethod: index % 2 === 0 ? "cod" : "bank_transfer",
      usePromotion: Boolean(fixtures.promotion && index % 6 === 2),
      items
    };
  });
}

function calculateOrderAmounts(spec, promotion) {
  const subtotal = spec.items.reduce(function (sum, item) {
    const unitPrice = item.bundleAddon && item.bundleOffer && item.bundleOffer.bundle_price !== null
      ? toNumber(item.bundleOffer.bundle_price)
      : productPrice(item.product);
    const warrantyPrice = item.withWarrantyPackage ? 590000 : 0;
    return sum + unitPrice * item.quantity + warrantyPrice;
  }, 0);

  const shippingFee = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  let discountAmount = 0;

  if (spec.usePromotion && promotion) {
    if (promotion.discount_type === "percent") {
      discountAmount = Math.round(subtotal * toNumber(promotion.discount_value) / 100);
    } else if (promotion.discount_type === "fixed") {
      discountAmount = toNumber(promotion.discount_value);
    }
  }

  discountAmount = Math.min(discountAmount, subtotal + shippingFee);

  return {
    subtotal,
    shippingFee,
    discountAmount,
    total: Math.max(subtotal + shippingFee - discountAmount, 0)
  };
}

async function insertOrderEvent(connection, orderId, actor, event, createdAt, stats) {
  await connection.execute(
    `
      INSERT INTO order_events (
        order_id,
        actor_user_id,
        actor_name,
        actor_role,
        event_type,
        from_status,
        to_status,
        note,
        customer_visible,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      orderId,
      actor ? actor.id : null,
      actor ? actor.full_name : "AeroTech",
      actor ? actor.role : "system",
      event.event_type,
      event.from_status || null,
      event.to_status || null,
      event.note,
      event.customer_visible ? 1 : 0,
      createdAt
    ]
  );
  stats.orderEventsInserted += 1;
}

function orderStatusEvents(status) {
  const events = [
    { event_type: "created", note: "Đơn demo được tạo.", customer_visible: 1 }
  ];

  if (["approved", "shipping", "completed"].includes(status)) {
    events.push({
      event_type: "status_changed",
      from_status: "pending",
      to_status: "approved",
      note: "Sales duyệt đơn demo.",
      customer_visible: 1
    });
  }

  if (["shipping", "completed"].includes(status)) {
    events.push({
      event_type: "status_changed",
      from_status: "approved",
      to_status: "shipping",
      note: "Đơn demo chuyển sang giao hàng.",
      customer_visible: 1
    });
  }

  if (status === "completed") {
    events.push({
      event_type: "status_changed",
      from_status: "shipping",
      to_status: "completed",
      note: "Đơn demo hoàn tất.",
      customer_visible: 1
    });
  }

  if (status === "cancelled") {
    events.push({
      event_type: "status_changed",
      from_status: "pending",
      to_status: "cancelled",
      note: "Đơn demo bị hủy trước khi xử lý.",
      customer_visible: 1
    });
  }

  return events;
}

async function insertDemoOrder(connection, spec, fixtures, actor, stats) {
  const existingOrder = await queryOne(
    connection,
    "SELECT id FROM orders WHERE order_code = ? LIMIT 1",
    [spec.code]
  );

  if (existingOrder) {
    stats.ordersSkipped += 1;
    return existingOrder.id;
  }

  const amounts = calculateOrderAmounts(spec, spec.usePromotion ? fixtures.promotion : null);
  const paymentStatus = spec.status === "completed" ? "paid" : "unpaid";
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
        note,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'TP. Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      spec.code,
      spec.customer.id,
      spec.customer.full_name,
      spec.customer.phone,
      spec.customer.email,
      spec.customer.address_line,
      spec.paymentMethod,
      paymentStatus,
      spec.status,
      amounts.subtotal,
      amounts.shippingFee,
      amounts.discountAmount,
      spec.usePromotion && fixtures.promotion ? fixtures.promotion.id : null,
      spec.usePromotion && fixtures.promotion ? fixtures.promotion.promo_code : null,
      spec.usePromotion && fixtures.promotion ? fixtures.promotion.title : null,
      amounts.total,
      `${DEMO_MARKER} Đơn hàng demo cho sales/admin/reports.`,
      spec.createdAt,
      spec.createdAt
    ]
  );

  const orderId = orderResult.insertId;
  stats.ordersInserted += 1;

  for (const item of spec.items) {
    const product = item.product;
    const isSerialized = Number(product.requires_serial) === 1;
    let serial = null;
    let serialStatus = "sold";

    if (isSerialized && ["shipping", "completed"].includes(spec.status)) {
      serialStatus = "sold";
      serial = await claimDemoSerial(connection, product, datePart(spec.createdAt), serialStatus, stats);
    }

    const unitPrice = item.bundleAddon && item.bundleOffer && item.bundleOffer.bundle_price !== null
      ? toNumber(item.bundleOffer.bundle_price)
      : productPrice(product);
    const warrantyPackage = item.withWarrantyPackage ? fixtures.warrantyPackage : null;
    const warrantyPackagePrice = warrantyPackage ? toNumber(warrantyPackage.price) : 0;
    const totalPrice = unitPrice * item.quantity + warrantyPackagePrice;

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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        orderId,
        product.id,
        serial ? serial.id : null,
        product.name,
        product.sku,
        unitPrice,
        item.quantity,
        totalPrice,
        product.warranty_months || 0,
        warrantyPackage ? warrantyPackage.id : null,
        warrantyPackage ? warrantyPackage.title : null,
        warrantyPackage ? warrantyPackage.duration_months : null,
        warrantyPackagePrice,
        item.bundleAddon ? 1 : 0,
        item.bundleParentKey || null,
        item.bundleAddon && item.bundleOffer ? item.bundleOffer.main_product_id : null,
        item.bundleAddon && item.bundleOffer && item.bundleOffer.mainProduct ? item.bundleOffer.mainProduct.name : null,
        item.bundleAddon && item.bundleOffer ? item.bundleOffer.id : null,
        item.bundleAddon && item.bundleOffer ? item.bundleOffer.title : null,
        item.bundleAddon && item.bundleOffer ? item.bundleOffer.discount_type : null,
        item.bundleAddon && item.bundleOffer ? item.bundleOffer.discount_value : null,
        item.bundleAddon ? productPrice(product) : null,
        item.bundleAddon ? unitPrice : null
      ]
    );
    stats.orderItemsInserted += 1;

    if (serial) {
      await insertOrderEvent(connection, orderId, actor, {
        event_type: "serial_assigned",
        note: `Gán serial demo ${serial.serial_code}.`,
        customer_visible: 0
      }, spec.createdAt, stats);
    }

    if (spec.status === "completed" && !isSerialized && product.product_type !== "service") {
      const lockedProduct = await queryOne(
        connection,
        "SELECT stock_quantity FROM products WHERE id = ? FOR UPDATE",
        [product.id]
      );
      const currentStock = lockedProduct ? Number(lockedProduct.stock_quantity) : 0;

      if (currentStock < item.quantity) {
        throw new Error(`Sản phẩm ${product.sku} không đủ tồn kho để tạo đơn completed demo.`);
      }

      await connection.execute(
        "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?",
        [item.quantity, product.id]
      );
      stats.productStockAdjusted += item.quantity;
    }
  }

  for (const event of orderStatusEvents(spec.status)) {
    await insertOrderEvent(connection, orderId, actor, event, spec.createdAt, stats);
  }

  return orderId;
}

async function seedDemoOrders(connection, customers, products, fixtures, stats) {
  const actor = await queryOne(
    connection,
    "SELECT id, full_name, role FROM users WHERE role IN ('sales', 'admin') AND status = 'active' ORDER BY FIELD(role, 'sales', 'admin'), id ASC LIMIT 1"
  );
  const serializedProducts = products.filter(function (product) {
    return Number(product.requires_serial) === 1 && product.product_type !== "service";
  });
  const specs = buildOrderSpecs(customers, products, fixtures);

  await ensureDemoSerials(connection, serializedProducts, stats);

  for (const spec of specs) {
    await insertDemoOrder(connection, spec, fixtures, actor, stats);
  }
}

async function seedDemoReviews(connection, stats) {
  const [eligibleRows] = await connection.execute(
    `
      SELECT DISTINCT
        o.user_id,
        oi.product_id,
        p.name AS product_name
      FROM orders o
      INNER JOIN order_items oi ON oi.order_id = o.id
      INNER JOIN products p ON p.id = oi.product_id
      WHERE o.order_code LIKE ?
        AND o.status = 'completed'
        AND o.user_id IS NOT NULL
      ORDER BY o.created_at DESC, oi.id ASC
      LIMIT 40
    `,
    [`${ORDER_PREFIX}%`]
  );

  for (let index = 0; index < eligibleRows.length && index < 35; index += 1) {
    const row = eligibleRows[index];
    const existing = await queryOne(
      connection,
      "SELECT id FROM product_reviews WHERE user_id = ? AND product_id = ? LIMIT 1",
      [row.user_id, row.product_id]
    );

    if (existing) {
      stats.reviewsSkipped += 1;
      continue;
    }

    const status = index % 14 === 5 ? "pending" : (index % 17 === 8 ? "rejected" : "approved");
    const rating = status === "rejected" ? 3 : (index % 5 === 0 ? 4 : 5);
    const comment = REVIEW_COMMENTS[index % REVIEW_COMMENTS.length];

    await connection.execute(
      `
        INSERT INTO product_reviews (product_id, user_id, rating, comment, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [row.product_id, row.user_id, rating, comment, status, daysAgo(25 - (index % 18), 14)]
    );
    stats.reviewsInserted += 1;
  }
}

async function seedDemoWarrantyTickets(connection, stats) {
  const [eligibleRows] = await connection.execute(
    `
      SELECT
        oi.id AS order_item_id,
        oi.serial_number_id,
        o.user_id,
        o.customer_name,
        o.customer_phone,
        o.created_at
      FROM orders o
      INNER JOIN order_items oi ON oi.order_id = o.id
      WHERE o.order_code LIKE ?
        AND o.status = 'completed'
        AND oi.serial_number_id IS NOT NULL
      ORDER BY o.created_at ASC, oi.id ASC
      LIMIT 12
    `,
    [`${ORDER_PREFIX}%`]
  );

  for (let index = 0; index < eligibleRows.length && index < 10; index += 1) {
    const row = eligibleRows[index];
    const ticketCode = `${TICKET_PREFIX}${String(index + 1).padStart(3, "0")}`;
    const existing = await queryOne(
      connection,
      "SELECT id FROM warranty_tickets WHERE ticket_code = ? LIMIT 1",
      [ticketCode]
    );

    if (existing) {
      stats.warrantyTicketsSkipped += 1;
      continue;
    }

    const status = WARRANTY_STATUSES[index % WARRANTY_STATUSES.length];
    const receivedDate = daysAgo(14 - index, 10);
    const completedDate = ["done", "returned", "rejected"].includes(status) ? datePart(daysAgo(8 - Math.min(index, 6), 16)) : null;

    await connection.execute(
      `
        INSERT INTO warranty_tickets (
          ticket_code,
          serial_number_id,
          order_item_id,
          customer_id,
          customer_name,
          customer_phone,
          issue_description,
          technician_note,
          status,
          received_date,
          completed_date,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        ticketCode,
        row.serial_number_id,
        row.order_item_id,
        row.user_id,
        row.customer_name,
        row.customer_phone,
        "Khách báo sản phẩm cần kiểm tra trong dữ liệu demo.",
        `${DEMO_MARKER} Phiếu bảo hành demo cho technician.`,
        status,
        datePart(receivedDate),
        completedDate,
        receivedDate,
        receivedDate
      ]
    );

    await connection.execute(
      "UPDATE serial_numbers SET status = ? WHERE id = ?",
      [["returned", "rejected"].includes(status) ? "sold" : "warranty", row.serial_number_id]
    );

    stats.warrantyTicketsInserted += 1;
  }
}

async function collectVerification(connection) {
  const demoCustomers = await queryOne(
    connection,
    "SELECT COUNT(*) AS total FROM users WHERE email LIKE 'demo.%@example.com' AND role = 'customer'",
    []
  );
  const ordersByStatus = await connection.execute(
    `
      SELECT status, COUNT(*) AS total
      FROM orders
      WHERE order_code LIKE ?
      GROUP BY status
      ORDER BY status
    `,
    [`${ORDER_PREFIX}%`]
  );
  const reviews = await queryOne(
    connection,
    `
      SELECT COUNT(*) AS total
      FROM product_reviews pr
      INNER JOIN users u ON u.id = pr.user_id
      WHERE u.email LIKE 'demo.%@example.com'
    `,
    []
  );
  const tickets = await queryOne(
    connection,
    "SELECT COUNT(*) AS total FROM warranty_tickets WHERE ticket_code LIKE ?",
    [`${TICKET_PREFIX}%`]
  );
  const soldSerials = await queryOne(
    connection,
    "SELECT COUNT(*) AS total FROM serial_numbers WHERE serial_code LIKE ? AND status IN ('sold', 'warranty')",
    [`${SERIAL_PREFIX}-%`]
  );
  const inStockSerials = await queryOne(
    connection,
    "SELECT COUNT(*) AS total FROM serial_numbers WHERE serial_code LIKE ? AND status = 'in_stock'",
    [`${SERIAL_PREFIX}-%`]
  );

  return {
    demoCustomerCount: Number(demoCustomers.total),
    ordersByStatus: ordersByStatus[0],
    reviewCount: Number(reviews.total),
    warrantyTicketCount: Number(tickets.total),
    soldOrWarrantyDemoSerialCount: Number(soldSerials.total),
    inStockDemoSerialCount: Number(inStockSerials.total)
  };
}

async function main() {
  assertCanRun();

  const connection = await pool.getConnection();
  const stats = createStats();

  try {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    await connection.beginTransaction();

    const products = await loadProducts(connection);
    const customers = await ensureDemoUsers(connection, passwordHash, stats);
    const fixtures = await ensureCommercialFixtures(connection, products, stats);

    await seedDemoOrders(connection, customers, products, fixtures, stats);
    await seedDemoReviews(connection, stats);
    await seedDemoWarrantyTickets(connection, stats);

    const verification = await collectVerification(connection);

    await connection.commit();

    console.log("Seed demo business data hoàn tất.");
    console.log("Mật khẩu các tài khoản demo.*@example.com:", DEMO_PASSWORD);
    console.log("Thống kê thao tác:");
    console.table(stats);
    console.log("Kiểm chứng dữ liệu:");
    console.log(JSON.stringify(verification, null, 2));
  } catch (error) {
    await connection.rollback();
    console.error("Seed demo business data thất bại:", error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

main();
