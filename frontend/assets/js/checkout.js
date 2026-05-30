document.addEventListener("DOMContentLoaded", function () {
  initCheckoutPage();
});

async function initCheckoutPage() {
  if (!requireLogin("checkout.html")) {
    return;
  }

  await loadSiteLayout();
  if (!renderCheckoutSummary()) {
    return;
  }
  await prefillCustomerInfo();
  document.getElementById("checkoutSavedAddress").addEventListener("change", applySavedAddress);
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
  const total = subtotal + shipping;

  container.innerHTML = `
    <div class="checkout-items">
      ${items.map(function (item) {
        return `
          <div class="checkout-item">
            <span>${escapeHtml(item.name)} x${escapeHtml(item.quantity)}</span>
            <strong>${formatCurrency(item.price * item.quantity)}</strong>
          </div>
        `;
      }).join("")}
    </div>
    <div class="summary-row"><span>Tạm tính</span><strong>${formatCurrency(subtotal)}</strong></div>
    <div class="summary-row"><span>Phí giao hàng</span><strong>${formatCurrency(shipping)}</strong></div>
    <div class="summary-row total-line"><span>Tổng cộng</span><strong>${formatCurrency(total)}</strong></div>
  `;
  return true;
}

async function prefillCustomerInfo() {
  try {
    const [profileResponse, addressesResponse] = await Promise.all([
      authGet("/account/profile"),
      authGet("/account/addresses")
    ]);
    const user = profileResponse.data.user;
    const addresses = addressesResponse.data || [];
    document.getElementById("checkoutName").value = getSafeDisplayName(user);
    document.getElementById("checkoutPhone").value = user.phone || "";
    document.getElementById("checkoutEmail").value = user.email || "";
    document.getElementById("checkoutSavedAddress").innerHTML = `
      <option value="">Nhập địa chỉ mới</option>
      ${addresses.map(function (address) {
        return `<option value="${escapeAttribute(address.id)}">${escapeHtml(address.receiver_name)} - ${escapeHtml(address.address_line)}, ${escapeHtml(address.district)}</option>`;
      }).join("")}
    `;
    window.checkoutAddresses = addresses;
    const defaultAddress = addresses.find(function (address) { return address.is_default; });
    if (defaultAddress) {
      document.getElementById("checkoutSavedAddress").value = String(defaultAddress.id);
      fillCheckoutAddress(defaultAddress);
    }
  } catch (error) {
    document.getElementById("checkoutMessage").innerHTML = renderError(error.message);
  }
}

function applySavedAddress() {
  const id = Number(document.getElementById("checkoutSavedAddress").value);
  const address = (window.checkoutAddresses || []).find(function (item) { return item.id === id; });
  if (address) fillCheckoutAddress(address);
}

function fillCheckoutAddress(address) {
  document.getElementById("checkoutName").value = address.receiver_name || "";
  document.getElementById("checkoutPhone").value = address.receiver_phone || "";
  document.getElementById("checkoutProvince").value = address.province || "";
  document.getElementById("checkoutDistrict").value = address.district || "";
  document.getElementById("checkoutWard").value = address.ward || "";
  document.getElementById("checkoutAddress").value = address.address_line || "";
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
      items: items.map(function (item) {
        return {
          product_id: item.product_id,
          quantity: item.quantity
        };
      })
    });

    clearCart();
    window.location.href = `order-detail.html?code=${encodeURIComponent(response.data.order_code)}`;
  } catch (error) {
    message.innerHTML = renderError(error.message);
  }
}


