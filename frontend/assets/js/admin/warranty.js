let warrantyTicketPage = 1;
let selectedWarrantyTicketCode = "";

document.addEventListener("DOMContentLoaded", initAdminWarranty);

async function initAdminWarranty() {
  const user = await requireAdminRole(["admin", "technician"]);
  if (!user) return;

  renderAdminLayout("warranty", user);
  document.getElementById("warrantyReceivedDate").value = new Date().toISOString().slice(0, 10);
  document.getElementById("warrantyCreateForm").addEventListener("submit", createWarrantyTicket);
  document.getElementById("warrantyFilterForm").addEventListener("submit", function (event) {
    event.preventDefault();
    warrantyTicketPage = 1;
    loadWarrantyTickets();
  });

  await loadWarrantyTickets();
}

async function loadWarrantyTickets() {
  const container = document.getElementById("warrantyTicketTable");
  const query = buildQueryString({
    keyword: document.getElementById("warrantyKeyword").value.trim(),
    status: document.getElementById("warrantyStatus").value,
    page: warrantyTicketPage,
    limit: 12
  });

  container.className = "admin-table-wrap loading-box";
  container.innerHTML = "Đang tải phiếu bảo hành...";

  try {
    const response = await adminGet(`/admin/warranty-tickets?${query}`);
    renderWarrantySummary(response.summary || {});
    container.className = "admin-table-wrap";
    container.innerHTML = renderWarrantyTicketTable(response.data || []);
    renderWarrantyPagination(response.pagination);
    bindWarrantyTicketActions();
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function renderWarrantySummary(summary) {
  document.getElementById("warrantySummaryCards").innerHTML = `
    ${renderWarrantySummaryCard("Phiếu đang tiếp nhận", summary.received || 0)}
    ${renderWarrantySummaryCard("Đang sửa", summary.repairing || 0)}
    ${renderWarrantySummaryCard("Chờ linh kiện", summary.waiting_parts || 0)}
    ${renderWarrantySummaryCard("Hoàn tất sửa chữa", summary.done || 0)}
    ${renderWarrantySummaryCard("Đã trả khách / Từ chối bảo hành", summary.closed || 0)}
  `;
}

function renderWarrantySummaryCard(label, value) {
  return `
    <article class="admin-stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function renderWarrantyTicketTable(tickets) {
  if (!tickets.length) {
    return renderEmpty("Chưa có phiếu bảo hành phù hợp.");
  }

  return `
    <table class="admin-table admin-warranty-table">
      <thead>
        <tr>
          <th>Mã phiếu</th>
          <th>Serial</th>
          <th>Sản phẩm</th>
          <th>Khách hàng</th>
          <th>Lỗi báo cáo</th>
          <th>Trạng thái</th>
          <th>Ngày tiếp nhận</th>
          <th>Ngày hoàn tất</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        ${tickets.map(function (ticket) {
          return `
            <tr>
              <td><strong>${escapeHtml(ticket.ticket_code)}</strong></td>
              <td class="warranty-code-cell">${escapeHtml(ticket.serial_code)}</td>
              <td>${escapeHtml(getAdminRecordDisplayText(ticket.product_name, "Sản phẩm bảo hành"))}</td>
              <td>
                <strong>${escapeHtml(getAdminPersonDisplayName(ticket.customer_name))}</strong>
                <p class="table-subtext">${escapeHtml(ticket.customer_phone)}</p>
              </td>
              <td class="warranty-issue-cell">${escapeHtml(getWarrantyDisplayText(ticket.issue_description))}</td>
              <td><span class="status-badge ${escapeAttribute(ticket.status)}">${escapeHtml(getWarrantyTicketStatusLabel(ticket.status))}</span></td>
              <td>${escapeHtml(formatDateOnly(ticket.received_date))}</td>
              <td>${escapeHtml(formatDateOnly(ticket.completed_date))}</td>
              <td class="table-actions">
                <button class="btn btn-light js-view-warranty" type="button" data-code="${escapeAttribute(ticket.ticket_code)}">Xem chi tiết</button>
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function bindWarrantyTicketActions() {
  document.querySelectorAll(".js-view-warranty").forEach(function (button) {
    button.addEventListener("click", function () {
      selectedWarrantyTicketCode = button.dataset.code;
      loadWarrantyTicketDetail(selectedWarrantyTicketCode);
    });
  });
}

async function createWarrantyTicket(event) {
  event.preventDefault();

  try {
    const response = await adminPost("/admin/warranty-tickets", {
      serial_code: document.getElementById("warrantySerialCode").value.trim(),
      customer_name: document.getElementById("warrantyCustomerName").value.trim(),
      customer_phone: document.getElementById("warrantyCustomerPhone").value.trim(),
      issue_description: document.getElementById("warrantyIssue").value.trim(),
      received_date: document.getElementById("warrantyReceivedDate").value,
      technician_note: document.getElementById("warrantyNote").value.trim()
    });

    document.getElementById("warrantyCreateForm").reset();
    document.getElementById("warrantyReceivedDate").value = new Date().toISOString().slice(0, 10);
    selectedWarrantyTicketCode = response.data.ticket_code;
    showAdminMessage("warrantyMessage", "success", response.message || "Tạo phiếu bảo hành thành công.");
    await loadWarrantyTickets();
    await loadWarrantyTicketDetail(selectedWarrantyTicketCode);
  } catch (error) {
    showAdminMessage("warrantyMessage", "error", error.message);
  }
}

async function loadWarrantyTicketDetail(ticketCode) {
  const panel = document.getElementById("warrantyDetailPanel");
  const body = document.getElementById("warrantyDetailBody");

  body.className = "loading-box";
  body.innerHTML = "Đang tải chi tiết phiếu...";

  try {
    const response = await adminGet(`/admin/warranty-tickets/${encodeURIComponent(ticketCode)}`);
    body.className = "";
    body.innerHTML = renderWarrantyTicketDetail(response.data);
    bindWarrantyDetailActions(response.data.ticket.ticket_code);
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    body.innerHTML = renderError(error.message);
  }
}

function renderWarrantyTicketDetail(data) {
  const ticket = data.ticket;
  const nextOptions = ticket.valid_next_statuses.map(function (status) {
    return `<option value="${escapeAttribute(status)}">${escapeHtml(getWarrantyTicketStatusLabel(status))}</option>`;
  }).join("");

  return `
    <div class="admin-detail-grid">
      <section>
        <h3>${escapeHtml(ticket.ticket_code)}</h3>
        <p><span class="status-badge ${escapeAttribute(ticket.status)}">${escapeHtml(getWarrantyTicketStatusLabel(ticket.status))}</span></p>
        <p><strong>Khách hàng:</strong> ${escapeHtml(ticket.customer_name)} - ${escapeHtml(ticket.customer_phone)}</p>
        <p><strong>Lỗi báo cáo:</strong> ${escapeHtml(getWarrantyDisplayText(ticket.issue_description))}</p>
        <p><strong>Ngày tiếp nhận:</strong> ${escapeHtml(formatDateOnly(ticket.received_date))}</p>
        <p><strong>Ngày hoàn tất:</strong> ${escapeHtml(formatDateOnly(ticket.completed_date))}</p>
      </section>
      <section>
        <h3>Sản phẩm / Serial</h3>
        <p><strong>${escapeHtml(data.product.name)}</strong></p>
        <p>SKU: ${escapeHtml(data.product.sku)}</p>
        <p>Serial: ${escapeHtml(data.serial.serial_code)}</p>
        <p>Trạng thái Serial: ${escapeHtml(getSerialStatusLabel(data.serial.status))}</p>
        ${data.order ? `<p>Đơn hàng: ${escapeHtml(data.order.order_code)} - ${escapeHtml(getOrderStatusLabel(data.order.status))}</p>` : ""}
      </section>
    </div>

    <div class="admin-detail-grid">
      <form id="warrantyStatusForm" class="stack-form">
        <h3>Cập nhật trạng thái</h3>
        <select id="warrantyNextStatus" ${nextOptions ? "" : "disabled"}>
          ${nextOptions || '<option value="">Không còn trạng thái kế tiếp</option>'}
        </select>
        <textarea id="warrantyStatusNote" placeholder="Ghi chú thêm khi cập nhật trạng thái">${escapeHtml(getWarrantyDisplayText(ticket.technician_note || ""))}</textarea>
        <button class="btn btn-primary" type="submit" ${nextOptions ? "" : "disabled"}>Cập nhật trạng thái</button>
      </form>

      <form id="warrantyNoteForm" class="stack-form">
        <h3>Cập nhật ghi chú</h3>
        <textarea id="warrantyDetailNote">${escapeHtml(getWarrantyDisplayText(ticket.technician_note || ""))}</textarea>
        <button class="btn btn-outline" type="submit">Lưu ghi chú</button>
      </form>
    </div>
  `;
}

function bindWarrantyDetailActions(ticketCode) {
  const statusForm = document.getElementById("warrantyStatusForm");
  const noteForm = document.getElementById("warrantyNoteForm");

  statusForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const nextStatus = document.getElementById("warrantyNextStatus").value;

    if (["returned", "rejected"].includes(nextStatus) && !confirm("Bạn chắc chắn muốn đóng phiếu bảo hành này? Serial sẽ được chuyển lại trạng thái đã bán.")) {
      return;
    }

    try {
      const response = await adminPatch(`/admin/warranty-tickets/${encodeURIComponent(ticketCode)}/status`, {
        status: nextStatus,
        technician_note: document.getElementById("warrantyStatusNote").value.trim()
      });
      showAdminMessage("warrantyMessage", "success", response.message || "Cập nhật trạng thái thành công.");
      await loadWarrantyTickets();
      await loadWarrantyTicketDetail(ticketCode);
    } catch (error) {
      showAdminMessage("warrantyMessage", "error", error.message);
    }
  });

  noteForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      const response = await adminPut(`/admin/warranty-tickets/${encodeURIComponent(ticketCode)}/note`, {
        technician_note: document.getElementById("warrantyDetailNote").value.trim()
      });
      showAdminMessage("warrantyMessage", "success", response.message || "Cập nhật ghi chú thành công.");
      await loadWarrantyTickets();
      await loadWarrantyTicketDetail(ticketCode);
    } catch (error) {
      showAdminMessage("warrantyMessage", "error", error.message);
    }
  });
}

function renderWarrantyPagination(pagination) {
  const container = document.getElementById("warrantyPagination");

  if (!pagination || pagination.totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  const buttons = [];
  for (let page = 1; page <= pagination.totalPages; page += 1) {
    buttons.push(`<button class="page-button ${page === pagination.page ? "active" : ""}" type="button" data-page="${page}">${page}</button>`);
  }

  container.innerHTML = buttons.join("");
  container.querySelectorAll("button").forEach(function (button) {
    button.addEventListener("click", function () {
      warrantyTicketPage = Number(button.dataset.page);
      loadWarrantyTickets();
    });
  });
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

function getWarrantyDisplayText(value) {
  const text = String(value || "");
  const knownFixes = {
    "Ki?m tra b?o h?nh demo": "Kiểm tra bảo hành demo",
    "M?y kh?ng l?n h?nh khi kh?i ??ng": "Máy không lên hình khi khởi động",
    "?? tr? kh?ch": "Đã trả khách"
  };

  return knownFixes[text] || text;
}


