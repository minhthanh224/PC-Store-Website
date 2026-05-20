document.addEventListener("DOMContentLoaded", initWishlistPage);

async function initWishlistPage() {
  if (!requireLogin("wishlist.html")) {
    return;
  }

  await loadSiteLayout();
  await loadWishlist();
}

async function loadWishlist() {
  const grid = document.getElementById("wishlistGrid");

  grid.className = "product-grid loading-box";
  grid.innerHTML = "Đang tải danh sách yêu thích...";

  try {
    const response = await authGet("/wishlist");
    const products = response.data || [];

    grid.className = "product-grid";

    if (!products.length) {
      grid.innerHTML = renderEmpty("Bạn chưa có sản phẩm yêu thích.");
      return;
    }

    grid.innerHTML = products.map(renderWishlistProductCard).join("");
    bindWishlistRemoveButtons();
  } catch (error) {
    grid.className = "product-grid";
    grid.innerHTML = renderError(error.message);
  }
}

function renderWishlistProductCard(product) {
  const detailsUrl = `product-detail.html?slug=${encodeURIComponent(product.slug)}`;
  const cartPayload = escapeAttribute(JSON.stringify(getCartProductPayload(product)));

  return `
    <article class="product-card">
      <a class="product-image-link" href="${detailsUrl}" aria-label="${escapeAttribute(product.name)}">
        <img
          src="${escapeAttribute(getImageUrl(product.primary_image))}"
          alt="${escapeAttribute(product.name)}"
          onerror="this.onerror=null;this.src='${PRODUCT_PLACEHOLDER_IMAGE}'"
        >
      </a>
      <div class="product-card-body">
        <div class="product-card-meta">
          <span>${escapeHtml(product.brand_name || product.category_name || "AeroTech")}</span>
          <span>${escapeHtml(getProductTypeLabel(product.product_type))}</span>
        </div>
        <h3><a href="${detailsUrl}">${escapeHtml(product.name)}</a></h3>
        ${renderPrice(product)}
        <div class="product-card-footer">
          <span class="stock-badge ${product.available_stock > 0 || product.product_type === "service" ? "in-stock" : "out-stock"}">
            ${escapeHtml(getStockLabel(product))}
          </span>
          <span class="warranty-badge">${escapeHtml(product.warranty_months)}T BH</span>
        </div>
        <div class="product-actions">
          <a class="btn btn-outline" href="${detailsUrl}">Chi tiết</a>
          <button class="btn btn-primary js-add-cart" type="button" data-product="${cartPayload}" ${product.available_stock <= 0 ? "disabled" : ""}>Thêm vào giỏ</button>
          <button class="btn btn-light js-remove-wishlist" type="button" data-product-id="${escapeAttribute(product.id)}">Bỏ yêu thích</button>
        </div>
      </div>
    </article>
  `;
}

function bindWishlistRemoveButtons() {
  document.querySelectorAll(".js-remove-wishlist").forEach(function (button) {
    button.addEventListener("click", async function () {
      try {
        await authDelete(`/wishlist/${encodeURIComponent(button.dataset.productId)}`);
        showToast("Đã bỏ sản phẩm khỏi danh sách yêu thích.");
        await loadWishlist();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  });
}


