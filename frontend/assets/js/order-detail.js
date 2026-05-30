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
    container.innerHTML = renderOrderDetail(order, items, response.data.history || []);
    bindCustomerWarrantyRequestActions(order);
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function renderOrderDetail(order, items, history) {
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
        ${items.map(function (item) { return renderOrderItem(item, order); }).join("")}
      </div>
    </section>

    ${renderWarrantyRequestPanel()}

    ${renderCustomerOrderHistory(history || [])}

    <section class="order-money-box">
      <div><span>Tạm tính</span><strong>${formatCurrency(order.subtotal_amount)}</strong></div>
      <div><span>Phí giao hàng</span><strong>${formatCurrency(order.shipping_fee)}</strong></div>
      ${renderOrderPromotionSummary(order)}
      <div><span>Giảm giá</span><strong>${formatCurrency(order.discount_amount)}</strong></div>
      <div class="total-line"><span>Tổng cộng</span><strong>${formatCurrency(order.total_amount)}</strong></div>
    </section>
  `;
}


function renderCustomerOrderHistory(history) {
  const events = Array.isArray(history) ? history : [];

  if (!events.length) {
    return "";
  }

  return `
    <section class="order-history-panel">
      <h2>Lịch sử đơn hàng</h2>
      <div class="order-event-list customer-order-events">
        ${events.map(renderCustomerOrderEvent).join("")}
      </div>
    </section>
  `;
}

function renderCustomerOrderEvent(event) {
  return `
    <article class="order-event-item customer-visible">
      <div class="order-event-dot"></div>
      <div>
        <div class="order-event-head">
          <strong>${escapeHtml(getCustomerOrderEventLabel(event))}</strong>
          <span>${escapeHtml(formatDateTime(event.created_at))}</span>
        </div>
        ${event.note ? `<p class="order-event-note">${escapeHtml(event.note)}</p>` : ""}
      </div>
    </article>
  `;
}

function getCustomerOrderEventLabel(event) {
  if (event.event_type === "created") {
    return "Đơn hàng đã được tạo";
  }

  if (event.event_type === "status_changed") {
    return `${getOrderStatusLabel(event.from_status)} → ${getOrderStatusLabel(event.to_status)}`;
  }

  return "Cập nhật đơn hàng";
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

function renderOrderItem(item, order) {
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
        ${renderOrderItemWarrantyRequest(item, order)}
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





function renderOrderItemWarrantyRequest(item, order) {
  if (!item.serial_code) {
    return '<p class="order-warranty-request-note muted-text">Sản phẩm chưa có Serial nên chưa thể tạo yêu cầu bảo hành trực tuyến.</p>';
  }

  if (item.warranty_ticket_code) {
    return `
      <div class="order-warranty-ticket-note">
        <strong>Phiếu bảo hành: ${escapeHtml(item.warranty_ticket_code)}</strong>
        <span>${escapeHtml(getWarrantyStatusLabel(item.warranty_ticket_status))}</span>
        <a class="text-link" href="my-warranty.html?ticket=${encodeURIComponent(item.warranty_ticket_code)}">Theo dõi phiếu</a>
      </div>
    `;
  }

  if (!order || order.status !== "completed") {
    return '<p class="order-warranty-request-note muted-text">Có thể yêu cầu bảo hành sau khi đơn hàng hoàn thành.</p>';
  }

  if (item.serial_status === "warranty") {
    return '<p class="order-warranty-request-note muted-text">Sản phẩm đang được xử lý bảo hành.</p>';
  }

  if (item.serial_status === "returned") {
    return '<p class="order-warranty-request-note muted-text">Serial này không còn đủ điều kiện tạo yêu cầu bảo hành.</p>';
  }

  return `
    <button
      class="btn btn-soft btn-small js-open-warranty-request"
      type="button"
      data-order-item-id="${escapeAttribute(item.id)}"
      data-product-name="${escapeAttribute(item.product_name_snapshot)}"
      data-serial-code="${escapeAttribute(item.serial_code)}"
    >Yêu cầu bảo hành</button>
  `;
}

function renderWarrantyRequestPanel() {
  return `
    <section id="warrantyRequestPanel" class="warranty-request-panel" hidden>
      <div class="section-heading compact-heading">
        <div>
          <p class="eyebrow">Yêu cầu bảo hành</p>
          <h2 id="warrantyRequestTitle">Tạo yêu cầu bảo hành</h2>
          <p id="warrantyRequestSerial" class="page-subtitle"></p>
        </div>
        <button id="closeWarrantyRequestBtn" class="btn btn-light" type="button">Đóng</button>
      </div>
      <form id="warrantyRequestForm" class="stack-form">
        <input id="warrantyRequestOrderItemId" type="hidden">
        <label>
          Mô tả lỗi gặp phải
          <textarea id="warrantyRequestIssue" rows="5" placeholder="Ví dụ: máy không lên nguồn, màn hình sọc, quạt kêu lớn..." required></textarea>
        </label>
        <p class="form-hint">AeroTech sẽ tiếp nhận phiếu ở trạng thái “Đã tiếp nhận”. Bạn có thể theo dõi trong trang Phiếu bảo hành của tôi.</p>
        <div class="form-actions-inline">
          <button class="btn btn-primary" type="submit">Gửi yêu cầu</button>
          <button id="cancelWarrantyRequestBtn" class="btn btn-light" type="button">Hủy</button>
        </div>
        <div id="warrantyRequestMessage"></div>
      </form>
    </section>
  `;
}

function bindCustomerWarrantyRequestActions(order) {
  const panel = document.getElementById("warrantyRequestPanel");
  const form = document.getElementById("warrantyRequestForm");

  document.querySelectorAll(".js-open-warranty-request").forEach(function (button) {
    button.addEventListener("click", function () {
      if (!panel) {
        return;
      }

      document.getElementById("warrantyRequestOrderItemId").value = button.dataset.orderItemId;
      document.getElementById("warrantyRequestTitle").textContent = button.dataset.productName || "Tạo yêu cầu bảo hành";
      document.getElementById("warrantyRequestSerial").textContent = button.dataset.serialCode ? `Serial: ${button.dataset.serialCode}` : "";
      document.getElementById("warrantyRequestIssue").value = "";
      document.getElementById("warrantyRequestMessage").innerHTML = "";
      panel.hidden = false;
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  ["closeWarrantyRequestBtn", "cancelWarrantyRequestBtn"].forEach(function (id) {
    const button = document.getElementById(id);
    if (button && panel) {
      button.addEventListener("click", function () {
        panel.hidden = true;
      });
    }
  });

  if (form) {
    form.addEventListener("submit", submitWarrantyRequest);
  }
}

async function submitWarrantyRequest(event) {
  event.preventDefault();

  const message = document.getElementById("warrantyRequestMessage");
  const orderItemId = Number(document.getElementById("warrantyRequestOrderItemId").value);
  const issue = document.getElementById("warrantyRequestIssue").value.trim();

  message.innerHTML = renderLoading("Đang gửi yêu cầu bảo hành...");

  try {
    const response = await authPost("/warranty/requests", {
      order_item_id: orderItemId,
      issue_description: issue
    });
    message.innerHTML = renderSuccess(response.message || "Yêu cầu bảo hành đã được gửi.");
    setTimeout(loadOrderDetail, 700);
  } catch (error) {
    message.innerHTML = renderError(error.message);
  }
}
