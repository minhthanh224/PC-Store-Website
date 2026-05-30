let inventoryProducts = [];
let serialImportFile = null;
let serialImportCanCommit = false;

const SERIAL_IMPORT_REQUIRED_HEADERS = ["product_sku", "serial_code", "import_date", "note"];

document.addEventListener("DOMContentLoaded", initInventory);

async function initInventory() {
  const user = await requireAdminRole(["admin", "technician"]);
  if (!user) return;

  renderAdminLayout("inventory", user);
  bindInventoryTabs();
  bindSerialImport();
  document.getElementById("inventorySummaryFilterForm").addEventListener("submit", function (event) {
    event.preventDefault();
    renderFilteredInventorySummary();
  });
  document.getElementById("resetInventorySummaryFilterBtn").addEventListener("click", resetInventorySummaryFilter);
  document.getElementById("serialForm").addEventListener("submit", addSerial);
  document.getElementById("serialFilterForm").addEventListener("submit", function (event) {
    event.preventDefault();
    loadSerials();
  });
  document.getElementById("resetSerialFilterBtn").addEventListener("click", resetSerialFilter);
  document.getElementById("exportSerialsBtn").addEventListener("click", exportSerials);
  document.getElementById("serialImportDate").value = new Date().toISOString().slice(0, 10);
  await Promise.all([loadInventorySummary(), loadSerializedProductOptions(), loadSerials()]);
}

function bindInventoryTabs() {
  const tabs = document.getElementById("inventoryTabs");

  if (!tabs) {
    return;
  }

  tabs.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-tab]");

    if (!button) {
      return;
    }

    setInventoryTab(button.dataset.tab);
  });
}

function setInventoryTab(tabKey) {
  document.querySelectorAll("#inventoryTabs button").forEach(function (button) {
    button.classList.toggle("active", button.dataset.tab === tabKey);
  });

  document.querySelectorAll("[data-tab-panel]").forEach(function (panel) {
    panel.hidden = panel.dataset.tabPanel !== tabKey;
  });
}

function bindSerialImport() {
  const fileInput = document.getElementById("serialImportFile");
  const previewButton = document.getElementById("previewSerialImportBtn");
  const commitButton = document.getElementById("commitSerialImportBtn");

  if (!fileInput || !previewButton || !commitButton) {
    return;
  }

  fileInput.addEventListener("change", function () {
    serialImportFile = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    serialImportCanCommit = false;
    commitButton.disabled = true;
    renderSerialImportFileMeta();
    document.getElementById("serialImportPreview").innerHTML = "";
  });

  previewButton.addEventListener("click", previewSerialImport);
  commitButton.addEventListener("click", commitSerialImport);
}

function renderSerialImportFileMeta() {
  const meta = document.getElementById("serialImportFileMeta");

  if (!meta) {
    return;
  }

  if (!serialImportFile) {
    meta.className = "import-file-meta";
    meta.textContent = "Chưa chọn file CSV.";
    return;
  }

  meta.className = "import-file-meta has-file";
  meta.textContent = `${serialImportFile.name} · ${formatFileSize(serialImportFile.size)}`;
}

