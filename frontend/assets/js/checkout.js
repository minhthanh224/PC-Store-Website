document.addEventListener("DOMContentLoaded", function () {
  initCheckoutPage();
});

let checkoutSavedAddresses = [];

async function initCheckoutPage() {
  if (!requireLogin("checkout.html")) {
    return;
  }

  await loadSiteLayout();
  if (!renderCheckoutSummary()) {
    return;
  }
  await refreshSavedCheckoutPromotion();
  await prefillCustomerInfo();
  await loadCheckoutAddresses();
  document.getElementById("checkoutForm").addEventListener("submit", submitCheckout);
}

function renderCheckoutSummary() {
  const container = document.getElementById("checkoutSummary");
  const items = getCartItems();

  if (!items.length) {
    document.querySelector(".checkout-layout").innerHTML = renderEmpty("Giỏ hàng đang trống.");
    return false;
  }

  const subtotal = getCartSubtotal();
  const shipping = getEstimatedShipping(subtotal);
  const promotion = getCartPromotion();
  const discount = promotion ? Number(promotion.discount_amount || 0) : 0;
  const total = Math.max(subtotal + shipping - discount, 0);

  container.innerHTML = `
    <div class="checkout-items">
      ${items.map(function (item) {
        return `
          <div class="checkout-item">
            <span>
              <strong>${escapeHtml(item.name)} x${escapeHtml(item.quantity)}</strong>
              ${renderCheckoutBundleNote(item)}
              ${renderCheckoutWarrantyPackage(item)}
            </span>
            <strong>${formatCurrency(getCartLineTotal(item))}</strong>
          </div>
        `;
      }).join("")}
    </div>
    <div class="checkout-promotion-box">
      <label for="checkoutPromotionCode">Mã ưu đãi</label>
      <div class="promotion-input-row">
        <input id="checkoutPromotionCode" type="text" value="${escapeAttribute(promotion ? promotion.code : "")}" placeholder="Nhập mã ưu đãi">
        <button id="applyCheckoutPromotionBtn" class="btn btn-light" type="button">Áp dụng</button>
      </div>
      ${promotion ? `
        <div class="promotion-applied-note">
          <strong>${escapeHtml(promotion.title || promotion.code)}</strong>
          <span>Đã giảm ${formatCurrency(discount)}</span>
          <button id="removeCheckoutPromotionBtn" type="button">Bỏ mã</button>
        </div>
      ` : ""}
      <div id="checkoutPromotionMessage" class="promotion-message"></div>
    </div>
    <div class="summary-row"><span>Tạm tính</span><strong>${formatCurrency(subtotal)}</strong></div>
    <div class="summary-row"><span>Phí giao hàng</span><strong>${formatCurrency(shipping)}</strong></div>
    ${promotion ? `<div class="summary-row discount-row"><span>Mã ${escapeHtml(promotion.code)}</span><strong>-${formatCurrency(discount)}</strong></div>` : ""}
    <div class="summary-row total-line"><span>Tổng cộng</span><strong>${formatCurrency(total)}</strong></div>
  `;
  bindCheckoutPromotionEvents();
  return true;
}

function bindCheckoutPromotionEvents() {
  const applyButton = document.getElementById("applyCheckoutPromotionBtn");
  if (applyButton) {
    applyButton.addEventListener("click", function () {
      const input = document.getElementById("checkoutPromotionCode");
      applyCheckoutPromotion(input ? input.value : "");
    });
  }

  const removeButton = document.getElementById("removeCheckoutPromotionBtn");
  if (removeButton) {
    removeButton.addEventListener("click", function () {
      clearCartPromotion();
      renderCheckoutSummary();
    });
  }
}

async function refreshSavedCheckoutPromotion() {
  const promotion = getCartPromotion();

  if (!promotion || !promotion.code) {
    return;
  }

  await applyCheckoutPromotion(promotion.code, true);
}

async function applyCheckoutPromotion(code, silent) {
  const message = document.getElementById("checkoutPromotionMessage");
  const normalizedCode = String(code || "").trim();

  if (!normalizedCode) {
    if (message) message.innerHTML = renderError("Vui lòng nhập mã ưu đãi.");
    return;
  }

  try {
    if (message && !silent) message.innerHTML = renderLoading("Đang kiểm tra mã ưu đãi...");
    const response = await authPost("/orders/promotion-preview", {
      promotion_code: normalizedCode,
      items: getCartOrderItemsPayload()
    });
    saveCartPromotion({
      code: response.data.promotion.code,
      title: response.data.promotion.title,
      description: response.data.promotion.description,
      discount_amount: response.data.discount_amount,
      eligible_subtotal: response.data.eligible_subtotal,
      total_amount: response.data.total_amount
    });
    renderCheckoutSummary();
  } catch (error) {
    clearCartPromotion();
    renderCheckoutSummary();
    const nextMessage = document.getElementById("checkoutPromotionMessage") || message;
    if (nextMessage && !silent) {
      nextMessage.innerHTML = renderError(error.message);
    }
  }
}

