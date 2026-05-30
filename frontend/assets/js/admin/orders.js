let adminOrderPage = 1;
let adminOrderUser = null;

document.addEventListener("DOMContentLoaded", initAdminOrders);

async function initAdminOrders() {
  adminOrderUser = await requireAdminRole(["admin", "sales", "technician"]);
  if (!adminOrderUser) return;

  renderAdminLayout("orders", adminOrderUser);
  const initialStatus = new URLSearchParams(window.location.search).get("status") || "";
  if (initialStatus) {
    document.getElementById("orderStatus").value = initialStatus;
    syncOrderTabs(initialStatus);
  }
  bindOrderFilters();
  await loadAdminOrders();
}

function bindOrderFilters() {
  document.getElementById("adminOrderFilterForm").addEventListener("submit", function (event) {
    event.preventDefault();
    adminOrderPage = 1;
    loadAdminOrders();
  });

  document.getElementById("orderStatus").addEventListener("change", function () {
    syncOrderTabs(this.value);
  });

  document.querySelectorAll("#orderStatusTabs button").forEach(function (button) {
    button.addEventListener("click", function () {
      document.getElementById("orderStatus").value = button.dataset.status;
      syncOrderTabs(button.dataset.status);
      adminOrderPage = 1;
      loadAdminOrders();
    });
  });
}

function syncOrderTabs(status) {
  document.querySelectorAll("#orderStatusTabs button").forEach(function (button) {
    button.classList.toggle("active", button.dataset.status === status);
  });
}

