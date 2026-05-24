async function loadSiteLayout() {
  const header = document.getElementById("siteHeader");
  const footer = document.getElementById("siteFooter");

  if (header) {
    header.innerHTML = renderHeader([]);
  }

  if (footer) {
    footer.innerHTML = renderFooter();
  }

  try {
    const categoriesResponse = await apiGet("/categories?tree=true");
    if (header) {
      header.innerHTML = renderHeader(categoriesResponse.data || []);
    }
  } catch (error) {
    if (header) {
      header.innerHTML = renderHeader([]);
    }
  }

  bindHeaderSearch();
  bindHeaderSearchPanel();
  bindHeaderAuthActions();
  bindWishlistActionButtons();
  bindCartActionButtons();
  updateCartCount();
}

function renderHeader(categories) {
  const searchParams = new URLSearchParams(window.location.search);
  const currentKeyword = searchParams.get("keyword") || searchParams.get("q") || searchParams.get("search") || "";
  const currentUser = getCurrentUser();
  const displayName = currentUser ? getSafeDisplayName(currentUser) : "";
  const isStaff = isStaffUser(currentUser);
  const greetingHref = isStaff ? getAdminHomeUrl(currentUser) : "account.html";
  const navItems = getAeroNavItems(categories).map(function (item) {
    const childLinks = (item.children || []).slice(0, 8).map(function (child) {
      const childHref = child.href || `products.html?category=${encodeURIComponent(child.slug)}`;
      return `<a href="${escapeAttribute(childHref)}">${escapeHtml(child.name)}</a>`;
    }).join("");

    return `
      <div class="nav-category nav-item ${childLinks ? "has-dropdown" : ""}">
        <a href="${escapeAttribute(item.href)}">${escapeHtml(item.label)}</a>
        ${childLinks ? `<div class="nav-dropdown">${childLinks}</div>` : ""}
      </div>
    `;
  }).join("");

  const cartAction = `
    <a class="cart-link" href="cart.html" aria-label="Giỏ hàng, ${getCartCount()} sản phẩm">
      <span class="cart-link-text">Giỏ hàng</span>
      <span class="cart-icon-wrap" aria-hidden="true">
        <img class="cart-icon" src="assets/icons/cart-fill.svg" alt="">
        <span id="cartCount" class="cart-count-badge">${getCartCount()}</span>
      </span>
    </a>
  `;
  const wishlistAction = '<a class="header-action-btn header-wishlist-btn" href="wishlist.html">Yêu thích</a>';

  let headerActions = `
    ${wishlistAction}
    ${cartAction}
    <a class="header-action-btn header-login-btn" href="login.html">Đăng nhập</a>
    <a class="header-action-btn header-register-btn" href="register.html">Đăng ký</a>
  `;

  if (currentUser && isStaff) {
    headerActions = `
      ${cartAction}
      <a class="account-greeting" href="${escapeAttribute(greetingHref)}">Xin chào, ${escapeHtml(displayName)}</a>
      <a class="header-action-btn header-admin-btn" href="${escapeAttribute(getAdminHomeUrl(currentUser))}">Quản trị</a>
      <button id="logoutBtn" class="header-action-btn header-logout-btn" type="button">Đăng xuất</button>
    `;
  } else if (currentUser) {
    headerActions = `
      ${wishlistAction}
      ${cartAction}
      <a class="account-greeting" href="${escapeAttribute(greetingHref)}">Xin chào, ${escapeHtml(displayName)}</a>
      <button id="logoutBtn" class="header-action-btn header-logout-btn" type="button">Đăng xuất</button>
    `;
  }

  return `
    <div class="top-strip header-topbar">
      <div class="container top-strip-inner header-topbar-inner">
        <div class="utility-links">
          <a href="stores.html">Hệ thống showroom</a>
          <a href="contact.html">Dành cho doanh nghiệp</a>
          <a href="products.html?productType=pc_build">Xây dựng cấu hình</a>
          <a href="products.html?sort=newest">Khuyến mãi</a>
          <a href="warranty-lookup.html">Bảo hành</a>
          <a href="products.html?sort=newest">Tin mới</a>
        </div>
        <a class="utility-hotline" href="contact.html">Hotline 1900 1040</a>
      </div>
    </div>
    <div class="site-header-main header-main-row">
      <div class="container header-grid header-main-grid">
        <a class="site-logo" href="index.html" aria-label="AeroTech">
          <span class="logo-mark" aria-hidden="true"></span>
          <span class="logo-copy">
            <span class="logo-text">Aero <strong>Tech</strong></span>
            <small>High-performance PC Store</small>
          </span>
        </a>
        <form id="headerSearchForm" class="header-search">
          <input
            id="headerSearchInput"
            type="search"
            value="${escapeAttribute(currentKeyword)}"
            placeholder="Tìm PC, laptop, linh kiện, phụ kiện..."
            aria-label="Tìm kiếm sản phẩm"
          >
          <button class="btn btn-dark" type="submit">Tìm kiếm</button>
          <div id="searchSuggestionPanel" class="search-panel" hidden></div>
        </form>
        <div class="header-actions">
          ${headerActions}
        </div>
      </div>
    </div>
    <div id="searchBackdrop" class="search-backdrop" hidden></div>
    <nav class="category-nav category-menu-row" aria-label="Danh mục sản phẩm">
      <div class="container nav-scroll category-menu">
        ${navItems}
      </div>
    </nav>
  `;
}

