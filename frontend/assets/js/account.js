document.addEventListener("DOMContentLoaded", function () {
  initAccountPage();
});

let accountAddresses = [];
let currentAccountUser = null;

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

  if (logoutButton) {
    logoutButton.addEventListener("click", function () {
      clearAuthSession();
      window.location.href = "index.html";
    });
  }
}

async function loadProfile() {
  const container = document.getElementById("profileCard");

  try {
    const response = await authGet("/account/profile");
    const user = response.data.user;
    currentAccountUser = user;
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    renderProfileCard(user);
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function renderProfileCard(user) {
  const container = document.getElementById("profileCard");
  const displayName = getSafeDisplayName(user);

  container.className = "account-card account-profile-card";
  container.innerHTML = `
    <div class="section-heading compact-heading account-card-heading">
      <h2>Thông tin tài khoản</h2>
      <button id="toggleProfileEditBtn" class="btn btn-soft" type="button">Chỉnh sửa</button>
    </div>
    <div class="profile-summary">
      <div class="profile-avatar" aria-hidden="true">${escapeHtml(getAvatarInitial(displayName))}</div>
      <div class="profile-copy">
        <strong>${escapeHtml(displayName)}</strong>
        <span>${escapeHtml(user.email)}</span>
        <span>${escapeHtml(user.phone || "Chưa cập nhật số điện thoại")}</span>
      </div>
    </div>
    <form id="profileForm" class="stack-form account-inline-form is-hidden" autocomplete="on">
      <label>
        Họ tên
        <input id="profileFullName" name="full_name" type="text" value="${escapeAttribute(user.full_name || "")}" required>
      </label>
      <label>
        Số điện thoại
        <input id="profilePhone" name="phone" type="tel" value="${escapeAttribute(user.phone || "")}">
      </label>
      <div class="form-actions-inline">
        <button class="btn btn-primary" type="submit">Lưu hồ sơ</button>
        <button id="cancelProfileEditBtn" class="btn btn-light" type="button">Hủy</button>
      </div>
      <div id="profileMessage"></div>
    </form>
    <form id="passwordForm" class="stack-form account-password-form" autocomplete="off">
      <h3>Đổi mật khẩu</h3>
      <label>
        Mật khẩu hiện tại
        <input id="currentPassword" name="current_password" type="password" autocomplete="current-password">
      </label>
      <label>
        Mật khẩu mới
        <input id="newPassword" name="new_password" type="password" autocomplete="new-password">
      </label>
      <label>
        Nhập lại mật khẩu mới
        <input id="confirmPassword" name="confirm_password" type="password" autocomplete="new-password">
      </label>
      <button class="btn btn-soft" type="submit">Đổi mật khẩu</button>
      <div id="passwordMessage"></div>
    </form>
  `;

  bindProfileCardEvents();
}

function bindProfileCardEvents() {
  const toggleButton = document.getElementById("toggleProfileEditBtn");
  const cancelButton = document.getElementById("cancelProfileEditBtn");
  const profileForm = document.getElementById("profileForm");
  const passwordForm = document.getElementById("passwordForm");

  if (toggleButton && profileForm) {
    toggleButton.addEventListener("click", function () {
      profileForm.classList.toggle("is-hidden");
    });
  }

  if (cancelButton && profileForm) {
    cancelButton.addEventListener("click", function () {
      profileForm.classList.add("is-hidden");
      if (currentAccountUser) {
        document.getElementById("profileFullName").value = currentAccountUser.full_name || "";
        document.getElementById("profilePhone").value = currentAccountUser.phone || "";
      }
    });
  }

  if (profileForm) {
    profileForm.addEventListener("submit", submitProfileForm);
  }

  if (passwordForm) {
    passwordForm.addEventListener("submit", submitPasswordForm);
  }
}

async function submitProfileForm(event) {
  event.preventDefault();

  const message = document.getElementById("profileMessage");
  message.innerHTML = renderLoading("Đang cập nhật hồ sơ...");

  try {
    const response = await authPut("/account/profile", {
      full_name: document.getElementById("profileFullName").value.trim(),
      phone: document.getElementById("profilePhone").value.trim()
    });
    currentAccountUser = response.data.user;
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentAccountUser));
    renderProfileCard(currentAccountUser);
  } catch (error) {
    message.innerHTML = renderError(error.message);
  }
}

