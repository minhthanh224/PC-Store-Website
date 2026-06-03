let catalogCategories = [];
let catalogBrands = [];
let catalogSpecFilters = [];

const SPEC_FILTER_PARAM_KEYS = [
  "cpu",
  "gpu",
  "ram",
  "storage",
  "display_size",
  "refresh_rate",
  "panel"
];

const CATEGORY_LABELS = {
  "laptop-gaming": "Laptop Gaming",
  "laptop-van-phong": "Laptop văn phòng",
  "laptop-sinh-vien": "Laptop sinh viên",
  ultrabook: "Ultrabook",
  "pc-gaming": "PC Gaming",
  "pc-van-phong": "PC văn phòng",
  "pc-do-hoa": "PC đồ họa",
  "pc-workstation": "PC workstation",
  "build-pc-theo-yeu-cau": "Build PC theo yêu cầu",
  cpu: "CPU",
  vga: "VGA / Card đồ họa",
  mainboard: "Mainboard",
  ram: "RAM",
  "ssd-hdd": "SSD / HDD",
  psu: "Nguồn máy tính",
  nguon: "Nguồn máy tính",
  case: "Case máy tính",
  cooling: "Tản nhiệt",
  "tan-nhiet": "Tản nhiệt",
  "monitor-gaming": "Màn hình gaming",
  "man-hinh-gaming": "Màn hình gaming",
  "monitor-van-phong": "Màn hình văn phòng",
  "man-hinh-van-phong": "Màn hình văn phòng",
  "monitor-do-hoa": "Màn hình đồ họa",
  "man-hinh-do-hoa": "Màn hình đồ họa",
  "monitor-cong": "Màn hình cong",
  "monitor-144hz": "Màn hình 144Hz+",
  keyboard: "Bàn phím",
  "ban-phim": "Bàn phím",
  mouse: "Chuột",
  chuot: "Chuột",
  headset: "Tai nghe",
  "tai-nghe": "Tai nghe",
  webcam: "Webcam",
  mousepad: "Lót chuột",
  "lot-chuot": "Lót chuột",
  "hub-cable": "Hub / Cáp sạc",
  "mechanical-keyboard": "Bàn phím cơ",
  "gaming-mouse": "Chuột gaming",
  "gaming-headset": "Tai nghe gaming",
  "gaming-chair": "Ghế gaming",
  controller: "Tay cầm",
  "build-pc-consulting": "Tư vấn build PC",
  "technical-service": "Dịch vụ kỹ thuật",
  "dich-vu-ky-thuat": "Dịch vụ kỹ thuật",
  "trade-in": "Thu cũ đổi mới"
};

const PRODUCT_TYPE_LABELS = {
  laptop: "Laptop",
  pc_build: "PC Build",
  component: "Linh kiện PC",
  monitor: "Màn hình",
  accessory: "Phụ kiện",
  service: "Dịch vụ"
};

const BRAND_LABELS = {
  apple: "Apple"
};

document.addEventListener("DOMContentLoaded", function () {
  initProductsPage();
});

async function initProductsPage() {
  if (redirectLegacyServiceCatalogUrl()) {
    return;
  }

  await loadSiteLayout();
  await loadFilterData();
  bindCatalogEvents();
  await loadProductsFromUrl();
}

function redirectLegacyServiceCatalogUrl() {
  const params = new URLSearchParams(window.location.search);
  const productType = params.get("productType") || "";
  const category = params.get("category") || "";
  const serviceCategories = ["dich-vu", "dich-vu-ky-thuat", "technical-service", "trade-in"];

  if (productType === "service" || serviceCategories.includes(category)) {
    window.location.replace("services.html");
    return true;
  }

  return false;
}

