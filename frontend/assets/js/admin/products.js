let adminProductPage = 1;

document.addEventListener("DOMContentLoaded", initAdminProducts);

async function initAdminProducts() {
  const user = await requireAdminRole(["admin"]);
  if (!user) return;

  renderAdminLayout("products", user);
  document.getElementById("productFilterForm").addEventListener("submit", function (event) {
    event.preventDefault();
    adminProductPage = 1;
    loadAdminProducts();
  });
  await loadAdminProducts();
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


