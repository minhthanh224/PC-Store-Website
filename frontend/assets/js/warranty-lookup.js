document.addEventListener("DOMContentLoaded", initWarrantyLookupPage);

async function initWarrantyLookupPage() {
  await loadSiteLayout();

  const form = document.getElementById("warrantyLookupForm");
  const input = document.getElementById("warrantySerialInput");
  const serialFromUrl = new URLSearchParams(window.location.search).get("serial") || "";

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    lookupWarranty(input.value.trim());
  });

  if (serialFromUrl) {
    input.value = serialFromUrl;
    lookupWarranty(serialFromUrl);
  }
}

async function lookupWarranty(serial) {
  const result = document.getElementById("warrantyResult");

  if (!serial) {
    result.innerHTML = renderError("Vui lòng nhập Serial cần tra cứu.");
    return;
  }

  result.className = "loading-box";
  result.innerHTML = "Đang tra cứu bảo hành...";

  try {
    const response = await apiGet(`/warranty/lookup?serial=${encodeURIComponent(serial)}`);
    result.className = "";
    result.innerHTML = renderWarrantyResult(response.data);
    const nextUrl = `warranty-lookup.html?serial=${encodeURIComponent(serial)}`;
    window.history.replaceState({}, "", nextUrl);
  } catch (error) {
    result.className = "";
    result.innerHTML = `<div class="warranty-result-card warranty-error">${escapeHtml(error.message)}</div>`;
  }
}

function renderWarrantyResult(data) {
  if (data.status === "not_activated") {
    return `<div class="warranty-result-card warranty-warning">${escapeHtml(data.message)}</div>`;
  }

  if (data.status === "inactive" && data.message) {
    return `
      <div class="warranty-result-card warranty-warning">
        <h2>Không hợp lệ</h2>
        <p>${escapeHtml(data.message)}</p>
        ${renderWarrantyBasicInfo(data)}
      </div>
    `;
  }

  return `
    <article class="warranty-result-card">
      <div class="warranty-result-header">
        <div>
          <p class="eyebrow">Kết quả bảo hành</p>
          <h2>${escapeHtml(data.product_name)}</h2>
          <p>${escapeHtml(data.brand_name || "AeroTech")} / ${escapeHtml(data.category_name || "")}</p>
        </div>
        <span class="status-badge warranty-${escapeAttribute(data.warranty_status)}">${escapeHtml(data.warranty_status_label)}</span>
      </div>
      ${renderWarrantyBasicInfo(data)}
      ${renderActiveTicket(data.active_ticket)}
      ${renderTicketHistory(data.ticket_history || [])}
    </article>
  `;
}

function renderWarrantyBasicInfo(data) {
  return `
    <dl class="warranty-info-grid">
      <div><dt>Sản phẩm</dt><dd>${escapeHtml(data.product_name || "")}</dd></div>
      <div><dt>Thương hiệu</dt><dd>${escapeHtml(data.brand_name || "")}</dd></div>
      <div><dt>SKU</dt><dd>${escapeHtml(data.sku || "")}</dd></div>
      <div><dt>Serial</dt><dd>${escapeHtml(data.serial_code || "")}</dd></div>
      <div><dt>Mã đơn hàng</dt><dd>${escapeHtml(data.order_code || "")}</dd></div>
      <div><dt>Ngày mua</dt><dd>${escapeHtml(formatDateOnly(data.purchase_date))}</dd></div>
      <div><dt>Thời hạn bảo hành</dt><dd>${escapeHtml(data.warranty_months || 0)} tháng</dd></div>
      <div><dt>Ngày hết hạn</dt><dd>${escapeHtml(formatDateOnly(data.warranty_end_date))}</dd></div>
      <div><dt>Trạng thái Serial</dt><dd>${escapeHtml(getSerialStatusLabel(data.serial_status))}</dd></div>
      <div><dt>Trạng thái đơn</dt><dd>${escapeHtml(getOrderStatusLabel(data.order_status))}</dd></div>
    </dl>
  `;
}

function renderActiveTicket(ticket) {
  if (!ticket) {
    return "";
  }

  return `
    <section class="warranty-ticket-panel">
      <h3>Phiếu bảo hành đang xử lý</h3>
      <p><strong>${escapeHtml(ticket.ticket_code)}</strong> - ${escapeHtml(getWarrantyTicketStatusLabel(ticket.status))}</p>
      <p>${escapeHtml(ticket.issue_description || "")}</p>
      <p>Ngày tiếp nhận: ${escapeHtml(formatDateOnly(ticket.received_date))}</p>
    </section>
  `;
}

function renderTicketHistory(tickets) {
  if (!tickets.length) {
    return "";
  }

  return `
    <section class="warranty-ticket-panel">
      <h3>Lịch sử bảo hành</h3>
      <div class="warranty-history-list">
        ${tickets.map(function (ticket) {
          return `
            <article>
              <strong>${escapeHtml(ticket.ticket_code)}</strong>
              <span class="status-badge ${escapeAttribute(ticket.status)}">${escapeHtml(getWarrantyTicketStatusLabel(ticket.status))}</span>
              <p>${escapeHtml(ticket.issue_description || "")}</p>
              <p>${escapeHtml(formatDateOnly(ticket.received_date))}${ticket.completed_date ? ` - ${escapeHtml(formatDateOnly(ticket.completed_date))}` : ""}</p>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function formatDateOnly(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}

function getSerialStatusLabel(status) {
  const labels = {
    in_stock: "Trong kho",
    sold: "Đã bán",
    warranty: "Đang bảo hành",
    returned: "Hàng trả về shop"
  };

  return labels[status] || status || "";
}

function getWarrantyTicketStatusLabel(status) {
  const labels = {
    received: "Đã tiếp nhận",
    repairing: "Đang sửa",
    waiting_parts: "Chờ linh kiện",
    done: "Hoàn tất sửa chữa",
    returned: "Đã trả khách",
    rejected: "Từ chối bảo hành"
  };

  return labels[status] || status || "";
}


