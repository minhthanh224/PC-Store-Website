document.addEventListener("DOMContentLoaded", initReportsPage);

const INVENTORY_REPORT_PAGE_SIZE = 12;

const inventoryReportState = {
  rows: [],
  page: 1
};
let bestSellingExportRows = [];
let warrantyQualityExportRows = [];

async function initReportsPage() {
  const user = await requireAdminRole(["admin"]);
  if (!user) return;

  renderAdminLayout("reports", user);
  bindReportTabs();
  bindReportFilters();
  setReportTab("overview");
  await loadReports();
}

function bindReportTabs() {
  const tabs = document.getElementById("reportsTabs");

  if (!tabs) return;

  tabs.addEventListener("click", function (event) {
    const button = event.target.closest("[data-report-tab]");
    if (!button) return;

    setReportTab(button.dataset.reportTab);
  });
}

function setReportTab(tabKey) {
  const nextTab = tabKey || "overview";
  const tabs = document.querySelectorAll("[data-report-tab]");
  const panels = document.querySelectorAll("[data-report-panel]");

  tabs.forEach(function (button) {
    const active = button.dataset.reportTab === nextTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });

  panels.forEach(function (panel) {
    panel.hidden = panel.dataset.reportPanel !== nextTab;
  });
}

function bindReportFilters() {
  const reportFilterForm = document.getElementById("reportFilterForm");
  const reportResetButton = document.getElementById("reportResetButton");
  const inventoryFilterForm = document.getElementById("inventoryReportFilterForm");
  const inventoryResetButton = document.getElementById("inventoryReportReset");

  if (reportFilterForm) {
    reportFilterForm.addEventListener("submit", function (event) {
      event.preventDefault();
      loadReports();
    });
  }

  if (reportResetButton) {
    reportResetButton.addEventListener("click", function () {
      document.getElementById("reportFrom").value = "";
      document.getElementById("reportTo").value = "";
      document.getElementById("reportGroupBy").value = "day";
      loadReports();
    });
  }

  if (inventoryFilterForm) {
    inventoryFilterForm.addEventListener("submit", function (event) {
      event.preventDefault();
      inventoryReportState.page = 1;
      renderInventoryTable();
    });
  }

  if (inventoryResetButton) {
    inventoryResetButton.addEventListener("click", function () {
      document.getElementById("inventoryReportSearch").value = "";
      document.getElementById("inventoryReportType").value = "";
      document.getElementById("inventoryReportSerial").value = "";
      document.getElementById("inventoryReportAlert").value = "";
      inventoryReportState.page = 1;
      renderInventoryTable();
    });
  }

  document.getElementById("exportBestSelling").addEventListener("click", function () {
    exportCsv("bao-cao-ban-chay.csv", ["Sản phẩm", "SKU", "Số lượng", "Doanh thu"], bestSellingExportRows.map(function (row) {
      return [row.product_name, row.sku, row.total_quantity, row.total_revenue];
    }));
  });
  document.getElementById("exportWarrantyQuality").addEventListener("click", function () {
    exportCsv("bao-cao-ty-le-loi.csv", ["Thương hiệu", "Sản phẩm", "SKU", "Đã bán", "Bảo hành", "Tỷ lệ lỗi (%)"], warrantyQualityExportRows.map(function (row) {
      return [row.brand_name, row.product_name, row.sku, row.sold_count, row.faulty_count, row.failure_rate];
    }));
  });
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
    const [overview, revenue, bestSelling, inventory, warranty, orders, warrantyQuality] = await Promise.all([
      adminGet(`/admin/reports/overview${suffix}`),
      adminGet(`/admin/reports/revenue${suffix}`),
      adminGet(`/admin/reports/best-selling${suffix}`),
      adminGet("/admin/reports/inventory"),
      adminGet("/admin/reports/warranty"),
      adminGet("/admin/reports/orders"),
      adminGet("/admin/reports/warranty-quality")
    ]);

    renderOverview(overview.data);
    renderRevenue(revenue.data || [], "revenueReport");
    renderRevenue(revenue.data || [], "salesRevenueReport");
    renderBestSelling(bestSelling.data || []);
    renderInventory(inventory.data || []);
    renderWarranty(warranty.data || {}, "warrantyReport");
    renderWarranty(warranty.data || {}, "operationsWarrantyReport");
    renderOrders(orders.data || {}, "orderReport");
    renderOrders(orders.data || {}, "operationsOrderReport");
    renderWarrantyQuality(warrantyQuality.data || []);
    showAdminMessage("reportMessage", "success", "Đã cập nhật báo cáo.");
  } catch (error) {
    showAdminMessage("reportMessage", "error", error.message);
  }
}