async function submitPasswordForm(event) {
  event.preventDefault();

  const message = document.getElementById("passwordMessage");
  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  message.innerHTML = renderLoading("Đang đổi mật khẩu...");

  try {
    const response = await authPut("/account/password", {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword
    });
    event.target.reset();
    message.innerHTML = renderSuccess(response.message || "Đổi mật khẩu thành công.");
  } catch (error) {
    message.innerHTML = renderError(error.message);
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
    accountAddresses = response.data || [];
    container.className = "address-list";
    renderAddressSection();
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function renderAddressSection(editingAddressId) {
  const section = document.getElementById("addressSection");
  const container = document.getElementById("addressList");
  const editingAddress = editingAddressId
    ? accountAddresses.find(function (address) { return Number(address.id) === Number(editingAddressId); })
    : null;

  section.querySelector("h2").innerHTML = `
    <span>Sổ địa chỉ</span>
    <button id="showAddressFormBtn" class="btn btn-soft" type="button">${editingAddress ? "Hủy sửa" : "Thêm địa chỉ"}</button>
  `;

  container.innerHTML = `
    <form id="addressForm" class="stack-form address-form ${editingAddress ? "" : "is-hidden"}">
      <input id="addressId" type="hidden" value="${escapeAttribute(editingAddress ? editingAddress.id : "")}">
      <div class="form-grid address-form-grid">
        <label>
          Người nhận
          <input id="addressReceiverName" type="text" value="${escapeAttribute(editingAddress ? editingAddress.receiver_name : currentAccountUser ? getSafeDisplayName(currentAccountUser) : "")}" required>
        </label>
        <label>
          Số điện thoại
          <input id="addressReceiverPhone" type="tel" value="${escapeAttribute(editingAddress ? editingAddress.receiver_phone : currentAccountUser ? currentAccountUser.phone || "" : "")}" required>
        </label>
        <label>
          Tỉnh/Thành
          <input id="addressProvince" type="text" value="${escapeAttribute(editingAddress ? editingAddress.province : "")}" required>
        </label>
        <label>
          Quận/Huyện
          <input id="addressDistrict" type="text" value="${escapeAttribute(editingAddress ? editingAddress.district : "")}" required>
        </label>
        <label>
          Phường/Xã
          <input id="addressWard" type="text" value="${escapeAttribute(editingAddress ? editingAddress.ward : "")}" required>
        </label>
        <label>
          Địa chỉ chi tiết
          <input id="addressLine" type="text" value="${escapeAttribute(editingAddress ? editingAddress.address_line : "")}" required>
        </label>
      </div>
      <label class="checkbox-row">
        <input id="addressIsDefault" type="checkbox" ${editingAddress && editingAddress.is_default ? "checked" : ""}>
        Đặt làm địa chỉ mặc định
      </label>
      <div class="form-actions-inline">
        <button class="btn btn-primary" type="submit">${editingAddress ? "Lưu địa chỉ" : "Thêm địa chỉ"}</button>
        <button id="cancelAddressFormBtn" class="btn btn-light" type="button">Hủy</button>
      </div>
      <div id="addressFormMessage"></div>
    </form>
    ${renderAddressList()}
  `;

  bindAddressEvents(editingAddressId);
}

function renderAddressList() {
  if (!accountAddresses.length) {
    return '<div class="account-empty-state"><p>Bạn chưa có địa chỉ giao hàng nào.</p></div>';
  }

  return accountAddresses.map(function (address) {
    const receiverName = getSafePersonName(address.receiver_name, "Khách hàng");

    return `
      <article class="address-card">
        <div class="address-card-heading">
          <strong>${escapeHtml(receiverName)}</strong>
          ${address.is_default ? '<span class="default-address-badge">Mặc định</span>' : ""}
        </div>
        <p>${escapeHtml(address.receiver_phone)}</p>
        <p>${escapeHtml(formatAddressLine(address))}</p>
        <div class="address-card-actions">
          ${address.is_default ? "" : `<button class="btn btn-light set-default-address-btn" type="button" data-address-id="${escapeAttribute(address.id)}">Đặt mặc định</button>`}
          <button class="btn btn-soft edit-address-btn" type="button" data-address-id="${escapeAttribute(address.id)}">Sửa</button>
          <button class="btn btn-danger-soft delete-address-btn" type="button" data-address-id="${escapeAttribute(address.id)}">Xóa</button>
        </div>
      </article>
    `;
  }).join("");
}

function bindAddressEvents(editingAddressId) {
  const showButton = document.getElementById("showAddressFormBtn");
  const cancelButton = document.getElementById("cancelAddressFormBtn");
  const form = document.getElementById("addressForm");

  if (showButton) {
    showButton.addEventListener("click", function () {
      if (editingAddressId) {
        renderAddressSection();
        return;
      }

      form.classList.toggle("is-hidden");
    });
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", function () {
      renderAddressSection();
    });
  }

  if (form) {
    form.addEventListener("submit", submitAddressForm);
  }

  document.querySelectorAll(".edit-address-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      renderAddressSection(button.dataset.addressId);
    });
  });

  document.querySelectorAll(".set-default-address-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      setDefaultAddress(button.dataset.addressId);
    });
  });

  document.querySelectorAll(".delete-address-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      deleteAddress(button.dataset.addressId);
    });
  });
}

