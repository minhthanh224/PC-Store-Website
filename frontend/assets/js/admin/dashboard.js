let dashboardUser = null;

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {
  dashboardUser = await requireAdminRole(["admin", "sales", "technician"]);
  if (!dashboardUser) return;

  renderAdminLayout("dashboard", dashboardUser);
  await loadDashboard();
}

async function loadDashboard() {
  const cards = document.getElementById("dashboardCards");
  const details = document.getElementById("dashboardDetails");

  try {
    const response = await adminGet("/admin/dashboard");
    const data = response.data;

    cards.className = "admin-card-grid";
    cards.innerHTML = renderDashboardCards(data);
    details.innerHTML = renderDashboardDetails(data);
  } catch (error) {
    cards.innerHTML = renderError(error.message);
    details.innerHTML = "";
  }
}

function renderDashboardCards(data) {
  if (dashboardUser.role === "technician") {
    return `
      ${renderDashboardCard("Đơn chờ gán Serial", data.approved_orders_waiting_serial, "orders.html?status=approved")}
      ${renderDashboardCard("Phiếu bảo hành mở", data.active_warranty_tickets, "warranty.html")}
      ${renderDashboardCard("Cảnh báo tồn kho thấp", data.low_stock_products, "inventory.html")}
      ${renderDashboardCard("Serial trong kho", data.serials_in_stock, "inventory.html")}
    `;
  }

  if (dashboardUser.role === "sales") {
    return `
      ${renderDashboardCard("Đơn chờ duyệt", data.pending_orders, "orders.html?status=pending")}
      ${renderDashboardCard("Đơn đã duyệt", data.approved_orders, "orders.html?status=approved")}
      ${renderDashboardCard("Đang giao", data.shipping_orders, "orders.html?status=shipping")}
      ${renderDashboardCard("Hoàn thành", data.completed_orders, "orders.html?status=completed")}
      ${renderDashboardCard("Đơn hôm nay", data.today_orders, "orders.html")}
      ${renderDashboardCard("Doanh thu tháng", formatCurrency(data.month_revenue), "reports.html")}
    `;
  }

  return `
    ${renderDashboardCard("Sản phẩm", data.total_products, "products.html")}
    ${renderDashboardCard("Sản phẩm đang bán", data.active_products, "products.html?status=active")}
    ${renderDashboardCard("Đơn chờ duyệt", data.pending_orders, "orders.html?status=pending")}
    ${renderDashboardCard("Đang giao", data.shipping_orders, "orders.html?status=shipping")}
    ${renderDashboardCard("Cảnh báo tồn kho thấp", data.low_stock_products, "inventory.html")}
    ${renderDashboardCard("Serial trong kho", data.serials_in_stock, "inventory.html")}
    ${renderDashboardCard("Phiếu bảo hành mở", data.active_warranty_tickets, "warranty.html")}
    ${renderDashboardCard("Doanh thu tháng", formatCurrency(data.month_revenue), "reports.html")}
  `;
}

function renderDashboardDetails(data) {
  const panels = [];

  if (["admin", "sales"].includes(dashboardUser.role)) {
    panels.push(renderRecentOrders(data.recent_orders || []));
  }

  if (["admin", "technician"].includes(dashboardUser.role)) {
    panels.push(renderLowStockItems(data.low_stock_items || []));
    panels.push(renderRecentWarrantyTickets(data.recent_warranty_tickets || []));
  }

  panels.push(renderQuickActions());

  return panels.join("");
}

function renderDashboardCard(label, value, href) {
  const content = `
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
  `;

  if (href) {
    return `<a class="admin-stat-card" href="${escapeAttribute(href)}">${content}</a>`;
  }

  return `<article class="admin-stat-card">${content}</article>`;
}

function renderRecentOrders(orders) {
  return `
    <section class="admin-panel">
      <div class="row-heading">
        <h2>Đơn hàng gần đây</h2>
        <a class="text-link" href="orders.html">Xem tất cả</a>
      </div>
      ${orders.length ? `
        <div class="compact-list">
          ${orders.map(function (order) {
            return `
              <a href="order-detail.html?code=${encodeURIComponent(order.order_code)}">
                <strong>${escapeHtml(order.order_code)}</strong>
                <span>${escapeHtml(getAdminPersonDisplayName(order.customer_name))} - ${escapeHtml(getOrderStatusLabel(order.status))}</span>
                <b>${formatCurrency(order.total_amount)}</b>
              </a>
            `;
          }).join("")}
        </div>
      ` : renderEmpty("Chưa có đơn hàng gần đây.")}
    </section>
  `;
}

function renderLowStockItems(items) {
  return `
    <section class="admin-panel">
      <div class="row-heading">
        <h2>Cảnh báo tồn kho thấp</h2>
        <a class="text-link" href="inventory.html">Xem kho</a>
      </div>
      ${items.length ? `
        <div class="compact-list">
          ${items.map(function (item) {
            return `
              <a href="inventory.html">
                <strong>${escapeHtml(getAdminRecordDisplayText(item.product_name, "Sản phẩm AeroTech"))}</strong>
                <span>${escapeHtml(item.sku)}</span>
                <b>Còn ${escapeHtml(item.available_stock)}</b>
              </a>
            `;
          }).join("")}
        </div>
      ` : renderEmpty("Không có sản phẩm tồn kho thấp.")}
    </section>
  `;
}

function renderRecentWarrantyTickets(tickets) {
  return `
    <section class="admin-panel">
      <div class="row-heading">
        <h2>Phiếu bảo hành gần đây</h2>
        <a class="text-link" href="warranty.html">Xem bảo hành</a>
      </div>
      ${tickets.length ? `
        <div class="compact-list">
          ${tickets.map(function (ticket) {
            return `
              <a href="warranty.html">
                <strong>${escapeHtml(ticket.ticket_code)}</strong>
                <span>${escapeHtml(getAdminRecordDisplayText(ticket.product_name, "Sản phẩm bảo hành"))} - ${escapeHtml(ticket.serial_code)}</span>
                <b>${escapeHtml(getWarrantyTicketStatusLabel(ticket.status))}</b>
              </a>
            `;
          }).join("")}
        </div>
      ` : renderEmpty("Chưa có phiếu bảo hành.")}
    </section>
  `;
}

function renderQuickActions() {
  const links = [];

  if (dashboardUser.role === "admin") {
    links.push(["product-form.html", "Thêm sản phẩm"]);
    links.push(["products.html", "Quản lý sản phẩm"]);
  }

  if (["admin", "sales"].includes(dashboardUser.role)) {
    links.push(["orders.html?status=pending", "Xem đơn chờ duyệt"]);
    links.push(["reports.html", "Xem báo cáo"]);
  }

  if (["admin", "technician"].includes(dashboardUser.role)) {
    links.push(["inventory.html", "Quản lý kho Serial"]);
    links.push(["warranty.html", "Tạo phiếu bảo hành"]);
  }

  return `
    <section class="admin-panel">
      <h2>Thao tác nhanh</h2>
      <div class="quick-link-grid">
        ${links.map(function (link) {
          return `<a href="${escapeAttribute(link[0])}">${escapeHtml(link[1])}</a>`;
        }).join("")}
      </div>
    </section>
  `;
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