async function loadAdminOrders() {
  const container = document.getElementById("adminOrderTable");
  const query = buildQueryString({
    keyword: document.getElementById("orderKeyword").value.trim(),
    status: document.getElementById("orderStatus").value,
    paymentMethod: document.getElementById("orderPaymentMethod").value,
    page: adminOrderPage,
    limit: 12
  });

  container.className = "admin-table-wrap loading-box";
  container.innerHTML = "Đang tải đơn hàng...";

  try {
    const response = await adminGet(`/admin/orders?${query}`);
    container.className = "admin-table-wrap";
    container.innerHTML = renderAdminOrderTable(response.data || []);
    renderAdminOrderPagination(response.pagination);
    bindAdminOrderActions();
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function renderAdminOrderTable(orders) {
  if (!orders.length) {
    return renderEmpty("Chưa có đơn hàng phù hợp.");
  }

  return `
    <table class="admin-table admin-order-table">
      <thead>
        <tr>
          <th>Mã đơn</th>
          <th>Khách hàng</th>
          <th>Ngày tạo</th>
          <th>Tổng tiền</th>
          <th>Thanh toán</th>
          <th>Trạng thái</th>
          <th>Serial</th>
          <th>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(renderAdminOrderRow).join("")}
      </tbody>
    </table>
  `;
}

function renderAdminOrderRow(order) {
  const missingSerials = Math.max(Number(order.serialized_item_count || 0) - Number(order.assigned_serial_count || 0), 0);

  return `
    <tr>
      <td>
        <strong>${escapeHtml(order.order_code)}</strong>
        <p class="table-subtext">${escapeHtml(getAdminRecordDisplayText(order.first_product_name, "Đơn hàng AeroTech"))}</p>
      </td>
      <td>
        <strong>${escapeHtml(getAdminPersonDisplayName(order.customer_name))}</strong>
        <p class="table-subtext">${escapeHtml(order.customer_phone)}</p>
        <p class="table-subtext">${escapeHtml(order.customer_email || "")}</p>
      </td>
      <td>${escapeHtml(formatDateTime(order.created_at))}</td>
      <td><strong>${formatCurrency(order.total_amount)}</strong></td>
      <td>
        <span>${escapeHtml(getPaymentMethodLabel(order.payment_method))}</span>
        ${["admin", "sales"].includes(adminOrderUser.role) ? `<select class="js-payment-status" data-code="${escapeAttribute(order.order_code)}"><option value="unpaid" ${order.payment_status === "unpaid" ? "selected" : ""}>Chưa thanh toán</option><option value="paid" ${order.payment_status === "paid" ? "selected" : ""}>Đã thanh toán</option><option value="refunded" ${order.payment_status === "refunded" ? "selected" : ""}>Đã hoàn tiền</option></select>` : ""}
      </td>
      <td><span class="status-badge ${escapeAttribute(order.status)}">${escapeHtml(getOrderStatusLabel(order.status))}</span></td>
      <td>
        <div class="serial-progress ${missingSerials > 0 ? "warning" : "good"}">
          <strong>${escapeHtml(order.assigned_serial_count)} / ${escapeHtml(order.serialized_item_count)}</strong>
        </div>
        ${missingSerials > 0 ? `<p class="table-subtext warning-text">Còn ${escapeHtml(missingSerials)} Serial cần gán</p>` : ""}
      </td>
      <td class="table-actions">
        <a class="btn btn-light" href="order-detail.html?code=${encodeURIComponent(order.order_code)}">Chi tiết</a>
        ${renderQuickOrderActions(order, missingSerials)}
      </td>
    </tr>
  `;
}

function renderQuickOrderActions(order, missingSerials) {
  if (!["admin", "sales"].includes(adminOrderUser.role)) {
    return "";
  }

  if (order.status === "pending") {
    return `
      <button class="btn btn-primary js-order-status" type="button" data-code="${escapeAttribute(order.order_code)}" data-status="approved">Duyệt</button>
      <button class="btn btn-outline js-order-status" type="button" data-code="${escapeAttribute(order.order_code)}" data-status="cancelled">Hủy</button>
    `;
  }

  if (order.status === "approved") {
    return `
      <button class="btn btn-primary js-order-status" type="button" data-code="${escapeAttribute(order.order_code)}" data-status="shipping" ${missingSerials > 0 ? "disabled" : ""}>Giao hàng</button>
      <button class="btn btn-outline js-order-status" type="button" data-code="${escapeAttribute(order.order_code)}" data-status="cancelled">Hủy</button>
    `;
  }

  if (order.status === "shipping") {
    return `<button class="btn btn-primary js-order-status" type="button" data-code="${escapeAttribute(order.order_code)}" data-status="completed">Hoàn thành</button><button class="btn btn-outline js-order-status" type="button" data-code="${escapeAttribute(order.order_code)}" data-status="returned">Hoàn hàng</button>`;
  }

  if (order.status === "completed") {
    return `<button class="btn btn-outline js-order-status" type="button" data-code="${escapeAttribute(order.order_code)}" data-status="returned">Hoàn hàng</button>`;
  }

  return "";
}

function bindAdminOrderActions() {
  document.querySelectorAll(".js-order-status").forEach(function (button) {
    button.addEventListener("click", async function () {
      const nextStatus = button.dataset.status;

      if (["cancelled", "returned"].includes(nextStatus) && !confirm("Bạn chắc chắn muốn cập nhật trạng thái ngoại lệ cho đơn hàng này?")) {
        return;
      }

      try {
        const response = await adminPatch(`/admin/orders/${encodeURIComponent(button.dataset.code)}/status`, {
          status: nextStatus
        });
        showAdminMessage("adminOrderMessage", "success", response.message || "Cập nhật đơn hàng thành công.");
        await loadAdminOrders();
      } catch (error) {
        showAdminMessage("adminOrderMessage", "error", error.message);
      }
    });
  });
  document.querySelectorAll(".js-payment-status").forEach(function (select) {
    select.addEventListener("change", async function () {
      try {
        const response = await adminPatch(`/admin/orders/${encodeURIComponent(select.dataset.code)}/payment-status`, { payment_status: select.value });
        showAdminMessage("adminOrderMessage", "success", response.message);
      } catch (error) {
        showAdminMessage("adminOrderMessage", "error", error.message);
        await loadAdminOrders();
      }
    });
  });
}

function renderAdminOrderPagination(pagination) {
  const container = document.getElementById("adminOrderPagination");

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
      adminOrderPage = Number(button.dataset.page);
      loadAdminOrders();
    });
  });
}