async function loadFilterData() {
  const [categoriesResponse, brandsResponse, specFiltersResponse] = await Promise.all([
    apiGet("/categories?tree=true"),
    apiGet("/brands"),
    apiGet("/products/filter-options").catch(function () {
      return { data: [] };
    })
  ]);

  catalogCategories = categoriesResponse.data || [];
  catalogBrands = brandsResponse.data || [];
  catalogSpecFilters = Array.isArray(specFiltersResponse.data) ? specFiltersResponse.data : [];

  renderCategoryOptions();
  renderBrandOptions();
  renderSpecFilterOptions();
  syncFiltersFromUrl();
}

function renderCategoryOptions() {
  const select = document.getElementById("filterCategory");
  const options = flattenCategories(catalogCategories).map(function (category) {
    const prefix = category.level === 1 ? "-- " : "";
    return `<option value="${escapeAttribute(category.slug)}">${prefix}${escapeHtml(category.name)}</option>`;
  }).join("");

  select.innerHTML = `<option value="">Tất cả danh mục</option>${options}`;
}

function renderBrandOptions() {
  const select = document.getElementById("filterBrand");
  const options = catalogBrands.map(function (brand) {
    return `<option value="${escapeAttribute(brand.slug)}">${escapeHtml(brand.name)}</option>`;
  }).join("");

  select.innerHTML = `<option value="">Tất cả thương hiệu</option>${options}`;
}

function renderSpecFilterOptions() {
  const group = document.getElementById("specFilterGroup");
  const grid = document.getElementById("specFilterGrid");
  const visibleFilters = catalogSpecFilters.filter(function (filter) {
    return filter && filter.key && Array.isArray(filter.options) && filter.options.length > 0;
  });

  if (!visibleFilters.length) {
    group.hidden = true;
    grid.innerHTML = "";
    return;
  }

  group.hidden = false;
  grid.innerHTML = visibleFilters.map(function (filter) {
    const options = filter.options.map(function (option) {
      return `<option value="${escapeAttribute(option.value)}">${escapeHtml(option.label || option.value)}</option>`;
    }).join("");

    return `
      <label class="spec-filter-control">
        ${escapeHtml(filter.label || filter.key)}
        <select id="filterSpec_${escapeAttribute(filter.key)}" name="${escapeAttribute(filter.key)}" data-spec-filter="${escapeAttribute(filter.key)}">
          <option value="">Tất cả</option>
          ${options}
        </select>
      </label>
    `;
  }).join("");
}

function bindCatalogEvents() {
  document.getElementById("filterForm").addEventListener("submit", function (event) {
    event.preventDefault();
    applyFilters({ page: 1 });
  });

  document.getElementById("clearFiltersBtn").addEventListener("click", function () {
    window.history.pushState({}, "", "products.html");
    syncFiltersFromUrl();
    loadProductsFromUrl();
  });

  document.getElementById("sortSelect").addEventListener("change", function () {
    applyFilters({ page: 1 });
  });

  window.addEventListener("popstate", function () {
    syncFiltersFromUrl();
    loadProductsFromUrl();
  });
}

function syncFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get("category") || "";
  const brand = params.get("brand") || "";
  const productType = params.get("productType") || "";

  document.getElementById("filterKeyword").value = getSearchKeywordFromParams(params);
  setSelectValue("filterCategory", category, getCategoryLabel(category));
  setSelectValue("filterBrand", brand, getBrandLabel(brand));
  setSelectValue("filterProductType", productType, getListingProductTypeLabel(productType));
  document.getElementById("filterMinPrice").value = params.get("minPrice") || "";
  document.getElementById("filterMaxPrice").value = params.get("maxPrice") || "";
  document.getElementById("filterRequiresSerial").value = params.get("requiresSerial") || "";
  document.getElementById("sortSelect").value = params.get("sort") || "newest";

  SPEC_FILTER_PARAM_KEYS.forEach(function (key) {
    const select = document.getElementById(`filterSpec_${key}`);

    if (!select) {
      return;
    }

    setSelectValue(select.id, params.get(key) || "", params.get(key) || "");
  });
}

