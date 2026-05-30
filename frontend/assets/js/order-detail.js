document.addEventListener("DOMContentLoaded", function () {
  initOrderDetailPage();
});

async function initOrderDetailPage() {
  if (!requireLogin("order-detail.html")) {
    return;
  }

  await loadSiteLayout();
  await loadOrderDetail();
}

async function loadOrderDetail() {
  const code = new URLSearchParams(window.location.search).get("code");
  const container = document.getElementById("orderDetail");

  if (!code) {
    container.innerHTML = renderError("Thiếu mã đơn hàng.");
    return;
  }

  try {
    const response = await authGet(`/orders/${encodeURIComponent(code)}`);
    const order = response.data.order;
    const items = response.data.items || [];

    document.title = `${order.order_code} - AeroTech`;
    container.className = "order-detail-card";
    container.innerHTML = renderOrderDetail(order, items);
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function renderOrderDetail(order, items) {
  return `
    <div class="order-detail-header">
      <div>
        <p class="eyebrow">Đơn hàng</p>
        <h1>${escapeHtml(order.order_code)}</h1>
        <p>${escapeHtml(formatDateTime(order.created_at))}</p>
      </div>
      <span class="status-badge ${escapeAttribute(order.status)}">${escapeHtml(getOrderStatusLabel(order.status))}</span>
    </div>

    <div class="timeline">
      ${["pending", "approved", "shipping", "completed"].map(function (status) {
        return `<span class="${status === order.status ? "active" : ""}">${escapeHtml(getOrderStatusLabel(status))}</span>`;
      }).join("")}
    </div>

    <div class="detail-info-grid">
      <section>
        <h2>Thông tin nhận hàng</h2>
        <p>${escapeHtml(order.customer_name)} - ${escapeHtml(order.customer_phone)}</p>
        <p>${escapeHtml(order.address_line)}, ${escapeHtml(order.ward)}, ${escapeHtml(order.district)}, ${escapeHtml(order.province)}</p>
        <p>${escapeHtml(order.customer_email || "")}</p>
      </section>
      <section>
        <h2>Thanh toán</h2>
        <p>${escapeHtml(getPaymentMethodLabel(order.payment_method))}</p>
        <p>${escapeHtml(getPaymentStatusLabel(order.payment_status))}</p>
        <p>${escapeHtml(order.note || "")}</p>
      </section>
    </div>

    <section>
      <h2>Sản phẩm</h2>
      <div class="order-item-list">
        ${items.map(renderOrderItem).join("")}
      </div>
    </section>

    <section class="order-money-box">
      <div><span>Tạm tính</span><strong>${formatCurrency(order.subtotal_amount)}</strong></div>
      <div><span>Phí giao hàng</span><strong>${formatCurrency(order.shipping_fee)}</strong></div>
      ${renderOrderPromotionSummary(order)}
      <div><span>Giảm giá</span><strong>${formatCurrency(order.discount_amount)}</strong></div>
      <div class="total-line"><span>Tổng cộng</span><strong>${formatCurrency(order.total_amount)}</strong></div>
    </section>
  `;
}


function renderOrderPromotionSummary(order) {
  if (!order.promotion_code_snapshot) {
    return "";
  }

  return `
    <div class="order-promotion-summary">
      <span>Mã ưu đãi</span>
      <strong>${escapeHtml(order.promotion_code_snapshot)}</strong>
    </div>
    ${order.promotion_title_snapshot ? `<div><span>Chương trình</span><strong>${escapeHtml(order.promotion_title_snapshot)}</strong></div>` : ""}
  `;
}

function renderOrderItem(item) {
  const imageFallback = getProductImageFallback(item);

  return `
    <article class="order-item-row">
      <img
        src="${escapeAttribute(getImageUrl(item.product_image, item))}"
        alt="${escapeAttribute(item.product_name_snapshot)}"
        onerror="this.onerror=null;this.src='${escapeAttribute(imageFallback)}'"
      >
      <div>
        <strong>${escapeHtml(item.product_name_snapshot)}</strong>
        ${renderOrderItemBundleNote(item)}
        <p>SKU: ${escapeHtml(item.sku_snapshot)}</p>
        <p>Serial: ${item.serial_code ? escapeHtml(item.serial_code) : "Chưa gán Serial"}</p>
        <p>Bảo hành: ${escapeHtml(item.warranty_months_snapshot)} tháng</p>
        ${renderOrderItemWarrantyPackage(item)}
        ${item.serial_code ? `<a class="text-link" href="warranty-lookup.html?serial=${encodeURIComponent(item.serial_code)}">Tra cứu bảo hành</a>` : ""}
      </div>
      <div>
        <p>x${escapeHtml(item.quantity)}</p>
        <strong>${formatCurrency(item.total_price)}</strong>
      </div>
    </article>
  `;
}



function renderOrderItemBundleNote(item) {
  if (!item.is_bundle_addon) {
    return "";
  }

  return `
    <div class="order-bundle-package">
      <strong>Mua kèm ưu đãi</strong>
      <span>${item.bundle_parent_name_snapshot ? `Đi kèm: ${escapeHtml(item.bundle_parent_name_snapshot)}` : "Đi kèm sản phẩm chính"}</span>
      ${item.bundle_offer_title ? `<span>${escapeHtml(item.bundle_offer_title)}</span>` : ""}
      ${item.original_unit_price ? `<span>Giá gốc: ${formatCurrency(item.original_unit_price)} - Giá ưu đãi: ${formatCurrency(item.bundle_unit_price || item.unit_price)}</span>` : ""}
    </div>
  `;
}


function renderOrderItemWarrantyPackage(item) {
  if (!item.warranty_package_id) {
    return "";
  }

  return `
    <div class="order-warranty-package">
      <strong>${escapeHtml(item.warranty_package_title || "Gói bảo hành mở rộng")}</strong>
      <span>+${escapeHtml(item.warranty_package_duration_months || 0)} tháng - ${formatCurrency(item.warranty_package_price || 0)}</span>
    </div>
  `;
}