function setReportLoading() {
  const overview = document.getElementById("reportOverview");
  overview.className = "admin-card-grid loading-box";
  overview.innerHTML = "Đang tải báo cáo...";

  setReportBoxLoading("revenueReport", "Đang tải doanh thu...");
  setReportBoxLoading("salesRevenueReport", "Đang tải doanh thu...");
  setReportBoxLoading("bestSellingReport", "Đang tải sản phẩm bán chạy...", "admin-table-wrap loading-box");
  setReportBoxLoading("inventoryReport", "Đang tải tồn kho...", "admin-table-wrap loading-box");
  setReportBoxLoading("warrantyReport", "Đang tải bảo hành...", "admin-table-wrap loading-box");
  setReportBoxLoading("operationsWarrantyReport", "Đang tải bảo hành...", "admin-table-wrap loading-box");
  setReportBoxLoading("orderReport", "Đang tải đơn hàng...", "admin-table-wrap loading-box");
  setReportBoxLoading("operationsOrderReport", "Đang tải đơn hàng...", "admin-table-wrap loading-box");
  setReportBoxLoading("warrantyQualityReport", "Đang tải tỷ lệ lỗi...", "admin-table-wrap loading-box");

  document.getElementById("inventoryReportSummary").innerHTML = "";
  document.getElementById("inventoryReportPagination").innerHTML = "";
}

function setReportBoxLoading(elementId, message, className) {
  const container = document.getElementById(elementId);

  if (!container) return;

  container.className = className || "loading-box";
  container.innerHTML = renderLoading(message);
}