function getFilterValues(extraValues) {
  const values = {
    keyword: document.getElementById("filterKeyword").value.trim(),
    category: document.getElementById("filterCategory").value,
    brand: document.getElementById("filterBrand").value,
    productType: document.getElementById("filterProductType").value,
    minPrice: document.getElementById("filterMinPrice").value,
    maxPrice: document.getElementById("filterMaxPrice").value,
    requiresSerial: document.getElementById("filterRequiresSerial").value,
    sort: document.getElementById("sortSelect").value,
    page: extraValues && extraValues.page ? extraValues.page : new URLSearchParams(window.location.search).get("page")
  };

  SPEC_FILTER_PARAM_KEYS.forEach(function (key) {
    const select = document.getElementById(`filterSpec_${key}`);

    if (select && select.value) {
      values[key] = select.value;
    }
  });

  return values;
}

function applyFilters(extraValues) {
  const queryString = buildQueryString(getFilterValues(extraValues));
  const nextUrl = queryString ? `products.html?${queryString}` : "products.html";

  window.history.pushState({}, "", nextUrl);
  loadProductsFromUrl();
}

async function loadProductsFromUrl() {
  const grid = document.getElementById("productGrid");
  const params = new URLSearchParams(window.location.search);

  grid.className = "product-grid loading-box";
  grid.innerHTML = "Đang tải sản phẩm...";

  try {
    const queryString = buildProductApiParams(params).toString();
    const response = await apiGet(`/products${queryString ? `?${queryString}` : ""}`);
    const products = response.data || [];
    const pagination = response.pagination || {
      total: 0,
      page: 1,
      limit: 12,
      totalPages: 0
    };

    grid.className = "product-grid";
    renderResultMeta(pagination);

    if (!products.length) {
      grid.innerHTML = renderEmpty("Không tìm thấy sản phẩm phù hợp.");
    } else {
      grid.innerHTML = products.map(renderProductCard).join("");
    }

    renderPagination(pagination);
  } catch (error) {
    grid.className = "product-grid";
    grid.innerHTML = renderError(error.message);
  }
}

function renderResultMeta(pagination) {
  const params = new URLSearchParams(window.location.search);
  const keyword = getSearchKeywordFromParams(params);
  const title = document.getElementById("resultTitle");
  const meta = document.getElementById("resultMeta");

  title.textContent = keyword ? `Kết quả cho "${keyword}"` : getListingTitle(params);
  meta.textContent = `${pagination.total} sản phẩm - Trang ${pagination.page}/${pagination.totalPages || 1}`;
  updateCatalogHero(params);
}

function updateCatalogHero(params) {
  const hero = document.getElementById("catalogHero");
  const eyebrow = document.getElementById("catalogHeroEyebrow");
  const title = document.getElementById("catalogHeroTitle");
  const text = document.getElementById("catalogHeroText");
  const productType = params.get("productType") || "";
  const categorySlug = params.get("category") || "";
  const brandSlug = params.get("brand") || "";
  const keyword = getSearchKeywordFromParams(params);
  const categoryLabel = getCategoryLabel(categorySlug);
  const bannerKey = productType || getBannerKeyFromSlug(categorySlug);
  const bannerImage = getBannerImageByKey(bannerKey);

  hero.style.removeProperty("--card-bg");

  if (bannerImage) {
    hero.style.setProperty("--card-bg", `url('${bannerImage}')`);
  }

  if (keyword) {
    eyebrow.textContent = "Tìm kiếm";
    title.textContent = `Kết quả cho "${keyword}"`;
    text.textContent = "Dùng bộ lọc để thu hẹp nhanh sản phẩm theo thương hiệu, mức giá và tình trạng Serial.";
    return;
  }

  if (categorySlug) {
    eyebrow.textContent = "Danh mục";
    title.textContent = categoryLabel;
    text.textContent = "Khám phá sản phẩm phù hợp cho cấu hình, hiệu năng và ngân sách của bạn.";
    return;
  }

  if (brandSlug) {
    eyebrow.textContent = "Thương hiệu";
    title.textContent = getBrandLabel(brandSlug);
    text.textContent = "Bộ sưu tập được chọn lọc cho nhu cầu gaming, làm việc, học tập và sáng tạo.";
    return;
  }

  if (productType) {
    eyebrow.textContent = "Loại sản phẩm";
    title.textContent = getListingProductTypeLabel(productType);
    text.textContent = "Bộ sưu tập được chọn lọc cho nhu cầu gaming, làm việc, học tập và sáng tạo.";
    return;
  }

  eyebrow.textContent = "Catalog";
  title.textContent = "Sản phẩm AeroTech";
  text.textContent = "Tìm PC build, laptop, linh kiện, màn hình và phụ kiện công nghệ tại AeroTech.";
}

