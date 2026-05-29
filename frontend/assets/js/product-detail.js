document.addEventListener("DOMContentLoaded", function () {
  initProductDetailPage();
});

async function initProductDetailPage() {
  await loadSiteLayout();
  await loadProductDetail();
}

async function loadProductDetail() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const detailContainer = document.getElementById("productDetail");
  const relatedContainer = document.getElementById("relatedProducts");

  if (!slug) {
    detailContainer.innerHTML = renderError("Thiếu slug sản phẩm.");
    relatedContainer.innerHTML = "";
    return;
  }

  try {
    const response = await apiGet(`/products/${encodeURIComponent(slug)}`);
    const product = response.data;

    document.title = `${product.name} - AeroTech`;
    renderBreadcrumb(product);
    detailContainer.className = "product-detail-layout";
    detailContainer.innerHTML = renderProductDetail(product);
    renderRelatedProducts(product.related_products || []);
    await loadProductReviews(slug);
  } catch (error) {
    detailContainer.innerHTML = renderError(error.message);
    relatedContainer.innerHTML = "";
    document.getElementById("productReviews").innerHTML = "";
  }
}

function renderBreadcrumb(product) {
  const breadcrumb = document.getElementById("breadcrumb");

  breadcrumb.innerHTML = `
    <a href="index.html">Trang chủ</a>
    <span>/</span>
    <a href="products.html">Sản phẩm</a>
    <span>/</span>
    <a href="products.html?category=${encodeURIComponent(product.category.slug)}">${escapeHtml(product.category.name)}</a>
    <span>/</span>
    <strong>${escapeHtml(product.name)}</strong>
  `;
}

function renderProductDetail(product) {
  const imageFallback = getProductImageFallback(product);
  const images = product.images && product.images.length ? product.images : [{
    image_url: imageFallback,
    alt_text: product.name
  }];
  const cartPayload = escapeAttribute(JSON.stringify(getCartProductPayload(product)));
  const isService = isServiceProduct(product);
  const quickSpecs = (product.short_specs || []).map(function (spec) {
    return `<li>${escapeHtml(spec)}</li>`;
  }).join("");
  const metaRows = isService ? `
        <div><dt>Thương hiệu</dt><dd>${escapeHtml(product.brand_name || "AeroTech")}</dd></div>
        <div><dt>SKU</dt><dd>${escapeHtml(product.sku)}</dd></div>
        <div><dt>Loại dịch vụ</dt><dd>${escapeHtml(getStockLabel(product))}</dd></div>
        <div><dt>Hình thức</dt><dd>Liên hệ tư vấn</dd></div>
      ` : `
        <div><dt>Thương hiệu</dt><dd>${escapeHtml(product.brand_name || "AeroTech")}</dd></div>
        <div><dt>SKU</dt><dd>${escapeHtml(product.sku)}</dd></div>
        <div><dt>Bảo hành</dt><dd>${escapeHtml(product.warranty_months)} tháng</dd></div>
        <div><dt>Tồn kho</dt><dd>${escapeHtml(getStockLabel(product))}</dd></div>
      `;
  const detailActions = isService ? `
        <a class="btn btn-primary" href="contact.html">Liên hệ tư vấn</a>
        <a class="btn btn-dark" href="stores.html">Đặt lịch tại showroom</a>
        <button
          class="btn btn-outline js-add-wishlist"
          type="button"
          data-product-id="${escapeAttribute(product.id)}"
        >Yêu thích</button>
        <a class="btn btn-light" href="products.html?productType=service">Dịch vụ khác</a>
      ` : `
        <button
          class="btn btn-primary js-add-cart"
          type="button"
          data-product="${cartPayload}"
          ${product.available_stock <= 0 ? "disabled" : ""}
        >Thêm vào giỏ</button>
        <button
          class="btn btn-dark js-buy-now"
          type="button"
          data-product="${cartPayload}"
          ${product.available_stock <= 0 ? "disabled" : ""}
        >Mua ngay</button>
        <button
          class="btn btn-outline js-add-wishlist"
          type="button"
          data-product-id="${escapeAttribute(product.id)}"
        >Yêu thích</button>
        <a class="btn btn-light" href="products.html">Tiếp tục mua</a>
      `;

  return `
    <section class="product-gallery">
      <div class="main-product-image">
        <img
          src="${escapeAttribute(getImageUrl(images[0].image_url, product))}"
          alt="${escapeAttribute(images[0].alt_text || product.name)}"
          onerror="this.onerror=null;this.src='${escapeAttribute(imageFallback)}'"
        >
      </div>
      <div class="thumbnail-row">
        ${images.map(function (image) {
          return `
            <img
              src="${escapeAttribute(getImageUrl(image.image_url, product))}"
              alt="${escapeAttribute(image.alt_text || product.name)}"
              onerror="this.onerror=null;this.src='${escapeAttribute(imageFallback)}'"
            >
          `;
        }).join("")}
      </div>
    </section>

    <section class="product-info-panel">
      <div class="product-title-block">
        <span class="type-badge">${escapeHtml(getProductTypeLabel(product.product_type))}</span>
        <h1>${escapeHtml(product.name)}</h1>
        <p>${escapeHtml(product.short_description || "")}</p>
      </div>

      <dl class="product-meta-list">
        ${metaRows}
      </dl>

      <div class="detail-price">${renderPrice(product)}</div>

      <div class="detail-actions">
        ${detailActions}
      </div>

      <div class="quick-spec-panel">
        <h2>Thông số nhanh</h2>
        <ul>${quickSpecs}</ul>
      </div>
    </section>

    <section class="description-panel">
      <h2>Mô tả sản phẩm</h2>
      <p>${escapeHtml(product.description || "Chưa có mô tả chi tiết.")}</p>
    </section>

    <section class="spec-table-panel">
      <h2>Thông số kỹ thuật</h2>
      ${renderSpecsTable(product.specs || [])}
    </section>
  `;
}

