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
      <div><span>Giảm giá</span><strong>${formatCurrency(order.discount_amount)}</strong></div>
      <div class="total-line"><span>Tổng cộng</span><strong>${formatCurrency(order.total_amount)}</strong></div>
    </section>
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
        <p>SKU: ${escapeHtml(item.sku_snapshot)}</p>
        <p>Serial: ${item.serial_code ? escapeHtml(item.serial_code) : "Chưa gán Serial"}</p>
        <p>Bảo hành: ${escapeHtml(item.warranty_months_snapshot)} tháng</p>
        ${item.serial_code ? `<a class="text-link" href="warranty-lookup.html?serial=${encodeURIComponent(item.serial_code)}">Tra cứu bảo hành</a>` : ""}
      </div>
      <div>
        <p>x${escapeHtml(item.quantity)}</p>
        <strong>${formatCurrency(item.total_price)}</strong>
      </div>
    </article>
  `;
}


