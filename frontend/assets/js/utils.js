const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480' viewBox='0 0 640 480'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop stop-color='%23070b14'/%3E%3Cstop offset='1' stop-color='%23111827'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='640' height='480' fill='url(%23g)'/%3E%3Crect x='82' y='92' width='476' height='292' rx='22' fill='%230b1120' stroke='%23263244'/%3E%3Cpath d='M166 324h308l-95-108-63 70-46-50z' fill='%2306eaff' opacity='.72'/%3E%3Ccircle cx='238' cy='184' r='34' fill='%238b5cf6' opacity='.45'/%3E%3Ctext x='320' y='425' text-anchor='middle' font-family='Arial' font-size='31' font-weight='700' fill='%23f8fafc'%3EAeroTech%3C/text%3E%3C/svg%3E";

const PRODUCT_FALLBACK_DEFINITIONS = {
  default: { label: "AeroTech", accent: "#06eaff", glow: "#0f766e", icon: "A" },
  laptop: { label: "Laptop", accent: "#38bdf8", glow: "#1d4ed8", icon: "LT" },
  pc_build: { label: "PC Build", accent: "#22d3ee", glow: "#0f766e", icon: "PC" },
  component: { label: "Linh kiện", accent: "#a3e635", glow: "#3f6212", icon: "HW" },
  monitor: { label: "Màn hình", accent: "#60a5fa", glow: "#1e40af", icon: "4K" },
  accessory: { label: "Phụ kiện", accent: "#f59e0b", glow: "#92400e", icon: "GEAR" },
  service: { label: "Dịch vụ", accent: "#34d399", glow: "#065f46", icon: "DV" }
};

