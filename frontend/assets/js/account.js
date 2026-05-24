document.addEventListener("DOMContentLoaded", function () {
  initAccountPage();
});

async function initAccountPage() {
  if (!requireLogin("account.html")) {
    return;
  }

  await loadSiteLayout();
  bindAccountEvents();
  await Promise.all([
    loadProfile(),
    loadRecentOrders(),
    loadAddresses()
  ]);
}

function bindAccountEvents() {
  const logoutButton = document.getElementById("accountLogoutBtn");

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", function () {
    clearAuthSession();
    window.location.href = "index.html";
  });
}

async function loadProfile() {
  const container = document.getElementById("profileCard");

  try {
    const response = await authGet("/account/profile");
    const user = response.data.user;
    const displayName = getSafeDisplayName(user);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    container.className = "account-card account-profile-card";
    container.innerHTML = `
      <h2>Thông tin tài khoản</h2>
      <div class="profile-summary">
        <div class="profile-avatar" aria-hidden="true">${escapeHtml(getAvatarInitial(displayName))}</div>
        <div class="profile-copy">
          <strong>${escapeHtml(displayName)}</strong>
          <span>${escapeHtml(user.email)}</span>
          <span>${escapeHtml(user.phone || "Chưa cập nhật số điện thoại")}</span>
        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

async function loadRecentOrders() {
  const container = document.getElementById("recentOrders");

  try {
    const response = await authGet("/orders/my");
    const orders = (response.data || []).slice(0, 3);
    container.className = "order-list recent-order-list";

    if (!orders.length) {
      container.innerHTML = `
        <div class="account-empty-state">
          <p>Bạn chưa có đơn hàng nào.</p>
          <a class="btn btn-soft" href="products.html">Tiếp tục mua sắm</a>
        </div>
      `;
      return;
    }

    container.innerHTML = orders.map(renderAccountOrderCard).join("");
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

async function loadAddresses() {
  const container = document.getElementById("addressList");

  try {
    const response = await authGet("/account/addresses");
    const addresses = response.data || [];
    container.className = "address-list";

    if (!addresses.length) {
      container.innerHTML = '<div class="account-empty-state"><p>Bạn chưa có địa chỉ giao hàng nào.</p></div>';
      return;
    }

    container.innerHTML = addresses.map(function (address) {
      const receiverName = getSafePersonName(address.receiver_name, "Khách hàng");

      return `
        <article class="address-card">
          <div class="address-card-heading">
            <strong>${escapeHtml(receiverName)}</strong>
            ${address.is_default ? '<span class="default-address-badge">Mặc định</span>' : ""}
          </div>
          <p>${escapeHtml(address.receiver_phone)}</p>
          <p>${escapeHtml(address.address_line)}, ${escapeHtml(address.ward)}, ${escapeHtml(address.district)}, ${escapeHtml(address.province)}</p>
        </article>
      `;
    }).join("");
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function renderAccountOrderCard(order) {
  return `
    <article class="order-card account-order-row">
      <img
        src="${escapeAttribute(getImageUrl(order.first_product_image))}"
        alt="${escapeAttribute(order.first_product_name || order.order_code)}"
        onerror="this.onerror=null;this.src='${PRODUCT_PLACEHOLDER_IMAGE}'"
      >
      <div class="account-order-main">
        <div class="order-card-title">
          <strong>${escapeHtml(order.order_code)}</strong>
          <span class="status-badge ${escapeAttribute(order.status)}">${escapeHtml(getOrderStatusLabel(order.status))}</span>
        </div>
        <p>${escapeHtml(formatDateTime(order.created_at))}</p>
        <p>${escapeHtml(order.first_product_name || "Đơn hàng AeroTech")} ${order.item_count > 1 ? `+ ${order.item_count - 1} sản phẩm` : ""}</p>
      </div>
      <div class="order-card-total">
        <strong>${formatCurrency(order.total_amount)}</strong>
        <a class="btn btn-soft account-detail-link" href="order-detail.html?code=${encodeURIComponent(order.order_code)}">Xem chi tiết</a>
      </div>
    </article>
  `;
}

function getAvatarInitial(name) {
  const cleanName = String(name || "").trim();
  return cleanName ? cleanName.charAt(0).toUpperCase() : "K";
}

function getSafePersonName(name, fallback) {
  const rawName = String(name || "").trim();
  const normalized = rawName.toLowerCase();

  if (!rawName || normalized.includes(["de", "mo"].join(""))) {
    return fallback || "Khách hàng";
  }

  return rawName;
}