function getSafeDisplayName(user) {
  const roleLabels = {
    admin: "Quản trị viên",
    sales: "Nhân viên bán hàng",
    technician: "Kỹ thuật viên",
    customer: "Khách hàng"
  };
  const rawName = String(user.full_name || "").trim();
  const normalized = rawName.toLowerCase();

  if (!rawName || normalized.includes(["de", "mo"].join(""))) {
    return roleLabels[user.role] || "Khách hàng";
  }

  return rawName;
}

function getAeroNavItems(categories) {
  const bySlug = {};
  categories.forEach(function (category) {
    bySlug[category.slug] = category;
    (category.children || []).forEach(function (child) {
      bySlug[child.slug] = child;
    });
  });

  const preferred = [
    {
      label: "Laptop",
      href: "products.html?productType=laptop",
      slug: "laptop",
      children: [
        { name: "Laptop Gaming", href: "products.html?productType=laptop&category=laptop-gaming" },
        { name: "Laptop văn phòng", href: "products.html?productType=laptop&category=laptop-van-phong" },
        { name: "Laptop sinh viên", href: "products.html?productType=laptop&category=laptop-sinh-vien" },
        { name: "Ultrabook", href: "products.html?productType=laptop&category=ultrabook" },
        { name: "MacBook", href: "products.html?productType=laptop&brand=apple" }
      ]
    },
    {
      label: "PC Build",
      href: "products.html?productType=pc_build",
      slug: "pc-build",
      children: [
        { name: "PC Gaming", href: "products.html?productType=pc_build&category=pc-gaming" },
        { name: "PC văn phòng", href: "products.html?productType=pc_build&category=pc-van-phong" },
        { name: "PC đồ họa", href: "products.html?productType=pc_build&category=pc-do-hoa" },
        { name: "PC workstation", href: "products.html?productType=pc_build&category=pc-workstation" },
        { name: "Build PC theo yêu cầu", href: "products.html?productType=pc_build&category=build-pc-theo-yeu-cau" }
      ]
    },
    {
      label: "Linh Kiện PC",
      href: "products.html?productType=component",
      slug: "linh-kien-pc",
      children: [
        { name: "CPU", href: "products.html?productType=component&category=cpu" },
        { name: "VGA / Card đồ họa", href: "products.html?productType=component&category=vga" },
        { name: "Mainboard", href: "products.html?productType=component&category=mainboard" },
        { name: "RAM", href: "products.html?productType=component&category=ram" },
        { name: "SSD / HDD", href: "products.html?productType=component&category=ssd-hdd" },
        { name: "Nguồn máy tính", href: "products.html?productType=component&category=nguon" },
        { name: "Case máy tính", href: "products.html?productType=component&category=case" },
        { name: "Tản nhiệt", href: "products.html?productType=component&category=tan-nhiet" }
      ]
    },
    {
      label: "Màn Hình",
      href: "products.html?productType=monitor",
      slug: "man-hinh",
      children: [
        { name: "Màn hình gaming", href: "products.html?productType=monitor&category=man-hinh-gaming" },
        { name: "Màn hình văn phòng", href: "products.html?productType=monitor&category=man-hinh-van-phong" },
        { name: "Màn hình đồ họa", href: "products.html?productType=monitor&category=monitor-do-hoa" },
        { name: "Màn hình cong", href: "products.html?productType=monitor&category=monitor-cong" },
        { name: "Màn hình 144Hz+", href: "products.html?productType=monitor&category=monitor-144hz" }
      ]
    },
    {
      label: "Phụ Kiện",
      href: "products.html?productType=accessory",
      slug: "phu-kien",
      children: [
        { name: "Bàn phím", href: "products.html?productType=accessory&category=ban-phim" },
        { name: "Chuột", href: "products.html?productType=accessory&category=chuot" },
        { name: "Tai nghe", href: "products.html?productType=accessory&category=tai-nghe" },
        { name: "Webcam", href: "products.html?productType=accessory&category=webcam" },
        { name: "Lót chuột", href: "products.html?productType=accessory&category=lot-chuot" },
        { name: "Hub / Cáp sạc", href: "products.html?productType=accessory&category=hub-cable" }
      ]
    },
    {
      label: "Gaming Gear",
      href: "products.html?productType=accessory",
      children: [
        { name: "Bàn phím cơ", href: "products.html?productType=accessory&category=ban-phim" },
        { name: "Chuột gaming", href: "products.html?productType=accessory&category=chuot" },
        { name: "Tai nghe gaming", href: "products.html?productType=accessory&category=tai-nghe" },
        { name: "Ghế gaming", href: "products.html?productType=accessory&category=gaming-chair" },
        { name: "Tay cầm", href: "products.html?productType=accessory&category=controller" }
      ]
    },
    {
      label: "Dịch vụ",
      href: "products.html?productType=service",
      slug: "dich-vu",
      children: [
        { name: "Tư vấn build PC", href: "products.html?productType=service&category=build-pc-theo-yeu-cau" },
        { name: "Tra cứu bảo hành", href: "warranty-lookup.html" },
        { name: "Dịch vụ kỹ thuật", href: "products.html?productType=service&category=dich-vu-ky-thuat" },
        { name: "Thu cũ đổi mới", href: "products.html?productType=service&category=trade-in" }
      ]
    }
  ];

  return preferred.map(function (item) {
    const category = item.slug ? bySlug[item.slug] : null;

    return {
      label: item.label,
      href: category ? `products.html?category=${encodeURIComponent(category.slug)}` : item.href,
      children: item.children || (category && category.children ? category.children : [])
    };
  });
}