function formatFileSize(size) {
  if (!Number.isFinite(size)) {
    return "";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function buildSerialImportFormData() {
  const formData = new FormData();
  formData.append("file", serialImportFile);
  return formData;
}

async function previewSerialImport() {
  const container = document.getElementById("serialImportPreview");
  const commitButton = document.getElementById("commitSerialImportBtn");

  if (!serialImportFile) {
    container.innerHTML = renderError("Vui lòng chọn file CSV để import Serial.");
    return;
  }

  container.innerHTML = '<div class="loading-box">Đang kiểm tra file Serial...</div>';
  serialImportCanCommit = false;
  commitButton.disabled = true;

  try {
    const response = await adminPostFormData("/admin/inventory/serials/import/preview", buildSerialImportFormData());
    const preview = response.data || {};
    serialImportCanCommit = Boolean(preview.canCommit);
    commitButton.disabled = !serialImportCanCommit;
    container.innerHTML = renderSerialImportPreview(preview);
  } catch (error) {
    const preview = error.data || null;
    serialImportCanCommit = false;
    commitButton.disabled = true;
    container.innerHTML = preview ? renderSerialImportPreview(preview) : renderError(error.message);
  }
}

async function commitSerialImport() {
  const container = document.getElementById("serialImportPreview");
  const commitButton = document.getElementById("commitSerialImportBtn");

  if (!serialImportFile || !serialImportCanCommit) {
    container.innerHTML = renderError("Vui lòng preview file Serial hợp lệ trước khi xác nhận import.");
    return;
  }

  commitButton.disabled = true;
  container.innerHTML = '<div class="loading-box">Đang import Serial...</div>';

  try {
    const response = await adminPostFormData("/admin/inventory/serials/import/commit", buildSerialImportFormData());
    serialImportCanCommit = false;
    document.getElementById("serialImportFile").value = "";
    serialImportFile = null;
    renderSerialImportFileMeta();
    container.innerHTML = `<div class="state-box state-success">${escapeHtml(response.message || "Import Serial thành công.")}</div>`;
    await Promise.all([loadInventorySummary(), loadSerials()]);
  } catch (error) {
    const preview = error.data || null;
    container.innerHTML = preview ? renderSerialImportPreview(preview) : renderError(error.message);
  } finally {
    commitButton.disabled = true;
  }
}

function renderSerialImportPreview(preview) {
  const summary = [
    { label: "Dòng dữ liệu", value: preview.totalRows || 0 },
    { label: "Sẽ tạo", value: preview.createCount || 0 },
    { label: "Lỗi", value: preview.errorCount || 0 },
    { label: "Cảnh báo", value: preview.warningCount || 0 }
  ];

  return `
    <div class="admin-import-summary serial-import-summary">
      ${summary.map(function (item) {
        return `<article><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></article>`;
      }).join("")}
    </div>
    <div class="serial-import-format-note">
      Header khuyến nghị: ${SERIAL_IMPORT_REQUIRED_HEADERS.map(function (header) {
        return `<code>${escapeHtml(header)}</code>`;
      }).join(" ")}
    </div>
    ${renderSerialImportIssueList("Lỗi cần sửa", preview.errors || [], "has-errors")}
    ${renderSerialImportIssueList("Cảnh báo", preview.warnings || [], "has-warnings")}
    ${preview.canCommit ? '<div class="state-box state-success">File hợp lệ. Bạn có thể xác nhận import.</div>' : ''}
  `;
}

function renderSerialImportIssueList(title, issues, className) {
  if (!issues.length) {
    return "";
  }

  return `
    <section class="admin-import-list ${className}">
      <h3>${escapeHtml(title)}</h3>
      <ul>
        ${issues.slice(0, 80).map(function (issue) {
          const location = [issue.file, issue.line ? `dòng ${issue.line}` : "", issue.field].filter(Boolean).join(" / ");
          return `<li><strong>${escapeHtml(location || "Dữ liệu")}</strong>: ${escapeHtml(issue.message || "Không hợp lệ")}</li>`;
        }).join("")}
      </ul>
      ${issues.length > 80 ? `<p class="muted-text">Còn ${escapeHtml(issues.length - 80)} lỗi/cảnh báo khác.</p>` : ""}
    </section>
  `;
}

async function loadInventorySummary() {
  const container = document.getElementById("inventorySummary");

  try {
    const response = await adminGet("/admin/inventory/summary");
    inventoryProducts = response.data || [];
    container.className = "admin-table-wrap";
    container.innerHTML = renderInventoryTable(getFilteredInventoryProducts());
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function getFilteredInventoryProducts() {
  const keyword = document.getElementById("inventorySummaryKeyword").value.trim().toLowerCase();
  const status = document.getElementById("inventorySummaryStatus").value;

  return inventoryProducts.filter(function (product) {
    const availableStock = Number(product.available_stock !== undefined ? product.available_stock : (product.requires_serial ? product.serial_in_stock : product.normal_stock_quantity));
    const keywordMatched = !keyword
      || String(product.product_name || "").toLowerCase().includes(keyword)
      || String(product.sku || "").toLowerCase().includes(keyword);
    let statusMatched = true;

    if (status === "low_stock") {
      statusMatched = Boolean(product.low_stock_warning);
    } else if (status === "in_stock") {
      statusMatched = availableStock > 0;
    } else if (status === "out_stock") {
      statusMatched = availableStock <= 0;
    } else if (status === "requires_serial") {
      statusMatched = Boolean(product.requires_serial);
    }

    return keywordMatched && statusMatched;
  });
}

function renderFilteredInventorySummary() {
  const container = document.getElementById("inventorySummary");
  container.className = "admin-table-wrap";
  container.innerHTML = renderInventoryTable(getFilteredInventoryProducts());
}

function resetInventorySummaryFilter() {
  document.getElementById("inventorySummaryKeyword").value = "";
  document.getElementById("inventorySummaryStatus").value = "";
  renderFilteredInventorySummary();
}

function renderInventoryTable(products) {
  if (!products.length) {
    return renderEmpty("Chưa có sản phẩm phù hợp.");
  }

  return `
    <table class="admin-table">
      <thead>
        <tr><th>Sản phẩm</th><th>SKU</th><th>Serial</th><th>Thường</th><th>In stock</th><th>Sold</th><th>Warranty</th><th>Returned</th><th>Khả dụng</th><th>Cảnh báo</th></tr>
      </thead>
      <tbody>
        ${products.map(function (product) {
          const availableStock = Number(product.available_stock !== undefined ? product.available_stock : (product.requires_serial ? product.serial_in_stock : product.normal_stock_quantity));
          const warningBadge = availableStock <= 0
            ? '<span class="status-badge out-stock">Hết hàng</span>'
            : (product.low_stock_warning ? '<span class="status-badge low-stock">Tồn thấp</span>' : '<span class="status-badge good">Ổn</span>');
          return `
            <tr>
              <td><strong>${escapeHtml(getAdminRecordDisplayText(product.product_name, "Sản phẩm AeroTech"))}</strong></td>
              <td>${escapeHtml(product.sku)}</td>
              <td>${product.requires_serial ? "Có Serial" : "Không"}</td>
              <td class="numeric">${escapeHtml(product.normal_stock_quantity)}</td>
              <td class="numeric">${escapeHtml(product.serial_in_stock)}</td>
              <td class="numeric">${escapeHtml(product.serial_sold)}</td>
              <td class="numeric">${escapeHtml(product.serial_warranty)}</td>
              <td class="numeric">${escapeHtml(product.serial_returned)}</td>
              <td class="numeric"><strong>${escapeHtml(availableStock)}</strong></td>
              <td>${warningBadge}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

async function loadSerializedProductOptions() {
  const select = document.getElementById("serialProduct");
  select.disabled = true;
  select.innerHTML = '<option value="">Đang tải sản phẩm...</option>';

  try {
    const response = await adminGet("/admin/inventory/products");
    renderSerializedProductOptions(response.data || []);
  } catch (error) {
    console.error("Inventory product dropdown load failed:", error.message);

    try {
      const fallbackResponse = await apiGet("/products?requiresSerial=true&limit=48");
      renderSerializedProductOptions(fallbackResponse.data || []);
    } catch (fallbackError) {
      select.innerHTML = '<option value="">Không tải được danh sách sản phẩm</option>';
      showAdminMessage(
        "serialMessage",
        "error",
        `Không tải được danh sách sản phẩm. ${error.message || "Vui lòng kiểm tra quyền hoặc thử lại."}`
      );
    }
  }
}

function renderSerializedProductOptions(products) {
  const select = document.getElementById("serialProduct");

  if (!products.length) {
    select.innerHTML = '<option value="">Không có sản phẩm khả dụng</option>';
    return;
  }

  select.innerHTML = products.map(function (product) {
    const meta = [
      product.sku,
      product.brand_name || product.brandName,
      product.category_name || product.categoryName
    ].filter(Boolean).join(" - ");

    return `<option value="${escapeAttribute(product.id)}">${escapeHtml(product.name)}${meta ? ` - ${escapeHtml(meta)}` : ""}</option>`;
  }).join("");
  select.disabled = false;
}

async function loadSerials() {
  const container = document.getElementById("serialTable");
  const query = buildSerialFilterQuery();

  try {
    const response = await adminGet(`/admin/inventory/serials?${query}`);
    container.className = "admin-table-wrap";
    container.innerHTML = renderSerialTable(response.data || []);
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function buildSerialFilterQuery(extra) {
  return buildQueryString({
    keyword: document.getElementById("serialKeyword").value.trim(),
    status: document.getElementById("serialStatus").value,
    limit: extra && extra.limit ? extra.limit : 20
  });
}

function resetSerialFilter() {
  document.getElementById("serialKeyword").value = "";
  document.getElementById("serialStatus").value = "";
  loadSerials();
}

async function exportSerials() {
  const token = getAuthToken();

  if (!token) {
    window.location.href = `../login.html?redirect=${encodeURIComponent(getAdminRedirectPath())}`;
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/inventory/serials/export?${buildSerialFilterQuery({ limit: 10000 })}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const data = await response.json().catch(function () { return {}; });
      throw new Error(data.message || "Không thể xuất danh sách Serial.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aerotech-serials-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    showAdminMessage("serialMessage", "error", error.message);
    setInventoryTab("add");
  }
}

function renderSerialTable(serials) {
  if (!serials.length) {
    return renderEmpty("Chưa có Serial phù hợp.");
  }

  return `
    <table class="admin-table">
      <thead><tr><th>Serial</th><th>Sản phẩm</th><th>SKU</th><th>Trạng thái</th><th>Ngày nhập</th><th>Ghi chú</th></tr></thead>
      <tbody>
        ${serials.map(function (serial) {
          return `
            <tr>
              <td>${escapeHtml(serial.serial_code)}</td>
              <td>${escapeHtml(serial.product_name)}</td>
              <td>${escapeHtml(serial.product_sku)}</td>
              <td><span class="status-badge ${escapeAttribute(serial.status)}">${escapeHtml(getSerialStatusLabel(serial.status))}</span></td>
              <td>${escapeHtml(serial.import_date ? String(serial.import_date).slice(0, 10) : "")}</td>
              <td>${escapeHtml(serial.note || "")}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

async function addSerial(event) {
  event.preventDefault();

  try {
    await adminPost("/admin/inventory/serials", {
      product_id: Number(document.getElementById("serialProduct").value),
      serial_code: document.getElementById("serialCode").value.trim(),
      import_date: document.getElementById("serialImportDate").value,
      note: document.getElementById("serialNote").value.trim()
    });
    document.getElementById("serialCode").value = "";
    document.getElementById("serialNote").value = "";
    showAdminMessage("serialMessage", "success", "Thêm Serial thành công.");
    await Promise.all([loadInventorySummary(), loadSerials()]);
  } catch (error) {
    showAdminMessage("serialMessage", "error", error.message);
  }
}

function getSerialStatusLabel(status) {
  return {
    in_stock: "Trong kho",
    sold: "Đã bán",
    warranty: "Bảo hành",
    returned: "Đã trả"
  }[status] || status;
}
