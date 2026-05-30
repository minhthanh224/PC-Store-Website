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
            <span>
              <strong>${escapeHtml(item.name)} x${escapeHtml(item.quantity)}</strong>
              ${renderCheckoutWarrantyPackage(item)}
            </span>
            <strong>${formatCurrency(getCartLineTotal(item))}</strong>
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
    const response = await authGet("/account/profile");
    const user = response.data.user;
    document.getElementById("checkoutName").value = getSafeDisplayName(user);
    document.getElementById("checkoutPhone").value = user.phone || "";
    document.getElementById("checkoutEmail").value = user.email || "";
  } catch (error) {
    document.getElementById("checkoutMessage").innerHTML = renderError(error.message);
  }
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
          quantity: item.quantity,
          warranty_package_id: item.warranty_package_id || null
        };
      })
    });

    clearCart();
    window.location.href = `order-detail.html?code=${encodeURIComponent(response.data.order_code)}`;
  } catch (error) {
    message.innerHTML = renderError(error.message);
  }
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