function renderFooter() {
  return `
    <div class="site-footer">
      <div class="container footer-grid">
        <div>
          <h2><span>Aero</span>Tech</h2>
          <p>PC, laptop, linh kiện và phụ kiện công nghệ cao dành cho gaming, sáng tạo nội dung, học tập và làm việc.</p>
          <p class="footer-hotline">Hotline: 1900 1040</p>
        </div>
        <div>
          <h3>Sản phẩm</h3>
          <a href="products.html?productType=pc_build">PC Build</a>
          <a href="products.html?productType=laptop">Laptop</a>
          <a href="products.html?productType=component">Linh kiện PC</a>
          <a href="products.html?productType=monitor">Màn hình</a>
          <a href="products.html?productType=accessory">Phụ kiện</a>
        </div>
        <div>
          <h3>Hỗ trợ</h3>
          <a href="policy-warranty.html">Chính sách bảo hành</a>
          <a href="policy-shipping.html">Chính sách giao hàng</a>
          <a href="warranty-lookup.html">Tra cứu bảo hành</a>
          <a href="contact.html">Liên hệ</a>
          <a href="stores.html">Hệ thống cửa hàng</a>
        </div>
      </div>
    </div>
  `;
}

function bindHeaderSearch() {
  const form = document.getElementById("headerSearchForm");
  const input = document.getElementById("headerSearchInput");

  if (!form || !input) {
    return;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    submitHeaderSearch(input.value.trim());
  });
}

const SEARCH_HISTORY_KEY = "aerotech_search_history";
const SEARCH_SUGGESTED_KEYWORDS = [
  "Laptop gaming",
  "PC build",
  "RTX 4060",
  "Màn hình 144Hz",
  "Bàn phím cơ",
  "Chuột gaming",
  "SSD 1TB",
  "RAM 16GB"
];

function bindHeaderSearchPanel() {
  const form = document.getElementById("headerSearchForm");
  const input = document.getElementById("headerSearchInput");
  const panel = document.getElementById("searchSuggestionPanel");
  const backdrop = document.getElementById("searchBackdrop");

  if (!form || !input || !panel || !backdrop) {
    return;
  }

  input.addEventListener("focus", openSearchPanel);
  input.addEventListener("click", openSearchPanel);

  backdrop.addEventListener("click", closeSearchPanel);

  panel.addEventListener("mousedown", function (event) {
    event.preventDefault();
  });

  panel.addEventListener("click", function (event) {
    const keywordButton = event.target.closest(".js-search-keyword");
    const clearButton = event.target.closest(".js-clear-search-history");

    if (clearButton) {
      clearSearchHistory();
      renderSearchPanel();
      input.focus();
      return;
    }

    if (keywordButton) {
      submitHeaderSearch(keywordButton.dataset.keyword || "");
    }
  });

  document.addEventListener("mousedown", function (event) {
    if (!form.contains(event.target) && event.target !== backdrop) {
      closeSearchPanel();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeSearchPanel();
    }
  });
}