function getSearchKeywordFromParams(params) {
  return (params.get("keyword") || params.get("q") || params.get("search") || "").trim();
}

function buildProductApiParams(sourceParams) {
  const apiParams = new URLSearchParams();
  const keyword = getSearchKeywordFromParams(sourceParams);
  const allowedKeys = [
    "category",
    "brand",
    "productType",
    "minPrice",
    "maxPrice",
    "requiresSerial",
    "sort",
    "page",
    "limit"
  ].concat(SPEC_FILTER_PARAM_KEYS);

  if (keyword) {
    apiParams.set("keyword", keyword);
  }

  allowedKeys.forEach(function (key) {
    const value = sourceParams.get(key);

    if (value) {
      apiParams.set(key, value);
    }
  });

  return apiParams;
}

function getListingTitle(params) {
  const categorySlug = params.get("category") || "";
  const brandSlug = params.get("brand") || "";
  const productType = params.get("productType") || "";

  if (categorySlug) {
    return getCategoryLabel(categorySlug);
  }

  if (brandSlug && productType) {
    return `${getListingProductTypeLabel(productType)} ${getBrandLabel(brandSlug)}`;
  }

  if (brandSlug) {
    return `Thương hiệu: ${getBrandLabel(brandSlug)}`;
  }

  if (productType) {
    return getListingProductTypeLabel(productType);
  }

  return "Tất cả sản phẩm";
}

function getCategoryLabel(slug) {
  if (!slug) {
    return "";
  }

  const category = findCategoryBySlug(slug);
  return category ? category.name : (CATEGORY_LABELS[slug] || humanizeSlug(slug));
}

function getBrandLabel(slug) {
  if (!slug) {
    return "";
  }

  const brand = catalogBrands.find(function (item) {
    return item.slug === slug;
  });

  return brand ? brand.name : (BRAND_LABELS[slug] || humanizeSlug(slug));
}

function getListingProductTypeLabel(productType) {
  return PRODUCT_TYPE_LABELS[productType] || getProductTypeLabel(productType);
}

function setSelectValue(selectId, value, fallbackLabel) {
  const select = document.getElementById(selectId);

  if (!select) {
    return;
  }

  if (value && !Array.from(select.options).some(function (option) {
    return option.value === value;
  })) {
    select.insertAdjacentHTML("beforeend", `<option value="${escapeAttribute(value)}">${escapeHtml(fallbackLabel || value)}</option>`);
  }

  select.value = value;
}

function humanizeSlug(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map(function (part) {
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function findCategoryBySlug(slug) {
  if (!slug) {
    return null;
  }

  return flattenCategories(catalogCategories).find(function (category) {
    return category.slug === slug;
  }) || null;
}

function renderPagination(pagination) {
  const container = document.getElementById("pagination");

  if (pagination.totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  const buttons = [];

  for (let page = 1; page <= pagination.totalPages; page += 1) {
    buttons.push(`
      <button class="page-button ${page === pagination.page ? "active" : ""}" type="button" data-page="${page}">
        ${page}
      </button>
    `);
  }

  container.innerHTML = buttons.join("");

  container.querySelectorAll(".page-button").forEach(function (button) {
    button.addEventListener("click", function () {
      applyFilters({ page: button.dataset.page });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}


