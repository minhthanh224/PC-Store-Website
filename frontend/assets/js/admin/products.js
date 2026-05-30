let adminProductPage = 1;

document.addEventListener("DOMContentLoaded", initAdminProducts);

let latestProductImportPreview = null;

async function initAdminProducts() {
  const user = await requireAdminRole(["admin"]);
  if (!user) return;

  renderAdminLayout("products", user);
  bindProductPageTabs();
  document.getElementById("productFilterForm").addEventListener("submit", function (event) {
    event.preventDefault();
    adminProductPage = 1;
    loadAdminProducts();
  });
  document.getElementById("resetProductFilterBtn").addEventListener("click", resetProductFilters);
  document.getElementById("productImportFile").addEventListener("change", handleProductImportFileChange);
  document.getElementById("previewProductImportBtn").addEventListener("click", previewProductImport);
  document.getElementById("commitProductImportBtn").addEventListener("click", commitProductImport);
  document.querySelectorAll("input[name='productImportMode']").forEach(function (input) {
    input.addEventListener("change", handleProductImportModeChange);
  });
  document.getElementById("replaceCatalogConfirmInput").addEventListener("input", updateProductImportModeState);
  document.getElementById("focusProductImportBtn").addEventListener("click", function () {
    document.getElementById("productImportPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("productImportUploadBox").focus({ preventScroll: true });
  });
  document.getElementById("viewProductListAfterImportBtn").addEventListener("click", function () {
    setProductTab("list");
    loadAdminProducts();
  });
  updateProductImportFileMeta();
  updateProductImportModeState();
  setProductTab("list");
  await loadAdminProducts();
}

function bindProductPageTabs() {
  const tabs = document.getElementById("productsAdminTabs");
  const openCreateButton = document.getElementById("openProductCreateTabBtn");

  if (tabs) {
    tabs.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-product-tab]");

      if (!button) {
        return;
      }

      setProductTab(button.dataset.productTab);
    });
  }

  if (openCreateButton) {
    openCreateButton.addEventListener("click", function () {
      setProductTab("create");
    });
  }
}