function createProductFallbackImage(definition) {
  const item = definition || PRODUCT_FALLBACK_DEFINITIONS.default;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="#07111f"/>
          <stop offset="1" stop-color="#111827"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="42%" r="50%">
          <stop stop-color="${item.glow}" stop-opacity=".72"/>
          <stop offset="1" stop-color="${item.glow}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="640" height="480" fill="url(#bg)"/>
      <circle cx="320" cy="210" r="190" fill="url(#glow)"/>
      <rect x="96" y="86" width="448" height="278" rx="24" fill="#0b1220" stroke="#263244" stroke-width="2"/>
      <rect x="132" y="124" width="376" height="168" rx="18" fill="#101827" stroke="${item.accent}" stroke-opacity=".55"/>
      <text x="320" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="800" fill="${item.accent}">${item.icon}</text>
      <text x="320" y="333" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="700" fill="#f8fafc">${item.label}</text>
      <text x="320" y="389" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#94a3b8">AeroTech</text>
    </svg>
  `.trim();

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const PRODUCT_FALLBACK_IMAGES = Object.keys(PRODUCT_FALLBACK_DEFINITIONS).reduce(function (images, key) {
  images[key] = createProductFallbackImage(PRODUCT_FALLBACK_DEFINITIONS[key]);
  return images;
}, {});
const PRODUCT_PLACEHOLDER_IMAGE = PRODUCT_FALLBACK_IMAGES.default;
const EMPTY_CART_IMAGE = "/assets/images/empty-states/empty-cart.svg";
const ACCESS_DENIED_IMAGE = "/assets/images/empty-states/access-denied.svg";
const BANNER_IMAGES = {
  pc_build: "/assets/images/banners/banner-pc-build.webp",
  laptop: "/assets/images/banners/banner-laptop.webp",
  component: "/assets/images/banners/banner-components.webp",
  monitor: "/assets/images/banners/banner-monitor.webp",
  accessory: "/assets/images/banners/banner-accessories.webp",
  service: PRODUCT_FALLBACK_IMAGES.service
};
const SERVICE_ILLUSTRATION_IMAGES = {
  windows: "assets/images/services/windows-software.svg",
  cable: "assets/images/services/cable-setup.svg",
  upgrade: "assets/images/services/ram-ssd-upgrade.svg",
  build: "assets/images/services/custom-pc-build.svg",
  cleaning: "assets/images/services/cleaning-service.svg",
  default: "assets/images/services/custom-pc-build.svg"
};

function escapeHtml(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function formatCurrency(value) {
  if (value === null || value === undefined) {
    return "Liên hệ";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatDateOnly(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short"
  }).format(new Date(value));
}

function getProductTypeLabel(type) {
  const labels = {
    pc_build: "PC Build",
    laptop: "Laptop",
    component: "Linh kiện PC",
    monitor: "Màn hình",
    accessory: "Phụ kiện",
    service: "Dịch vụ kỹ thuật"
  };

  return labels[type] || "Sản phẩm";
}

function getCatalogStatusLabel(status) {
  const labels = {
    active: "Đang hoạt động",
    inactive: "Ngừng hoạt động"
  };

  return labels[status] || status || "";
}

function getStockLabel(product) {
  if (product.product_type === "service") {
    return "Có thể đặt lịch tư vấn";
  }

  if (Number(product.available_stock) > 0) {
    return `Còn ${product.available_stock} sản phẩm`;
  }

  return "Tạm hết hàng";
}

function getOrderStatusLabel(status) {
  const labels = {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    shipping: "Đang giao",
    completed: "Hoàn thành",
    cancelled: "Đã hủy"
  };

  return labels[status] || status;
}

function getPaymentMethodLabel(method) {
  const labels = {
    cod: "Thanh toán khi nhận hàng",
    bank_transfer: "Chuyển khoản"
  };

  return labels[method] || method;
}

function getPaymentStatusLabel(status) {
  const labels = {
    unpaid: "Chưa thanh toán",
    paid: "Đã thanh toán",
    refunded: "Đã hoàn tiền"
  };

  return labels[status] || status;
}

function getSerialStatusLabel(status) {
  const labels = {
    in_stock: "Trong kho",
    sold: "Đã bán",
    warranty: "Đang bảo hành",
    returned: "Hàng trả về shop"
  };

  return labels[status] || status;
}

function getWarrantyStatusLabel(status) {
  const labels = {
    received: "Đã tiếp nhận",
    repairing: "Đang sửa",
    waiting_parts: "Chờ linh kiện",
    done: "Hoàn tất sửa chữa",
    returned: "Đã trả khách",
    rejected: "Từ chối bảo hành"
  };

  return labels[status] || status;
}

function isServiceProduct(product) {
  return product && product.product_type === "service";
}

function getProductFallbackKey(product) {
  const type = product && product.product_type;

  if (PRODUCT_FALLBACK_IMAGES[type]) {
    return type;
  }

  const categorySlug = product && product.category && product.category.slug
    ? product.category.slug
    : (product && (product.category_slug || product.category_name || ""));
  const bannerKey = getBannerKeyFromSlug(categorySlug);

  return PRODUCT_FALLBACK_IMAGES[bannerKey] ? bannerKey : "default";
}

function getProductImageFallback(product) {
  if (isServiceProduct(product)) {
    return getServiceIllustrationImage(product);
  }

  return PRODUCT_FALLBACK_IMAGES[getProductFallbackKey(product)] || PRODUCT_PLACEHOLDER_IMAGE;
}

function getFrontendAssetPath(relativePath) {
  const cleanPath = String(relativePath || "").replace(/^\/+/, "");
  const isAdminPage = window.location.pathname.includes("/admin/");

  return `${isAdminPage ? "../" : ""}${cleanPath}`;
}

function getProductTypeIconKey(product) {
  const text = [
    product && product.sku,
    product && product.product_type,
    product && product.category_slug,
    product && product.category_name,
    product && product.name
  ].filter(Boolean).join(" ").toLowerCase();

  if (text.includes("laptop") || text.includes("macbook")) return "laptop";
  if (text.includes("pc_build") || text.includes("pc build") || text.includes("pc-") || text.includes("build pc")) return "pc-build";
  if (text.includes("cpu") || text.includes("processor")) return "cpu";
  if (text.includes("vga") || text.includes("gpu") || text.includes("card đồ họa") || text.includes("graphics")) return "gpu";
  if (text.includes("mainboard") || text.includes("motherboard")) return "mainboard";
  if (text.includes("ram") || text.includes("memory")) return "ram";
  if (text.includes("ssd") || text.includes("hdd") || text.includes("storage") || text.includes("lưu trữ")) return "storage";
  if (text.includes("monitor") || text.includes("màn hình") || text.includes("man-hinh")) return "monitor";
  if (text.includes("keyboard") || text.includes("bàn phím") || text.includes("ban-phim") || text.includes("kb-")) return "keyboard";
  if (text.includes("mouse") || text.includes("chuột") || text.includes("chuot") || text.includes("chu-")) return "mouse";
  if (text.includes("headset") || text.includes("tai nghe") || text.includes("tai-")) return "headset";
  if (text.includes("chair") || text.includes("ghế") || text.includes("ghe-")) return "chair";
  if (text.includes("webcam") || text.includes("camera") || text.includes("cam-")) return "webcam";
  if (text.includes("service") || text.includes("dịch vụ") || text.includes("svc-")) return "service";
  if (text.includes("accessory") || text.includes("phụ kiện")) return "accessory";

  return "accessory";
}

function getProductTypeIconUrl(product) {
  return getFrontendAssetPath(`assets/icons/product-types/${getProductTypeIconKey(product)}.svg`);
}

function getFeatureIconKey(value) {
  const normalized = normalizeIconText(value);

  if (normalized.includes("cpu") || normalized.includes("hieu_nang") || normalized.includes("processor")) return "cpu";
  if (normalized.includes("gpu") || normalized.includes("vga") || normalized.includes("do_hoa") || normalized.includes("graphics")) return "gpu";
  if (normalized.includes("ram") || normalized.includes("memory") || normalized.includes("bo_nho")) return "ram";
  if (normalized.includes("ssd") || normalized.includes("hdd") || normalized.includes("storage") || normalized.includes("luu_tru")) return "storage";
  if (normalized.includes("display") || normalized.includes("screen") || normalized.includes("man_hinh")) return "monitor";
  if (normalized.includes("warranty") || normalized.includes("bao_hanh") || normalized.includes("shield")) return "shield";
  if (normalized.includes("upgrade") || normalized.includes("nang_cap")) return "arrow-up";
  if (normalized.includes("service") || normalized.includes("technical") || normalized.includes("ky_thuat") || normalized.includes("tool")) return "wrench";
  if (normalized.includes("delivery") || normalized.includes("giao_hang") || normalized.includes("truck")) return "truck";

  return "check";
}

function getFeatureIconUrl(value) {
  return getFrontendAssetPath(`assets/icons/product-types/${getFeatureIconKey(value)}.svg`);
}

function normalizeIconText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getImageUrl(imageUrl, product) {
  if (shouldUseServiceIllustration(imageUrl, product)) {
    return getServiceIllustrationImage(product);
  }

  return imageUrl && String(imageUrl).trim() ? imageUrl : getProductImageFallback(product);
}

function shouldUseServiceIllustration(imageUrl, product) {
  if (!isServiceProduct(product)) {
    return false;
  }

  const value = String(imageUrl || "").trim().toLowerCase();

  return !value || value.includes("assets/images/products/svc-");
}

function getServiceIllustrationImage(product) {
  const text = [
    product && product.sku,
    product && product.slug,
    product && product.name,
    product && product.category_name
  ].filter(Boolean).join(" ").toLowerCase();

  if (text.includes("install") || text.includes("windows") || text.includes("phan-mem") || text.includes("phần mềm")) {
    return getFrontendAssetPath(SERVICE_ILLUSTRATION_IMAGES.windows);
  }

  if (text.includes("cable") || text.includes("di-day") || text.includes("đi dây") || text.includes("setup")) {
    return getFrontendAssetPath(SERVICE_ILLUSTRATION_IMAGES.cable);
  }

  if (text.includes("upgrade") || text.includes("nang-cap") || text.includes("nâng cấp") || text.includes("ram") || text.includes("ssd")) {
    return getFrontendAssetPath(SERVICE_ILLUSTRATION_IMAGES.upgrade);
  }

  if (text.includes("clean") || text.includes("ve-sinh") || text.includes("vệ sinh")) {
    return getFrontendAssetPath(SERVICE_ILLUSTRATION_IMAGES.cleaning);
  }

  if (text.includes("build") || text.includes("tu-van") || text.includes("tư vấn") || text.includes("custom")) {
    return getFrontendAssetPath(SERVICE_ILLUSTRATION_IMAGES.build);
  }

  return getFrontendAssetPath(SERVICE_ILLUSTRATION_IMAGES.default);
}

function getBannerImageByKey(key) {
  return BANNER_IMAGES[key] || "";
}

function getBannerKeyFromSlug(slug) {
  const normalizedSlug = String(slug || "").toLowerCase();

  if (normalizedSlug.includes("pc-build") || normalizedSlug.includes("pc-gaming") || normalizedSlug.includes("pc-van-phong") || normalizedSlug.includes("pc-do-hoa") || normalizedSlug.includes("pc-workstation") || normalizedSlug.includes("build-pc")) {
    return "pc_build";
  }

  if (normalizedSlug.includes("laptop") || normalizedSlug.includes("ultrabook") || normalizedSlug.includes("macbook")) {
    return "laptop";
  }

  if (
    normalizedSlug.includes("linh-kien") ||
    normalizedSlug.includes("cpu") ||
    normalizedSlug.includes("mainboard") ||
    normalizedSlug.includes("vga") ||
    normalizedSlug.includes("ram") ||
    normalizedSlug.includes("ssd") ||
    normalizedSlug.includes("hdd") ||
    normalizedSlug.includes("nguon") ||
    normalizedSlug.includes("psu") ||
    normalizedSlug.includes("case") ||
    normalizedSlug.includes("tan-nhiet") ||
    normalizedSlug.includes("cooling")
  ) {
    return "component";
  }

  if (normalizedSlug.includes("man-hinh") || normalizedSlug.includes("monitor")) {
    return "monitor";
  }

  if (
    normalizedSlug.includes("dich-vu") ||
    normalizedSlug.includes("service") ||
    normalizedSlug.includes("ky-thuat") ||
    normalizedSlug.includes("technical") ||
    normalizedSlug.includes("trade-in")
  ) {
    return "service";
  }

  if (
    normalizedSlug.includes("phu-kien") ||
    normalizedSlug.includes("gaming-gear") ||
    normalizedSlug.includes("ban-phim") ||
    normalizedSlug.includes("keyboard") ||
    normalizedSlug.includes("chuot") ||
    normalizedSlug.includes("mouse") ||
    normalizedSlug.includes("tai-nghe") ||
    normalizedSlug.includes("headset") ||
    normalizedSlug.includes("lot-chuot") ||
    normalizedSlug.includes("mousepad") ||
    normalizedSlug.includes("webcam") ||
    normalizedSlug.includes("hub-cable") ||
    normalizedSlug.includes("gaming-chair") ||
    normalizedSlug.includes("controller")
  ) {
    return "accessory";
  }

  return "";
}

function getCategoryBannerImage(category) {
  return getBannerImageByKey(getBannerKeyFromSlug(category && category.slug));
}

function buildQueryString(values) {
  const params = new URLSearchParams();

  Object.keys(values).forEach(function (key) {
    const value = values[key];

    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  return params.toString();
}

function renderLoading(message) {
  return `<div class="loading-box"><span class="loading-dot"></span>${escapeHtml(message || "Đang tải...")}</div>`;
}

function renderError(message) {
  return `<div class="state-box state-error">${escapeHtml(message)}</div>`;
}

function renderSuccess(message) {
  return `<div class="state-box state-success">${escapeHtml(message)}</div>`;
}

function renderEmpty(message) {
  return `<div class="state-box">${escapeHtml(message)}</div>`;
}

function renderPrice(product) {
  if (product.sale_price) {
    return `
      <div class="price-row">
        <strong>${formatCurrency(product.sale_price)}</strong>
        <span>${formatCurrency(product.base_price)}</span>
      </div>
    `;
  }

  return `
    <div class="price-row">
      <strong>${formatCurrency(product.base_price)}</strong>
    </div>
  `;
}

function getEffectivePrice(product) {
  return Number(product.sale_price || product.base_price || product.price || 0);
}

function getCartProductPayload(product) {
  return {
    product_id: product.id || product.product_id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    image: getImageUrl(product.primary_image || product.image, product),
    fallback_image: getProductImageFallback(product),
    price: getEffectivePrice(product),
    quantity: 1,
    requires_serial: Boolean(product.requires_serial),
    available_stock: Number(product.available_stock || 0),
    product_type: product.product_type
  };
}

function getCompareProductPayload(product) {
  return {
    id: product.id || product.product_id,
    slug: product.slug,
    name: product.name,
    image: getImageUrl(product.primary_image || product.image, product),
    fallback_image: getProductImageFallback(product),
    price: getEffectivePrice(product),
    base_price: product.base_price,
    sale_price: product.sale_price,
    brand_name: product.brand_name || (product.brand && product.brand.name) || "",
    category_name: product.category_name || (product.category && product.category.name) || "",
    category_slug: product.category_slug || (product.category && product.category.slug) || "",
    product_type: product.product_type,
    available_stock: Number(product.available_stock || 0)
  };
}

function renderProductCard(product) {
  const detailsUrl = `product-detail.html?slug=${encodeURIComponent(product.slug)}`;
  const cartPayload = escapeAttribute(JSON.stringify(getCartProductPayload(product)));
  const comparePayload = escapeAttribute(JSON.stringify(getCompareProductPayload(product)));
  const imageFallback = getProductImageFallback(product);
  const isService = isServiceProduct(product);
  const visualKey = getProductTypeIconKey(product);
  const productTypeClass = product.product_type ? `product-card-type-${product.product_type}` : "";
  const visualClass = visualKey ? `product-card-visual-${visualKey}` : "";
  const specs = (product.short_specs || []).slice(0, 3).map(function (spec) {
    return `<li>${escapeHtml(spec)}</li>`;
  }).join("");
  const hasStock = Number(product.available_stock) > 0 || isService;
  const canBuy = !isService && Number(product.available_stock) > 0;
  const warrantyBadge = isService
    ? '<span class="warranty-badge">Theo dịch vụ</span>'
    : `<span class="warranty-badge">${escapeHtml(product.warranty_months)}T BH</span>`;
  const compareAction = isService ? "" : `
          <button
            class="btn btn-compare js-compare-toggle"
            type="button"
            data-compare-product="${comparePayload}"
            data-default-label="So sánh"
            data-selected-label="Đã chọn"
            aria-pressed="false"
          >So sánh</button>
        `;
  const actions = isService ? `
          <a class="btn btn-outline" href="${detailsUrl}">Chi tiết</a>
          <a class="btn btn-primary" href="contact.html">Liên hệ tư vấn</a>
          <button
            class="btn btn-light js-add-wishlist"
            type="button"
            data-product-id="${escapeAttribute(product.id)}"
            aria-label="Thêm vào yêu thích"
          >Yêu thích</button>
          ${compareAction}
        ` : `
          <a class="btn btn-outline" href="${detailsUrl}">Chi tiết</a>
          <button
            class="btn btn-primary js-add-cart"
            type="button"
            data-product="${cartPayload}"
            ${canBuy ? "" : "disabled"}
          >+ Giỏ hàng</button>
          <button
            class="btn btn-light js-add-wishlist"
            type="button"
            data-product-id="${escapeAttribute(product.id)}"
            aria-label="Thêm vào yêu thích"
          >Yêu thích</button>
          ${compareAction}
        `;

  return `
    <article class="product-card ${productTypeClass} ${visualClass} ${isService ? "product-card-service" : ""}">
      <a class="product-image-link" href="${detailsUrl}" aria-label="${escapeAttribute(product.name)}">
        <img
          src="${escapeAttribute(getImageUrl(product.primary_image, product))}"
          alt="${escapeAttribute(product.name)}"
          onerror="this.onerror=null;this.src='${escapeAttribute(imageFallback)}'"
        >
      </a>
      <div class="product-card-body">
        <div class="product-card-meta">
          <span>${escapeHtml(product.brand_name || product.category_name || "AeroTech")}</span>
          <span>${escapeHtml(getProductTypeLabel(product.product_type))}</span>
        </div>
        <h3><a href="${detailsUrl}">${escapeHtml(product.name)}</a></h3>
        <ul class="short-specs">${specs || "<li>Cấu hình đang được cập nhật</li>"}</ul>
        <div class="rating-row" aria-label="Đánh giá sản phẩm">
          <span>★ 5.0</span>
          <small>Đánh giá khách hàng</small>
        </div>
        ${renderPrice(product)}
        <div class="product-card-footer">
          <span class="stock-badge ${hasStock ? "in-stock" : "out-stock"}">
            ${escapeHtml(getStockLabel(product))}
          </span>
          ${warrantyBadge}
        </div>
        <div class="product-actions">
          ${actions}
        </div>
      </div>
    </article>
  `;
}

function renderOrderCard(order) {
  const imageFallback = getProductImageFallback(order);

  return `
    <article class="order-card">
      <img
        src="${escapeAttribute(getImageUrl(order.first_product_image, order))}"
        alt="${escapeAttribute(order.first_product_name || order.order_code)}"
        onerror="this.onerror=null;this.src='${escapeAttribute(imageFallback)}'"
      >
      <div>
        <div class="order-card-title">
          <strong>${escapeHtml(order.order_code)}</strong>
          <span class="status-badge ${escapeAttribute(order.status)}">${escapeHtml(getOrderStatusLabel(order.status))}</span>
        </div>
        <p>${escapeHtml(formatDateTime(order.created_at))}</p>
        <p>${escapeHtml(order.first_product_name || "Đơn hàng AeroTech")} ${order.item_count > 1 ? `+ ${order.item_count - 1} sản phẩm` : ""}</p>
      </div>
      <div class="order-card-total">
        <strong>${formatCurrency(order.total_amount)}</strong>
        <a class="btn btn-outline" href="order-detail.html?code=${encodeURIComponent(order.order_code)}">Xem chi tiết</a>
      </div>
    </article>
  `;
}

function flattenCategories(categories) {
  const result = [];

  categories.forEach(function (category) {
    result.push({
      id: category.id,
      name: category.name,
      slug: category.slug,
      level: 0
    });

    (category.children || []).forEach(function (child) {
      result.push({
        id: child.id,
        name: child.name,
        slug: child.slug,
        level: 1
      });
    });
  });

  return result;
}

function showToast(message, type) {
  let stack = document.getElementById("toastStack");

  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toastStack";
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "toast-error" : "toast-success"}`;
  toast.textContent = message;
  stack.appendChild(toast);

  window.setTimeout(function () {
    toast.remove();
  }, 3200);
}