function renderOverview(data) {
  const container = document.getElementById("reportOverview");

  container.className = "admin-card-grid";
  container.innerHTML = `
    ${renderReportCard("Doanh thu", formatCurrency(data.total_revenue))}
    ${renderReportCard("Lợi nhuận ước tính", formatCurrency(data.estimated_profit))}
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

function renderRevenue(rows, containerId) {
  const container = document.getElementById(containerId);
  container.className = "";

  if (!rows.length) {
    container.innerHTML = renderEmpty("Chưa có doanh thu trong khoảng thời gian này.");
    return;
  }

  const maxRevenue = Math.max(...rows.map(function (row) {
    return Number(row.revenue);
  }), 1);

  container.innerHTML = `
    <div class="report-revenue-list">
      ${rows.map(function (row) {
        const width = Math.max((Number(row.revenue) / maxRevenue) * 100, 3);
        return `
          <article class="report-revenue-row">
            <span class="report-revenue-label">${escapeHtml(row.label)}</span>
            <div class="report-revenue-track" aria-hidden="true"><i style="width:${width}%"></i></div>
            <strong class="report-revenue-value">${formatCurrency(row.revenue)} (${escapeHtml(row.order_count)} đơn)</strong>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderBestSelling(products) {
  const container = document.getElementById("bestSellingReport");
  bestSellingExportRows = products;

  if (!products.length) {
    container.className = "";
    container.innerHTML = renderEmpty("Chưa có sản phẩm bán chạy.");
    return;
  }

  container.className = "admin-table-wrap";
  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Sản phẩm</th><th>SKU</th><th>Thương hiệu</th><th>Danh mục</th><th>Số lượng</th><th>Doanh thu</th></tr></thead>
      <tbody>
        ${products.map(function (product) {
          const imageFallback = getProductImageFallback(product);

          return `
            <tr>
              <td data-label="Sản phẩm">
                <div class="table-product-cell">
                  <img src="${escapeAttribute(getImageUrl(product.primary_image, product))}" alt="${escapeAttribute(product.product_name)}" onerror="this.onerror=null;this.src='${escapeAttribute(imageFallback)}'">
                  <span>${escapeHtml(product.product_name)}</span>
                </div>
              </td>
              <td data-label="SKU">${escapeHtml(product.sku)}</td>
              <td data-label="Thương hiệu">${escapeHtml(product.brand_name || "")}</td>
              <td data-label="Danh mục">${escapeHtml(product.category_name || "")}</td>
              <td data-label="Số lượng">${escapeHtml(product.total_quantity)}</td>
              <td data-label="Doanh thu">${formatCurrency(product.total_revenue)}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function renderWarrantyQuality(rows) {
  const container = document.getElementById("warrantyQualityReport");
  warrantyQualityExportRows = rows;
  container.className = "admin-table-wrap";

  if (!rows.length) {
    container.innerHTML = renderEmpty("Chưa có dữ liệu lỗi bảo hành.");
    return;
  }

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Thương hiệu</th><th>Sản phẩm</th><th>SKU</th><th>Đã bán</th><th>Bảo hành</th><th>Tỷ lệ lỗi</th></tr></thead>
      <tbody>${rows.map(function (row) {
        return `<tr><td>${escapeHtml(row.brand_name || "")}</td><td>${escapeHtml(row.product_name)}</td><td>${escapeHtml(row.sku)}</td><td>${escapeHtml(row.sold_count)}</td><td>${escapeHtml(row.faulty_count)}</td><td>${escapeHtml(row.failure_rate)}%</td></tr>`;
      }).join("")}</tbody>
    </table>
  `;
}

function exportCsv(fileName, headers, rows) {
  const quote = function (value) {
    return `"${String(value === null || value === undefined ? "" : value).replace(/"/g, '""')}"`;
  };
  const csv = [headers].concat(rows).map(function (row) {
    return row.map(quote).join(",");
  }).join("\r\n");
  const link = document.createElement("a");

  link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

function renderInventory(products) {
  inventoryReportState.rows = products;
  inventoryReportState.page = 1;
  renderInventoryTable();
}

function renderInventoryTable() {
  const container = document.getElementById("inventoryReport");
  const pagination = document.getElementById("inventoryReportPagination");
  const summary = document.getElementById("inventoryReportSummary");
  const rows = getFilteredInventoryRows();

  summary.innerHTML = renderInventorySummary(rows.length, inventoryReportState.rows.length);
  pagination.innerHTML = "";

  if (!inventoryReportState.rows.length) {
    container.className = "";
    container.innerHTML = renderEmpty("Chưa có dữ liệu tồn kho.");
    return;
  }

  if (!rows.length) {
    container.className = "";
    container.innerHTML = renderEmpty("Không tìm thấy sản phẩm tồn kho phù hợp bộ lọc.");
    return;
  }

  const pageCount = Math.max(Math.ceil(rows.length / INVENTORY_REPORT_PAGE_SIZE), 1);
  inventoryReportState.page = Math.min(Math.max(inventoryReportState.page, 1), pageCount);

  const startIndex = (inventoryReportState.page - 1) * INVENTORY_REPORT_PAGE_SIZE;
  const pageRows = rows.slice(startIndex, startIndex + INVENTORY_REPORT_PAGE_SIZE);

  container.className = "admin-table-wrap";
  container.innerHTML = `
    <table class="admin-table report-inventory-table">
      <thead><tr><th>Sản phẩm</th><th>SKU</th><th>Loại</th><th>Serial</th><th>Stock thường</th><th>In stock</th><th>Sold</th><th>Warranty</th><th>Returned</th><th>Khả dụng</th><th>Cảnh báo</th></tr></thead>
      <tbody>
        ${pageRows.map(function (product) {
          const alert = getInventoryAlert(product);
          return `
            <tr>
              <td data-label="Sản phẩm">${escapeHtml(product.product_name)}</td>
              <td data-label="SKU">${escapeHtml(product.sku)}</td>
              <td data-label="Loại">${escapeHtml(getProductTypeLabel(product.product_type))}</td>
              <td data-label="Serial">${renderSerialStatus(product.requires_serial)}</td>
              <td data-label="Stock thường">${escapeHtml(product.stock_quantity)}</td>
              <td data-label="In stock">${escapeHtml(product.serial_in_stock)}</td>
              <td data-label="Sold">${escapeHtml(product.serial_sold)}</td>
              <td data-label="Warranty">${escapeHtml(product.serial_warranty)}</td>
              <td data-label="Returned">${escapeHtml(product.serial_returned)}</td>
              <td data-label="Khả dụng"><strong>${escapeHtml(product.available_stock)}</strong></td>
              <td data-label="Cảnh báo"><span class="status-badge ${escapeAttribute(alert.className)}">${escapeHtml(alert.label)}</span></td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;

  renderInventoryPagination(pageCount);
}

function getFilteredInventoryRows() {
  const search = document.getElementById("inventoryReportSearch").value.trim().toLowerCase();
  const type = document.getElementById("inventoryReportType").value;
  const serial = document.getElementById("inventoryReportSerial").value;
  const alert = document.getElementById("inventoryReportAlert").value;

  return inventoryReportState.rows.filter(function (product) {
    const productName = String(product.product_name || "").toLowerCase();
    const sku = String(product.sku || "").toLowerCase();
    const productAlert = getInventoryAlert(product).value;

    if (search && !productName.includes(search) && !sku.includes(search)) return false;
    if (type && product.product_type !== type) return false;
    if (serial === "with_serial" && !product.requires_serial) return false;
    if (serial === "without_serial" && product.requires_serial) return false;
    if (alert && productAlert !== alert) return false;

    return true;
  });
}

function renderInventorySummary(filteredCount, totalCount) {
  const hasFilters = Boolean(
    document.getElementById("inventoryReportSearch").value.trim() ||
    document.getElementById("inventoryReportType").value ||
    document.getElementById("inventoryReportSerial").value ||
    document.getElementById("inventoryReportAlert").value
  );
  const suffix = hasFilters ? " theo bộ lọc hiện tại" : "";

  return `
    <span>Hiển thị <strong>${escapeHtml(filteredCount)}</strong>/<strong>${escapeHtml(totalCount)}</strong> sản phẩm${suffix}.</span>
  `;
}

function renderInventoryPagination(pageCount) {
  const pagination = document.getElementById("inventoryReportPagination");

  if (pageCount <= 1) {
    pagination.innerHTML = "";
    return;
  }

  pagination.innerHTML = `
    <button class="btn btn-light" type="button" data-inventory-page="${inventoryReportState.page - 1}" ${inventoryReportState.page === 1 ? "disabled" : ""}>Trước</button>
    <span>Trang ${escapeHtml(inventoryReportState.page)} / ${escapeHtml(pageCount)}</span>
    <button class="btn btn-light" type="button" data-inventory-page="${inventoryReportState.page + 1}" ${inventoryReportState.page === pageCount ? "disabled" : ""}>Sau</button>
  `;

  pagination.querySelectorAll("[data-inventory-page]").forEach(function (button) {
    button.addEventListener("click", function () {
      inventoryReportState.page = Number(button.dataset.inventoryPage);
      renderInventoryTable();
    });
  });
}

function renderSerialStatus(requiresSerial) {
  if (requiresSerial) {
    return '<span class="status-badge active">Có serial</span>';
  }

  return '<span class="status-badge neutral">Không serial</span>';
}

function getInventoryAlert(product) {
  const availableStock = Number(product.available_stock);

  if (availableStock <= 0) {
    return {
      value: "out_stock",
      label: "Hết hàng",
      className: "out-stock"
    };
  }

  if (product.low_stock_warning || availableStock < 3) {
    return {
      value: "low_stock",
      label: "Tồn thấp",
      className: "pending"
    };
  }

  return {
    value: "ok",
    label: "Ổn",
    className: "completed"
  };
}

function renderWarranty(data, containerId) {
  const container = document.getElementById(containerId);
  const counts = data.counts || [];

  container.className = "report-status-list";
  container.innerHTML = `
    ${counts.map(function (row) {
      return `
        <div class="report-status-row">
          <span class="status-badge ${escapeAttribute(row.status)}">${escapeHtml(row.status_label)}</span>
          <strong>${escapeHtml(row.count)}</strong>
        </div>
      `;
    }).join("") || renderEmpty("Chưa có dữ liệu bảo hành.")}
  `;
}

function renderOrders(data, containerId) {
  const container = document.getElementById(containerId);
  const statuses = ["pending", "approved", "shipping", "completed", "cancelled", "returned"];

  container.className = "report-status-list";
  container.innerHTML = `
    ${statuses.map(function (status) {
      return `
        <div class="report-status-row">
          <span class="status-badge ${escapeAttribute(status)}">${escapeHtml(getOrderStatusLabel(status))}</span>
          <strong>${escapeHtml(data[status] || 0)}</strong>
        </div>
      `;
    }).join("")}
  `;
}