function setProductTab(tabKey) {
  const key = tabKey === "create" ? "create" : "list";
  const openCreateButton = document.getElementById("openProductCreateTabBtn");

  document.querySelectorAll("[data-product-tab]").forEach(function (button) {
    const isActive = button.dataset.productTab === key;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  document.querySelectorAll("[data-product-panel]").forEach(function (panel) {
    panel.hidden = panel.dataset.productPanel !== key;
  });

  if (openCreateButton) {
    openCreateButton.hidden = key === "create";
  }
}

function resetProductFilters() {
  document.getElementById("productKeyword").value = "";
  document.getElementById("productStatus").value = "";
  document.getElementById("productType").value = "";
  adminProductPage = 1;
  loadAdminProducts();
}

async function loadAdminProducts() {
  const container = document.getElementById("productTable");
  const query = buildQueryString({
    keyword: document.getElementById("productKeyword").value.trim(),
    status: document.getElementById("productStatus").value,
    productType: document.getElementById("productType").value,
    page: adminProductPage,
    limit: 12
  });

  container.className = "admin-table-wrap loading-box";
  container.innerHTML = "Đang tải sản phẩm...";

  try {
    const response = await adminGet(`/admin/products?${query}`);
    container.className = "admin-table-wrap";
    container.innerHTML = renderProductTable(response.data || []);
    renderAdminProductPagination(response.pagination);
    bindProductActions();
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function renderProductTable(products) {
  if (!products.length) {
    return renderEmpty("Chưa có sản phẩm phù hợp.");
  }

  return `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Sản phẩm</th>
          <th>SKU</th>
          <th>Loại</th>
          <th>Danh mục</th>
          <th>Giá</th>
          <th>Serial</th>
          <th>Tồn</th>
          <th>Trạng thái</th>
          <th>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        ${products.map(function (product) {
          const imageFallback = getProductImageFallback(product);

          return `
            <tr>
              <td>
                <div class="table-product-cell">
                  <img src="${escapeAttribute(getImageUrl(product.primary_image, product))}" alt="${escapeAttribute(product.name)}" onerror="this.onerror=null;this.src='${escapeAttribute(imageFallback)}'">
                  <span>${escapeHtml(product.name)}</span>
                </div>
              </td>
              <td>${escapeHtml(product.sku)}</td>
              <td>${escapeHtml(getProductTypeLabel(product.product_type))}</td>
              <td>${escapeHtml(product.category_name)}</td>
              <td>${formatCurrency(product.sale_price || product.base_price)}</td>
              <td>${product.requires_serial ? "Quản lý Serial" : "Tồn kho thường"}</td>
              <td>${escapeHtml(product.available_stock)}</td>
              <td><span class="status-badge ${escapeAttribute(product.status)}">${escapeHtml(getCatalogStatusLabel(product.status))}</span></td>
              <td class="table-actions">
                <a class="btn btn-outline" href="product-form.html?id=${encodeURIComponent(product.id)}">Sửa</a>
                <button class="btn ${product.status === "active" ? "btn-danger-outline" : "btn-success-outline"} js-toggle-product" type="button" data-id="${escapeAttribute(product.id)}" data-status="${product.status === "active" ? "inactive" : "active"}">
                  ${product.status === "active" ? "Ngừng bán" : "Kích hoạt"}
                </button>
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function bindProductActions() {
  document.querySelectorAll(".js-toggle-product").forEach(function (button) {
    button.addEventListener("click", async function () {
      if (button.dataset.status === "inactive" && !confirm("Ngừng bán sản phẩm này?")) {
        return;
      }

      try {
        await adminPatch(`/admin/products/${button.dataset.id}/status`, {
          status: button.dataset.status
        });
        showToast("Đã cập nhật trạng thái sản phẩm.");
        await loadAdminProducts();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
}

function renderAdminProductPagination(pagination) {
  const container = document.getElementById("productPagination");

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
      adminProductPage = Number(button.dataset.page);
      loadAdminProducts();
    });
  });
}

function getProductImportFile() {
  const input = document.getElementById("productImportFile");
  return input && input.files && input.files[0] ? input.files[0] : null;
}

function getProductImportOptions() {
  const selectedMode = document.querySelector("input[name='productImportMode']:checked");
  const importMode = selectedMode ? selectedMode.value : "strict";
  const confirmReset = document.getElementById("replaceCatalogConfirmInput").value.trim();

  return {
    importMode,
    confirmReset
  };
}

function isProductImportModeValid(options) {
  return options.importMode !== "replaceCatalog" || options.confirmReset === "RESET CATALOG";
}

function getProductImportFormData() {
  const file = getProductImportFile();
  const options = getProductImportOptions();

  if (!file) {
    showProductImportAlert("warning", "Vui lòng chọn file .zip để import.");
    return null;
  }

  if (!isProductImportModeValid(options)) {
    showProductImportAlert("warning", "Vui lòng nhập RESET CATALOG để dùng chế độ reset catalog.");
    return null;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("importMode", options.importMode);
  formData.append("confirmReset", options.confirmReset);
  return formData;
}

function handleProductImportFileChange() {
  resetProductImportPreviewState();
  updateProductImportFileMeta();
}

function handleProductImportModeChange() {
  resetProductImportPreviewState();
  updateProductImportModeState();
}

function resetProductImportPreviewState() {
  latestProductImportPreview = null;
  document.getElementById("commitProductImportBtn").disabled = true;
  document.getElementById("viewProductListAfterImportBtn").hidden = true;
  document.getElementById("productImportPreview").innerHTML = "";
  document.getElementById("productImportMessage").innerHTML = "";
}

function updateProductImportModeState() {
  const options = getProductImportOptions();
  const confirmWrap = document.getElementById("replaceCatalogConfirmWrap");
  const previewButton = document.getElementById("previewProductImportBtn");
  const commitButton = document.getElementById("commitProductImportBtn");
  const modeIsValid = isProductImportModeValid(options);

  confirmWrap.hidden = options.importMode !== "replaceCatalog";
  previewButton.disabled = !modeIsValid;

  if (!latestProductImportPreview || !latestProductImportPreview.canCommit || !modeIsValid) {
    commitButton.disabled = true;
  } else {
    commitButton.disabled = false;
  }
}

function updateProductImportFileMeta() {
  const file = getProductImportFile();
  const meta = document.getElementById("productImportFileMeta");

  if (!meta) {
    return;
  }

  if (!file) {
    meta.textContent = "Chưa chọn file import.";
    meta.classList.remove("has-file");
    return;
  }

  meta.textContent = `${file.name} - ${formatFileSize(file.size)}`;
  meta.classList.add("has-file");
}

function formatFileSize(size) {
  const bytes = Number(size || 0);

  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.ceil(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

function showProductImportAlert(type, message) {
  const container = document.getElementById("productImportMessage");
  const labels = {
    success: "OK",
    error: "Lỗi",
    warning: "Lưu ý",
    info: "Đang xử lý"
  };

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="import-alert import-alert-${escapeAttribute(type)}">
      <span class="import-alert-icon" aria-hidden="true">${escapeHtml(labels[type] || "Info")}</span>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}

async function previewProductImport() {
  const formData = getProductImportFormData();
  const previewButton = document.getElementById("previewProductImportBtn");
  const commitButton = document.getElementById("commitProductImportBtn");

  if (!formData) {
    return;
  }

  previewButton.disabled = true;
  commitButton.disabled = true;
  document.getElementById("viewProductListAfterImportBtn").hidden = true;
  document.getElementById("productImportPreview").innerHTML = "";
  showProductImportAlert("info", "Đang kiểm tra dữ liệu import...");

  try {
    const response = await adminPostFormData("/admin/import/products/preview", formData);
    latestProductImportPreview = response.data;
    document.getElementById("productImportPreview").innerHTML = renderProductImportPreview(response.data);
    commitButton.disabled = !response.data.canCommit;
    showProductImportAlert(
      response.data.canCommit ? "success" : "error",
      response.data.canCommit ? "Dữ liệu hợp lệ, có thể xác nhận import." : "File import còn lỗi cần xử lý."
    );
  } catch (error) {
    latestProductImportPreview = error.data || null;
    document.getElementById("productImportPreview").innerHTML = error.data ? renderProductImportPreview(error.data) : "";
    showProductImportAlert("error", error.message);
  } finally {
    previewButton.disabled = false;
    updateProductImportModeState();
  }
}

async function commitProductImport() {
  const formData = getProductImportFormData();
  const commitButton = document.getElementById("commitProductImportBtn");

  if (!formData || !latestProductImportPreview || !latestProductImportPreview.canCommit) {
    return;
  }

  if (!confirm("Xác nhận import sản phẩm từ file zip này?")) {
    return;
  }

  commitButton.disabled = true;
  showProductImportAlert("info", "Đang import sản phẩm...");

  try {
    const response = await adminPostFormData("/admin/import/products/commit", formData);
    document.getElementById("productImportPreview").innerHTML = renderProductImportPreview(response.data);
    showProductImportAlert("success", response.message || "Import sản phẩm thành công.");
    document.getElementById("viewProductListAfterImportBtn").hidden = false;
    resetProductFilters();
  } catch (error) {
    document.getElementById("productImportPreview").innerHTML = error.data ? renderProductImportPreview(error.data) : "";
    showProductImportAlert("error", error.message);
    commitButton.disabled = !(error.data && error.data.canCommit);
  }
}

function renderProductImportPreview(data) {
  if (!data) {
    return "";
  }

  const errors = data.errors || [];
  const warnings = data.warnings || [];
  const skippedFiles = data.skippedFiles || data.skippedOptionalFiles || [];

  return `
    <div class="import-preview-summary">
      <article><span>Chế độ</span><strong>${escapeHtml(getImportModeLabel(data.importMode || "strict"))}</strong></article>
      <article><span>Tổng sản phẩm</span><strong>${escapeHtml(data.totalProducts || 0)}</strong></article>
      <article><span>Sản phẩm mới</span><strong>${escapeHtml(data.createCount || 0)}</strong></article>
      <article><span>Cập nhật SKU</span><strong>${escapeHtml(data.updateBySkuCount || data.updateCount || 0)}</strong></article>
      <article><span>Cập nhật slug</span><strong>${escapeHtml(data.updateBySlugCount || 0)}</strong></article>
      <article><span>Ảnh</span><strong>${escapeHtml(data.imageCount || 0)}</strong></article>
      <article><span>Thông số</span><strong>${escapeHtml(data.specCount || 0)}</strong></article>
      <article><span>Highlights</span><strong>${escapeHtml(data.highlightCount || 0)}</strong></article>
      <article><span>Commitments</span><strong>${escapeHtml(data.commitmentCount || 0)}</strong></article>
      <article><span>Promotions</span><strong>${escapeHtml(data.promotionCount || 0)}</strong></article>
      <article><span>Product promos</span><strong>${escapeHtml(data.productPromotionCount || 0)}</strong></article>
      <article><span>Bundles</span><strong>${escapeHtml(data.bundleOfferCount || 0)}</strong></article>
      <article><span>Warranty packs</span><strong>${escapeHtml(data.warrantyPackageCount || 0)}</strong></article>
      <article><span>Product warranty</span><strong>${escapeHtml(data.productWarrantyPackageCount || 0)}</strong></article>
      <article class="${errors.length ? "has-errors" : ""}"><span>Lỗi</span><strong>${escapeHtml(errors.length)}</strong></article>
      <article class="${warnings.length ? "has-warnings" : ""}"><span>Cảnh báo</span><strong>${escapeHtml(warnings.length)}</strong></article>
    </div>
    ${renderImportConflictSummary(data.conflictSummary)}
    ${renderImportSampleProducts(data.sampleProducts || [])}
    ${renderImportIssueList("Lỗi cần sửa", errors, "error")}
    ${renderImportIssueList("Cảnh báo", warnings, "warning")}
    ${skippedFiles.length ? `
      <div class="import-preview-list">
        <h3>File bị bỏ qua</h3>
        <ul>
          ${skippedFiles.map(function (item) {
            return `<li><strong>${escapeHtml(item.file)}</strong>: ${escapeHtml(item.reason)}</li>`;
          }).join("")}
        </ul>
      </div>
    ` : ""}
  `;
}

function getImportModeLabel(mode) {
  if (mode === "updateBySlug") {
    return "Cập nhật theo slug";
  }

  if (mode === "replaceCatalog") {
    return "Reset catalog";
  }

  return "Strict";
}

function renderImportConflictSummary(conflictSummary) {
  if (!conflictSummary || !Array.isArray(conflictSummary.slugConflicts) || !conflictSummary.slugConflicts.length) {
    return "";
  }

  return `
    <div class="import-preview-list has-warnings">
      <h3>Slug conflict</h3>
      <ul>
        ${conflictSummary.slugConflicts.slice(0, 20).map(function (item) {
          return `<li><strong>${escapeHtml(item.slug)}</strong>: CSV SKU ${escapeHtml(item.csvSku)} / DB SKU ${escapeHtml(item.dbSku)}</li>`;
        }).join("")}
      </ul>
      ${conflictSummary.slugConflicts.length > 20 ? `<p>Và ${escapeHtml(conflictSummary.slugConflicts.length - 20)} conflict khác.</p>` : ""}
    </div>
  `;
}

function renderImportSampleProducts(products) {
  if (!products.length) {
    return "";
  }

  return `
    <div class="import-preview-list">
      <h3>Sản phẩm mẫu trong file</h3>
      <ul>
        ${products.map(function (product) {
          return `<li><strong>${escapeHtml(product.sku)}</strong> - ${escapeHtml(product.name)} (${escapeHtml(getProductTypeLabel(product.product_type))})</li>`;
        }).join("")}
      </ul>
    </div>
  `;
}

function renderImportIssueList(title, issues, type) {
  if (!issues.length) {
    return "";
  }

  return `
    <div class="import-preview-list ${type === "error" ? "has-errors" : "has-warnings"}">
      <h3>${escapeHtml(title)}</h3>
      <ul>
        ${issues.slice(0, 30).map(function (issue) {
          const prefix = [
            issue.file,
            issue.line ? `dòng ${issue.line}` : "",
            issue.field || ""
          ].filter(Boolean).join(" / ");

          return `<li>${prefix ? `<strong>${escapeHtml(prefix)}:</strong> ` : ""}${escapeHtml(issue.message)}</li>`;
        }).join("")}
      </ul>
      ${issues.length > 30 ? `<p>Và ${escapeHtml(issues.length - 30)} mục khác.</p>` : ""}
    </div>
  `;
}