function renderSpecsTable(groups) {
  if (!groups.length) {
    return renderEmpty("Chưa có thông số kỹ thuật.");
  }

  return groups.map(function (group) {
    const rows = group.items.map(function (item) {
      return `
        <tr>
          <th>${escapeHtml(item.key)}</th>
          <td>${escapeHtml(item.value)}</td>
        </tr>
      `;
    }).join("");

    return `
      <div class="spec-group">
        <h3>${escapeHtml(group.group)}</h3>
        <table>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }).join("");
}

function renderRelatedProducts(products) {
  const container = document.getElementById("relatedProducts");

  if (!products.length) {
    container.innerHTML = renderEmpty("Chưa có sản phẩm liên quan.");
    return;
  }

  container.innerHTML = products.map(renderProductCard).join("");
}

async function loadProductReviews(slug) {
  const container = document.getElementById("productReviews");

  try {
    const response = await apiGet(`/products/${encodeURIComponent(slug)}/reviews`);
    const reviews = response.data || [];

    container.className = "review-panel";
    container.innerHTML = `
      ${renderReviewForm(slug)}
      ${reviews.length ? `
        <div class="review-list">
          ${reviews.map(renderReviewItem).join("")}
        </div>
      ` : renderEmpty("Chưa có đánh giá được duyệt cho sản phẩm này.")}
    `;
    bindReviewForm(slug);
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function renderReviewForm(slug) {
  if (!isLoggedIn()) {
    return `<div class="state-box">Đăng nhập để gửi đánh giá sản phẩm.</div>`;
  }

  return `
    <form id="reviewForm" class="stack-form review-form">
      <label>Điểm đánh giá
        <select id="reviewRating" required>
          <option value="5">5 sao</option>
          <option value="4">4 sao</option>
          <option value="3">3 sao</option>
          <option value="2">2 sao</option>
          <option value="1">1 sao</option>
        </select>
      </label>
      <label>Nội dung đánh giá
        <textarea id="reviewComment" placeholder="Chia sẻ trải nghiệm của bạn"></textarea>
      </label>
      <button class="btn btn-primary" type="submit">Gửi đánh giá</button>
      <div id="reviewMessage"></div>
    </form>
  `;
}

function renderReviewItem(review) {
  return `
    <article class="review-item">
      <div>
        <strong>${escapeHtml(review.reviewer_name || "Khách hàng")}</strong>
        <span>${"★".repeat(Number(review.rating))}${"☆".repeat(5 - Number(review.rating))}</span>
      </div>
      <p>${escapeHtml(review.comment || "")}</p>
      <small>${escapeHtml(formatDateTime(review.created_at))}</small>
    </article>
  `;
}

function bindReviewForm(slug) {
  const form = document.getElementById("reviewForm");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      const response = await authPost(`/products/${encodeURIComponent(slug)}/reviews`, {
        rating: Number(document.getElementById("reviewRating").value),
        comment: document.getElementById("reviewComment").value.trim()
      });
      document.getElementById("reviewMessage").innerHTML = `<div class="state-box state-success">${escapeHtml(response.message)}</div>`;
      document.getElementById("reviewComment").value = "";
    } catch (error) {
      document.getElementById("reviewMessage").innerHTML = renderError(error.message);
    }
  });
}


