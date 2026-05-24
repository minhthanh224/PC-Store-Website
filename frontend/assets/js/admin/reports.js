document.addEventListener("DOMContentLoaded", initReportsPage);

async function initReportsPage() {
  const user = await requireAdminRole(["admin", "sales"]);
  if (!user) return;

  renderAdminLayout("reports", user);
  document.getElementById("reportFilterForm").addEventListener("submit", function (event) {
    event.preventDefault();
    loadReports();
  });
  await loadReports();
}

async function loadReports() {
  const query = buildQueryString({
    from: document.getElementById("reportFrom").value,
    to: document.getElementById("reportTo").value,
    groupBy: document.getElementById("reportGroupBy").value
  });
  const suffix = query ? `?${query}` : "";

  setReportLoading();

  try {
    const [overview, revenue, bestSelling, inventory, warranty, orders] = await Promise.all([
      adminGet(`/admin/reports/overview${suffix}`),
      adminGet(`/admin/reports/revenue${suffix}`),
      adminGet(`/admin/reports/best-selling${suffix}`),
      adminGet("/admin/reports/inventory"),
      adminGet("/admin/reports/warranty"),
      adminGet("/admin/reports/orders")
    ]);

    renderOverview(overview.data);
    renderRevenue(revenue.data || []);
    renderBestSelling(bestSelling.data || []);
    renderInventory(inventory.data || []);
    renderWarranty(warranty.data || {});
    renderOrders(orders.data || {});
    showAdminMessage("reportMessage", "success", "Đã cập nhật báo cáo.");
  } catch (error) {
    showAdminMessage("reportMessage", "error", error.message);
  }
}

function setReportLoading() {
  document.getElementById("reportOverview").className = "admin-card-grid loading-box";
  document.getElementById("reportOverview").innerHTML = "Đang tải báo cáo...";
  document.getElementById("revenueReport").innerHTML = renderLoading("Đang tải doanh thu...");
  document.getElementById("bestSellingReport").innerHTML = renderLoading("Đang tải sản phẩm bán chạy...");
  document.getElementById("inventoryReport").innerHTML = renderLoading("Đang tải tồn kho...");
  document.getElementById("warrantyReport").innerHTML = renderLoading("Đang tải bảo hành...");
  document.getElementById("orderReport").innerHTML = renderLoading("Đang tải đơn hàng...");
}

function renderOverview(data) {
  const container = document.getElementById("reportOverview");

  container.className = "admin-card-grid";
  container.innerHTML = `
    ${renderReportCard("Doanh thu", formatCurrency(data.total_revenue))}
    ${renderReportCard("Đơn hoàn thành", data.completed_order_count)}
    ${renderReportCard("Đơn chờ duyệt", data.pending_order_count)}
    ${renderReportCard("Sản phẩm đã bán", data.total_products_sold)}
    ${renderReportCard("Tồn kho thấp", data.low_stock_count)}
    ${renderReportCard("Phiếu bảo hành mở", data.active_warranty_count)}
  `;
}

function renderReportCard(label, value) {
  return `
    <article class="admin-stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function renderRevenue(rows) {
  const container = document.getElementById("revenueReport");

  if (!rows.length) {
    container.innerHTML = renderEmpty("Chưa có doanh thu trong khoảng thời gian này.");
    return;
  }

  const maxRevenue = Math.max(...rows.map(function (row) {
    return Number(row.revenue);
  }), 1);

  container.innerHTML = `
    <div class="report-bar-list">
      ${rows.map(function (row) {
        const width = Math.max((Number(row.revenue) / maxRevenue) * 100, 3);
        return `
          <div class="report-bar-row">
            <span>${escapeHtml(row.label)}</span>
            <div><i style="width:${width}%"></i></div>
            <strong>${formatCurrency(row.revenue)} (${escapeHtml(row.order_count)} đơn)</strong>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderBestSelling(products) {
  const container = document.getElementById("bestSellingReport");

  if (!products.length) {
    container.innerHTML = renderEmpty("Chưa có sản phẩm bán chạy.");
    return;
  }

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Sản phẩm</th><th>SKU</th><th>Thương hiệu</th><th>Danh mục</th><th>Số lượng</th><th>Doanh thu</th></tr></thead>
      <tbody>
        ${products.map(function (product) {
          return `
            <tr>
              <td>
                <div class="table-product-cell">
                  <img src="${escapeAttribute(getImageUrl(product.primary_image))}" alt="${escapeAttribute(product.product_name)}" onerror="this.onerror=null;this.src='${PRODUCT_PLACEHOLDER_IMAGE}'">
                  <span>${escapeHtml(product.product_name)}</span>
                </div>
              </td>
              <td>${escapeHtml(product.sku)}</td>
              <td>${escapeHtml(product.brand_name || "")}</td>
              <td>${escapeHtml(product.category_name || "")}</td>
              <td>${escapeHtml(product.total_quantity)}</td>
              <td>${formatCurrency(product.total_revenue)}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function renderInventory(products) {
  const container = document.getElementById("inventoryReport");

  if (!products.length) {
    container.innerHTML = renderEmpty("Chưa có dữ liệu tồn kho.");
    return;
  }

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Sản phẩm</th><th>SKU</th><th>Loại</th><th>Serial</th><th>Stock thường</th><th>In stock</th><th>Sold</th><th>Warranty</th><th>Returned</th><th>Khả dụng</th><th>Cảnh báo</th></tr></thead>
      <tbody>
        ${products.map(function (product) {
          return `
            <tr>
              <td>${escapeHtml(product.product_name)}</td>
              <td>${escapeHtml(product.sku)}</td>
              <td>${escapeHtml(getProductTypeLabel(product.product_type))}</td>
              <td>${product.requires_serial ? "Có" : "Không"}</td>
              <td>${escapeHtml(product.stock_quantity)}</td>
              <td>${escapeHtml(product.serial_in_stock)}</td>
              <td>${escapeHtml(product.serial_sold)}</td>
              <td>${escapeHtml(product.serial_warranty)}</td>
              <td>${escapeHtml(product.serial_returned)}</td>
              <td><strong>${escapeHtml(product.available_stock)}</strong></td>
              <td>${product.low_stock_warning ? '<span class="status-badge cancelled">Tồn thấp</span>' : '<span class="status-badge completed">Ổn</span>'}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function renderWarranty(data) {
  const container = document.getElementById("warrantyReport");
  const counts = data.counts || [];

  container.innerHTML = `
    <table class="admin-table compact-report-table">
      <thead><tr><th>Trạng thái</th><th>Số phiếu</th></tr></thead>
      <tbody>
        ${counts.map(function (row) {
          return `
            <tr>
              <td><span class="status-badge ${escapeAttribute(row.status)}">${escapeHtml(row.status_label)}</span></td>
              <td>${escapeHtml(row.count)}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function renderOrders(data) {
  const container = document.getElementById("orderReport");
  const statuses = ["pending", "approved", "shipping", "completed", "cancelled"];

  container.innerHTML = `
    <table class="admin-table compact-report-table">
      <thead><tr><th>Trạng thái</th><th>Số đơn</th></tr></thead>
      <tbody>
        ${statuses.map(function (status) {
          return `
            <tr>
              <td><span class="status-badge ${escapeAttribute(status)}">${escapeHtml(getOrderStatusLabel(status))}</span></td>
              <td>${escapeHtml(data[status] || 0)}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}