async function submitAddressForm(event) {
  event.preventDefault();

  const message = document.getElementById("addressFormMessage");
  const addressId = document.getElementById("addressId").value;
  const payload = getAddressFormPayload();

  message.innerHTML = renderLoading("Đang lưu địa chỉ...");

  try {
    if (addressId) {
      await authPut(`/account/addresses/${encodeURIComponent(addressId)}`, payload);
    } else {
      await authPost("/account/addresses", payload);
    }

    await loadAddresses();
  } catch (error) {
    message.innerHTML = renderError(error.message);
  }
}

function getAddressFormPayload() {
  return {
    receiver_name: document.getElementById("addressReceiverName").value.trim(),
    receiver_phone: document.getElementById("addressReceiverPhone").value.trim(),
    province: document.getElementById("addressProvince").value.trim(),
    district: document.getElementById("addressDistrict").value.trim(),
    ward: document.getElementById("addressWard").value.trim(),
    address_line: document.getElementById("addressLine").value.trim(),
    is_default: document.getElementById("addressIsDefault").checked
  };
}

async function setDefaultAddress(addressId) {
  try {
    await authPatch(`/account/addresses/${encodeURIComponent(addressId)}/default`, {});
    await loadAddresses();
  } catch (error) {
    const container = document.getElementById("addressList");
    container.insertAdjacentHTML("afterbegin", renderError(error.message));
  }
}

async function deleteAddress(addressId) {
  if (!window.confirm("Bạn có chắc muốn xóa địa chỉ này không?")) {
    return;
  }

  try {
    await authDelete(`/account/addresses/${encodeURIComponent(addressId)}`);
    await loadAddresses();
  } catch (error) {
    const container = document.getElementById("addressList");
    container.insertAdjacentHTML("afterbegin", renderError(error.message));
  }
}

function formatAddressLine(address) {
  return [
    address.address_line,
    address.ward,
    address.district,
    address.province
  ].filter(Boolean).join(", ");
}

function renderAccountOrderCard(order) {
  const imageFallback = getProductImageFallback(order);

  return `
    <article class="order-card account-order-row">
      <img
        src="${escapeAttribute(getImageUrl(order.first_product_image, order))}"
        alt="${escapeAttribute(order.first_product_name || order.order_code)}"
        onerror="this.onerror=null;this.src='${escapeAttribute(imageFallback)}'"
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