async function openSearchPanel() {
  const panel = document.getElementById("searchSuggestionPanel");
  const backdrop = document.getElementById("searchBackdrop");

  if (!panel || !backdrop) {
    return;
  }

  panel.hidden = false;
  backdrop.hidden = false;
  renderSearchPanel();

  if (!window.__aeroSearchProductsLoaded) {
    window.__aeroSearchProductsLoaded = true;
    try {
      const response = await apiGet("/products/featured");
      window.__aeroSearchProducts = (response.data || []).slice(0, 8);
      renderSearchPanel();
    } catch (error) {
      window.__aeroSearchProducts = [];
    }
  }
}

function closeSearchPanel() {
  const panel = document.getElementById("searchSuggestionPanel");
  const backdrop = document.getElementById("searchBackdrop");

  if (panel) {
    panel.hidden = true;
  }

  if (backdrop) {
    backdrop.hidden = true;
  }
}

function renderSearchPanel() {
  const panel = document.getElementById("searchSuggestionPanel");

  if (!panel) {
    return;
  }

  const history = getSearchHistory();
  const products = window.__aeroSearchProducts || [];

  panel.innerHTML = `
    <div class="search-panel-section search-history-section">
      <div class="search-panel-heading">
        <h3>Lịch sử tìm kiếm</h3>
        ${history.length ? '<button class="js-clear-search-history" type="button">Xóa tất cả</button>' : ""}
      </div>
      ${history.length ? `
        <div class="search-chip-list">
          ${history.map(function (keyword) {
            return `<button class="js-search-keyword" type="button" data-keyword="${escapeAttribute(keyword)}">${escapeHtml(keyword)}</button>`;
          }).join("")}
        </div>
      ` : '<p class="search-empty-text">Chưa có lịch sử tìm kiếm.</p>'}
    </div>

    <div class="search-panel-section">
      <div class="search-panel-heading">
        <h3>Gợi ý tìm kiếm</h3>
      </div>
      <div class="search-chip-list">
        ${SEARCH_SUGGESTED_KEYWORDS.map(function (keyword) {
          return `<button class="js-search-keyword" type="button" data-keyword="${escapeAttribute(keyword)}">${escapeHtml(keyword)}</button>`;
        }).join("")}
      </div>
    </div>

    <div class="search-panel-section">
      <div class="search-panel-heading">
        <h3>Sản phẩm gợi ý</h3>
      </div>
      ${products.length ? `
        <div class="search-product-list">
          ${products.map(renderSearchProductSuggestion).join("")}
        </div>
      ` : '<p class="search-empty-text">Đang cập nhật sản phẩm gợi ý.</p>'}
    </div>
  `;
}

function renderSearchProductSuggestion(product) {
  return `
    <a class="search-product-item" href="product-detail.html?slug=${encodeURIComponent(product.slug)}">
      <img
        src="${escapeAttribute(getImageUrl(product.primary_image))}"
        alt="${escapeAttribute(product.name)}"
        onerror="this.onerror=null;this.src='${PRODUCT_PLACEHOLDER_IMAGE}'"
      >
      <span>
        <strong>${escapeHtml(product.name)}</strong>
        <small>${formatCurrency(product.sale_price || product.base_price)}</small>
      </span>
    </a>
  `;
}

function submitHeaderSearch(keyword) {
  const cleanKeyword = String(keyword || "").trim();

  closeSearchPanel();

  if (!cleanKeyword) {
    window.location.href = "products.html";
    return;
  }

  saveSearchHistory(cleanKeyword);
  window.location.href = `products.html?keyword=${encodeURIComponent(cleanKeyword)}`;
}

function getSearchHistory() {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveSearchHistory(keyword) {
  const cleanKeyword = String(keyword || "").trim();

  if (!cleanKeyword) {
    return;
  }

  const normalized = cleanKeyword.toLowerCase();
  const nextHistory = [
    cleanKeyword,
    ...getSearchHistory().filter(function (item) {
      return String(item).toLowerCase() !== normalized;
    })
  ].slice(0, 8);

  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(nextHistory));
}

function clearSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

function bindHeaderAuthActions() {
  const logoutBtn = document.getElementById("logoutBtn");

  if (!logoutBtn) {
    return;
  }

  logoutBtn.addEventListener("click", function () {
    clearAuthSession();
    window.location.href = "index.html";
  });
}

function bindWishlistActionButtons() {
  if (window.__wishlistButtonsBound) {
    return;
  }

  window.__wishlistButtonsBound = true;

  document.addEventListener("click", async function (event) {
    const button = event.target.closest(".js-add-wishlist");

    if (!button) {
      return;
    }

    if (!isLoggedIn()) {
      window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname.split("/").pop() + window.location.search)}`;
      return;
    }

    try {
      const response = await authPost(`/wishlist/${encodeURIComponent(button.dataset.productId)}`, {});
      showToast(response.message || "Đã thêm sản phẩm vào danh sách yêu thích.");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}