async function prefillCustomerInfo() {
  try {
    const response = await authGet("/account/profile");
    const user = response.data.user;
    document.getElementById("checkoutName").value = getSafeDisplayName(user);
    document.getElementById("checkoutPhone").value = user.phone || "";
    document.getElementById("checkoutEmail").value = user.email || "";
  } catch (error) {
    document.getElementById("checkoutMessage").innerHTML = renderError(error.message);
  }
}

async function loadCheckoutAddresses() {
  const box = document.getElementById("savedAddressBox");

  if (!box) {
    return;
  }

  try {
    const response = await authGet("/account/addresses");
    checkoutSavedAddresses = response.data || [];

    if (!checkoutSavedAddresses.length) {
      box.className = "saved-address-box";
      box.innerHTML = `
        <div class="saved-address-empty">
          <strong>Chưa có địa chỉ đã lưu</strong>
          <span>Bạn có thể nhập địa chỉ mới bên dưới hoặc thêm địa chỉ trong trang tài khoản.</span>
        </div>
      `;
      return;
    }

    const defaultAddress = checkoutSavedAddresses.find(function (address) { return address.is_default; }) || checkoutSavedAddresses[0];
    box.className = "saved-address-box";
    box.innerHTML = `
      <label for="savedAddressSelect">Địa chỉ đã lưu</label>
      <div class="saved-address-select-row">
        <select id="savedAddressSelect">
          <option value="">Nhập địa chỉ mới</option>
          ${checkoutSavedAddresses.map(function (address) {
            return `
              <option value="${escapeAttribute(address.id)}" ${Number(address.id) === Number(defaultAddress.id) ? "selected" : ""}>
                ${escapeHtml(address.receiver_name)} - ${escapeHtml(address.receiver_phone)} - ${escapeHtml(formatCheckoutAddressLine(address))}${address.is_default ? " (Mặc định)" : ""}
              </option>
            `;
          }).join("")}
        </select>
        <a class="btn btn-light" href="account.html#addressSection">Quản lý địa chỉ</a>
      </div>
      <p class="saved-address-note">Chọn địa chỉ đã lưu để tự động điền thông tin nhận hàng.</p>
    `;

    document.getElementById("savedAddressSelect").addEventListener("change", function (event) {
      const selectedAddress = checkoutSavedAddresses.find(function (address) {
        return String(address.id) === String(event.target.value);
      });

      if (selectedAddress) {
        fillCheckoutAddress(selectedAddress);
      }
    });

    fillCheckoutAddress(defaultAddress);
  } catch (error) {
    box.className = "saved-address-box";
    box.innerHTML = renderError(error.message);
  }
}

function fillCheckoutAddress(address) {
  document.getElementById("checkoutName").value = address.receiver_name || "";
  document.getElementById("checkoutPhone").value = address.receiver_phone || "";
  document.getElementById("checkoutProvince").value = address.province || "";
  document.getElementById("checkoutDistrict").value = address.district || "";
  document.getElementById("checkoutWard").value = address.ward || "";
  document.getElementById("checkoutAddress").value = address.address_line || "";
}

function formatCheckoutAddressLine(address) {
  return [
    address.address_line,
    address.ward,
    address.district,
    address.province
  ].filter(Boolean).join(", ");
}

async function submitCheckout(event) {
  event.preventDefault();

  const message = document.getElementById("checkoutMessage");
  const items = getCartItems();

  if (!items.length) {
    message.innerHTML = renderError("Giỏ hàng đang trống.");
    return;
  }

  message.innerHTML = renderLoading("Đang tạo đơn hàng...");

  try {
    const response = await authPost("/orders", {
      customer_name: document.getElementById("checkoutName").value.trim(),
      customer_phone: document.getElementById("checkoutPhone").value.trim(),
      customer_email: document.getElementById("checkoutEmail").value.trim(),
      province: document.getElementById("checkoutProvince").value.trim(),
      district: document.getElementById("checkoutDistrict").value.trim(),
      ward: document.getElementById("checkoutWard").value.trim(),
      address_line: document.getElementById("checkoutAddress").value.trim(),
      payment_method: document.getElementById("checkoutPayment").value,
      note: document.getElementById("checkoutNote").value.trim(),
      promotion_code: getCartPromotion() ? getCartPromotion().code : null,
      items: getCartOrderItemsPayload()
    });

    clearCart();
    window.location.href = `order-detail.html?code=${encodeURIComponent(response.data.order_code)}`;
  } catch (error) {
    message.innerHTML = renderError(error.message);
  }
}


function renderCheckoutBundleNote(item) {
  if (!item.is_bundle_addon) {
    return "";
  }

  return `
    <small class="checkout-bundle-note">
      Mua kèm ưu đãi${item.bundle_parent_name ? ` với ${escapeHtml(item.bundle_parent_name)}` : ""}
      ${item.bundle_offer_title ? ` - ${escapeHtml(item.bundle_offer_title)}` : ""}
    </small>
  `;
}

function renderCheckoutWarrantyPackage(item) {
  if (!item.warranty_package_id) {
    return "";
  }

  return `
    <small class="checkout-warranty-note">
      ${escapeHtml(item.warranty_package_title || "Gói bảo hành mở rộng")}
      (+${escapeHtml(item.warranty_package_duration_months || 0)} tháng,
      ${formatCurrency(item.warranty_package_price || 0)})
    </small>
  `;
}


