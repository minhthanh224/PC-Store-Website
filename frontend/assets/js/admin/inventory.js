let inventoryProducts = [];

document.addEventListener("DOMContentLoaded", initInventory);

async function initInventory() {
  const user = await requireAdminRole(["admin", "technician"]);
  if (!user) return;

  renderAdminLayout("inventory", user);
  bindInventoryTabs();
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
  const query = buildQueryString({
    keyword: document.getElementById("serialKeyword").value.trim(),
    status: document.getElementById("serialStatus").value,
    limit: 20
  });

  try {
    const response = await adminGet(`/admin/inventory/serials?${query}`);
    container.className = "admin-table-wrap";
    container.innerHTML = renderSerialTable(response.data || []);
  } catch (error) {
    container.innerHTML = renderError(error.message);
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


