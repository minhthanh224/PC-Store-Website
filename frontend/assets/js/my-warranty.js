let myWarrantyStatus = "";
let selectedMyWarrantyCode = "";

document.addEventListener("DOMContentLoaded", initMyWarrantyPage);

async function initMyWarrantyPage() {
  if (!requireLogin("my-warranty.html")) {
    return;
  }

  await loadSiteLayout();
  bindMyWarrantyTabs();
  const ticketCode = new URLSearchParams(window.location.search).get("ticket");
  await loadMyWarrantyTickets();

  if (ticketCode) {
    await loadMyWarrantyDetail(ticketCode);
  }
}

function bindMyWarrantyTabs() {
  document.querySelectorAll("#warrantyTabs button").forEach(function (button) {
    button.addEventListener("click", async function () {
      document.querySelectorAll("#warrantyTabs button").forEach(function (item) {
        item.classList.toggle("active", item === button);
      });
      myWarrantyStatus = button.dataset.status || "";
      await loadMyWarrantyTickets();
    });
  });
}

async function loadMyWarrantyTickets() {
  const container = document.getElementById("myWarrantyList");
  const query = myWarrantyStatus ? `?status=${encodeURIComponent(myWarrantyStatus)}` : "";

  container.className = "warranty-ticket-list loading-box";
  container.innerHTML = "Đang tải phiếu bảo hành...";

  try {
    const response = await authGet(`/warranty/my${query}`);
    const tickets = response.data || [];
    container.className = "warranty-ticket-list";

    if (!tickets.length) {
      container.innerHTML = `
        <div class="account-empty-state">
          <p>Chưa có phiếu bảo hành phù hợp.</p>
          <a class="btn btn-soft" href="my-orders.html">Xem đơn hàng đã mua</a>
        </div>
      `;
      return;
    }

    container.innerHTML = tickets.map(renderMyWarrantyCard).join("");
    bindMyWarrantyActions();
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function renderMyWarrantyCard(ticket) {
  return `
    <article class="warranty-ticket-card">
      <div>
        <div class="warranty-ticket-head">
          <strong>${escapeHtml(ticket.ticket_code)}</strong>
          <span class="status-badge ${escapeAttribute(ticket.status)}">${escapeHtml(getWarrantyStatusLabel(ticket.status))}</span>
        </div>
        <h2>${escapeHtml(ticket.product_name || "Sản phẩm bảo hành")}</h2>
        <p>SKU: ${escapeHtml(ticket.sku || "")} · Serial: ${escapeHtml(ticket.serial_code || "")}</p>
        <p>Đơn hàng: ${escapeHtml(ticket.order_code || "Không xác định")}</p>
        <p class="warranty-ticket-issue">${escapeHtml(ticket.issue_description || "")}</p>
      </div>
      <div class="warranty-ticket-meta">
        <span>Tiếp nhận: ${escapeHtml(formatDateOnly(ticket.received_date || ticket.created_at))}</span>
        ${ticket.completed_date ? `<span>Hoàn tất: ${escapeHtml(formatDateOnly(ticket.completed_date))}</span>` : ""}
        <button class="btn btn-light js-view-my-warranty" type="button" data-ticket="${escapeAttribute(ticket.ticket_code)}">Xem chi tiết</button>
      </div>
    </article>
  `;
}

function bindMyWarrantyActions() {
  document.querySelectorAll(".js-view-my-warranty").forEach(function (button) {
    button.addEventListener("click", function () {
      loadMyWarrantyDetail(button.dataset.ticket);
    });
  });
}

async function loadMyWarrantyDetail(ticketCode) {
  const panel = document.getElementById("myWarrantyDetail");
  selectedMyWarrantyCode = ticketCode;
  panel.hidden = false;
  panel.className = "warranty-detail-section loading-box";
  panel.innerHTML = "Đang tải chi tiết phiếu bảo hành...";

  try {
    const response = await authGet(`/warranty/my/${encodeURIComponent(ticketCode)}`);
    panel.className = "warranty-detail-section";
    panel.innerHTML = renderMyWarrantyDetail(response.data);
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    panel.innerHTML = renderError(error.message);
  }
}

function renderMyWarrantyDetail(ticket) {
  return `
    <div class="section-heading compact-heading">
      <div>
        <p class="eyebrow">Chi tiết phiếu</p>
        <h2>${escapeHtml(ticket.ticket_code)}</h2>
      </div>
      <span class="status-badge ${escapeAttribute(ticket.status)}">${escapeHtml(getWarrantyStatusLabel(ticket.status))}</span>
    </div>
    <div class="detail-info-grid warranty-detail-grid">
      <section>
        <h3>Sản phẩm</h3>
        <p><strong>${escapeHtml(ticket.product_name)}</strong></p>
        <p>SKU: ${escapeHtml(ticket.sku)}</p>
        <p>Serial: ${escapeHtml(ticket.serial_code)}</p>
        <p>Đơn hàng: ${escapeHtml(ticket.order_code || "")}</p>
      </section>
      <section>
        <h3>Thời hạn bảo hành</h3>
        <p>Bắt đầu: ${escapeHtml(formatDateOnly(ticket.warranty_start_date))}</p>
        <p>Kết thúc: ${escapeHtml(formatDateOnly(ticket.warranty_end_date))}</p>
        <p>Tổng thời hạn: ${escapeHtml(ticket.warranty_months || 0)} tháng</p>
        ${ticket.warranty_package_title ? `<p>Gói mở rộng: ${escapeHtml(ticket.warranty_package_title)}</p>` : ""}
      </section>
    </div>
    <section class="warranty-ticket-note-box">
      <h3>Lỗi đã báo cáo</h3>
      <p>${escapeHtml(ticket.issue_description || "")}</p>
    </section>
    <section class="warranty-ticket-note-box">
      <h3>Ghi chú kỹ thuật</h3>
      <p>${ticket.technician_note ? escapeHtml(ticket.technician_note) : "AeroTech chưa có ghi chú kỹ thuật cho phiếu này."}</p>
    </section>
  `;
}
