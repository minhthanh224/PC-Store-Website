document.addEventListener("DOMContentLoaded", function () {
  initProductDetailPage();
});

const QUICK_SPEC_RULES = [
  { label: "CPU", matchers: ["cpu", "processor", "bo_xu_ly"] },
  { label: "GPU", matchers: ["gpu", "vga", "card_do_hoa", "graphics"] },
  { label: "RAM", matchers: ["ram", "memory", "bo_nho"] },
  { label: "Lưu trữ", matchers: ["storage", "ssd", "hdd", "luu_tru", "o_cung"] },
  { label: "Màn hình", matchers: ["display", "screen", "man_hinh", "kich_thuoc_man_hinh", "display_size"] },
  { label: "Tần số quét", matchers: ["refresh_rate", "tan_so_quet", "hz"] },
  { label: "Tấm nền", matchers: ["panel", "tam_nen"] },
  { label: "Pin", matchers: ["battery", "pin"] },
  { label: "Trọng lượng", matchers: ["weight", "trong_luong"] },
  { label: "Bảo hành", matchers: ["warranty", "bao_hanh"] }
];

const POLICY_ITEMS = [
  {
    code: "CH",
    title: "Hàng chính hãng",
    description: "Sản phẩm có nguồn gốc rõ ràng, hóa đơn và thông tin bảo hành đầy đủ."
  },
  {
    code: "BH",
    title: "Bảo hành minh bạch",
    description: "Tra cứu bảo hành bằng serial và hỗ trợ tiếp nhận tại hệ thống AeroTech."
  },
  {
    code: "GH",
    title: "Giao hàng nhanh",
    description: "Đóng gói an toàn, hỗ trợ giao nội thành và chuyển phát toàn quốc."
  },
  {
    code: "VAT",
    title: "Hỗ trợ VAT",
    description: "Hỗ trợ xuất hóa đơn doanh nghiệp khi khách hàng có nhu cầu."
  },
  {
    code: "KT",
    title: "Hỗ trợ kỹ thuật",
    description: "Tư vấn cài đặt, nâng cấp và xử lý sự cố sau bán hàng."
  },
  {
    code: "DT",
    title: "Đổi trả theo chính sách",
    description: "Hỗ trợ đổi trả theo điều kiện kiểm tra và chính sách cửa hàng."
  }
];

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
    detailContainer.className = "product-detail-layout product-detail-layout-pro";
    detailContainer.innerHTML = renderProductDetail(product);
    bindProductGallery();
    bindWarrantyPackageSelection();
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
  const category = product.category || {};

  breadcrumb.innerHTML = `
    <a href="index.html">Trang chủ</a>
    <span>/</span>
    <a href="products.html">Sản phẩm</a>
    <span>/</span>
    <a href="products.html?category=${encodeURIComponent(category.slug || "")}">${escapeHtml(category.name || "Danh mục")}</a>
    <span>/</span>
    <strong>${escapeHtml(product.name)}</strong>
  `;
}

function renderProductDetail(product) {
  const images = getProductGalleryImages(product);
  const imageFallback = getProductImageFallback(product);
  const cartProduct = {
    ...product,
    primary_image: images[0] ? images[0].image_url : product.primary_image
  };
  const cartPayload = escapeAttribute(JSON.stringify(getCartProductPayload(cartProduct)));
  const comparePayload = escapeAttribute(JSON.stringify(getCompareProductPayload(cartProduct)));
  const isService = isServiceProduct(product);
  const quickSpecs = getQuickSpecs(product);
  const importedHighlights = normalizeImportedHighlights(product.highlights || []);
  const highlights = importedHighlights.length ? importedHighlights : deriveProductHighlights(product, quickSpecs);
  const commitments = normalizeImportedCommitments(product.commitments || []);
  const policyItems = (commitments.length ? commitments : POLICY_ITEMS).slice(0, 6);

  return `
    <section class="product-gallery product-gallery-pro">
      ${renderProductGallery(product, images, imageFallback)}
    </section>

    <section class="product-info-panel product-info-panel-pro">
      ${renderPurchaseSummary(product, cartPayload, comparePayload, isService)}
      ${renderQuickSpecs(quickSpecs)}
    </section>

    ${renderCommercialSections(product, isService)}
    ${renderProductHighlights(highlights)}

    <section class="description-panel product-description-panel">
      <div class="detail-section-heading">
        <span>Mô tả</span>
        <h2>Mô tả sản phẩm</h2>
      </div>
      <p>${escapeHtml(product.description || product.short_description || "AeroTech đang cập nhật mô tả chi tiết cho sản phẩm này.")}</p>
    </section>

    <section class="spec-table-panel product-specification-panel">
      <div class="detail-section-heading">
        <span>Cấu hình</span>
        <h2>Thông số kỹ thuật</h2>
      </div>
      ${renderSpecsTable(product.specs || [])}
    </section>

    <section class="product-policy-panel">
      <div class="detail-section-heading">
        <span>Cam kết</span>
        <h2>Cam kết từ AeroTech</h2>
      </div>
      <div class="product-policy-grid">
        ${policyItems.map(renderPolicyItem).join("")}
      </div>
    </section>
  `;
}

function renderProductGallery(product, images, imageFallback) {
  const firstImage = images[0] || {
    image_url: imageFallback,
    alt_text: product.name
  };

  return `
    <div class="main-product-image product-main-image-pro">
      <img
        id="productMainImage"
        src="${escapeAttribute(getImageUrl(firstImage.image_url, product))}"
        alt="${escapeAttribute(firstImage.alt_text || product.name)}"
        onerror="this.onerror=null;this.src='${escapeAttribute(imageFallback)}'"
      >
    </div>
    <div class="thumbnail-row product-thumbnail-row" aria-label="Ảnh sản phẩm">
      ${images.map(function (image, index) {
        const imageUrl = getImageUrl(image.image_url, product);
        const imageAlt = image.alt_text || product.name;

        return `
          <button
            class="gallery-thumbnail ${index === 0 ? "active" : ""}"
            type="button"
            data-image-src="${escapeAttribute(imageUrl)}"
            data-image-alt="${escapeAttribute(imageAlt)}"
            data-image-fallback="${escapeAttribute(imageFallback)}"
            aria-label="Xem ảnh ${index + 1} của ${escapeAttribute(product.name)}"
          >
            <img
              src="${escapeAttribute(imageUrl)}"
              alt="${escapeAttribute(imageAlt)}"
              onerror="this.onerror=null;this.src='${escapeAttribute(imageFallback)}'"
            >
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderPurchaseSummary(product, cartPayload, comparePayload, isService) {
  const isAvailable = Number(product.available_stock) > 0;

  return `
    <div class="product-title-block product-title-block-pro">
      <div class="product-kicker-row">
        <span class="type-badge">${escapeHtml(getProductTypeLabel(product.product_type))}</span>
        <span class="product-brand-chip">${escapeHtml(product.brand_name || "AeroTech")}</span>
      </div>
      <h1>${escapeHtml(product.name)}</h1>
      <p>${escapeHtml(product.short_description || "Sản phẩm công nghệ được AeroTech tuyển chọn cho nhu cầu làm việc, học tập và giải trí.")}</p>
      <a id="productReviewSummaryMini" class="detail-review-summary" href="#productReviewsSection">
        <span class="review-stars" aria-hidden="true">★★★★★</span>
        <span>Đang tải đánh giá...</span>
      </a>
    </div>

    <div class="detail-price-box">
      ${renderDetailPrice(product, isService)}
      <span class="purchase-status ${isService ? "service" : (isAvailable ? "in-stock" : "out-stock")}">
        ${escapeHtml(isService ? "Dịch vụ tư vấn" : getStockLabel(product))}
      </span>
    </div>

    <dl class="product-meta-list product-meta-list-pro">
      ${renderPurchaseMeta(product, isService)}
    </dl>

    <div class="detail-actions detail-actions-pro">
      ${renderDetailActions(product, cartPayload, comparePayload, isService, isAvailable)}
    </div>

    ${isService ? `
      <div class="service-consult-box">
        <strong>Dịch vụ cần tư vấn trước khi đặt lịch</strong>
        <p>AeroTech sẽ xác nhận nhu cầu, cấu hình hoặc tình trạng thiết bị trước khi tiếp nhận dịch vụ.</p>
      </div>
    ` : ""}
  `;
}

function renderDetailPrice(product, isService) {
  const basePrice = Number(product.base_price || 0);
  const salePrice = Number(product.sale_price || 0);
  const hasSale = salePrice > 0 && basePrice > 0 && salePrice < basePrice;
  const currentPrice = hasSale ? salePrice : basePrice;

  if (isService && currentPrice <= 0) {
    return `
      <div class="detail-price-label">Chi phí dịch vụ</div>
      <div class="detail-price-current">Liên hệ tư vấn</div>
    `;
  }

  return `
    <div class="detail-price-label">${isService ? "Chi phí dịch vụ" : "Giá bán"}</div>
    <div class="detail-price-main">
      <strong class="detail-price-current">${formatCurrency(currentPrice || null)}</strong>
      ${hasSale ? `<span class="detail-price-original">${formatCurrency(basePrice)}</span>` : ""}
      ${hasSale ? `<span class="detail-sale-badge">-${getDiscountPercent(basePrice, salePrice)}%</span>` : ""}
    </div>
  `;
}

function renderPurchaseMeta(product, isService) {
  const rows = [
    { label: "SKU", value: product.sku },
    { label: "Danh mục", value: product.category_name || (product.category && product.category.name) || "Đang cập nhật" },
    { label: "Thương hiệu", value: product.brand_name || "AeroTech" },
    {
      label: isService ? "Hình thức" : "Bảo hành",
      value: isService
        ? "Liên hệ tư vấn"
        : (Number(product.warranty_months) > 0 ? `${product.warranty_months} tháng` : "Theo chính sách")
    }
  ];

  return rows.map(function (row) {
    return `
      <div>
        <dt>${escapeHtml(row.label)}</dt>
        <dd>${escapeHtml(row.value)}</dd>
      </div>
    `;
  }).join("");
}

function renderDetailActions(product, cartPayload, comparePayload, isService, isAvailable) {
  if (isService) {
    return `
      <a class="btn btn-primary" href="contact.html">Liên hệ tư vấn</a>
      <a class="btn btn-dark" href="stores.html">Đặt lịch tại showroom</a>
      <button
        class="btn btn-outline js-add-wishlist"
        type="button"
        data-product-id="${escapeAttribute(product.id)}"
      >Yêu thích</button>
      <a class="btn btn-light" href="products.html?productType=service">Dịch vụ khác</a>
    `;
  }

  return `
    <button
      class="btn btn-primary js-add-cart"
      type="button"
      data-product="${cartPayload}"
      ${isAvailable ? "" : "disabled"}
    >Thêm vào giỏ</button>
    <button
      class="btn btn-dark js-buy-now"
      type="button"
      data-product="${cartPayload}"
      ${isAvailable ? "" : "disabled"}
    >Mua ngay</button>
    <button
      class="btn btn-outline js-add-wishlist"
      type="button"
      data-product-id="${escapeAttribute(product.id)}"
    >Yêu thích</button>
    <button
      class="btn btn-compare js-compare-toggle"
      type="button"
      data-compare-product="${comparePayload}"
      data-default-label="So sánh cấu hình"
      data-selected-label="Đã chọn so sánh"
      aria-pressed="false"
    >So sánh cấu hình</button>
    <a class="btn btn-light" href="products.html">Tiếp tục mua</a>
  `;
}

function renderQuickSpecs(quickSpecs) {
  if (!quickSpecs.length) {
    return "";
  }

  return `
    <div class="quick-spec-panel quick-spec-panel-pro">
      <div class="mini-section-heading">
        <span>Cấu hình nổi bật</span>
        <strong>Thông tin cần xem nhanh</strong>
      </div>
      <div class="quick-spec-grid">
        ${quickSpecs.map(function (spec) {
          return `
            <article class="quick-spec-card">
              <span>${escapeHtml(spec.label)}</span>
              <strong>${escapeHtml(spec.value)}</strong>
            </article>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function renderProductHighlights(highlights) {
  const visibleHighlights = highlights.slice(0, 6);

  if (!visibleHighlights.length) {
    return "";
  }

  return `
    <section class="product-highlights-panel">
      <div class="detail-section-heading">
        <span>Nổi bật</span>
        <h2>Điểm nổi bật sản phẩm</h2>
      </div>
      <div class="product-highlight-grid">
        ${visibleHighlights.map(function (item) {
          return `
            <article class="product-highlight-card">
              <span>${escapeHtml(getCompactIconText(item.code, "AT"))}</span>
              <div>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.description)}</p>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderCommercialSections(product, isService) {
  const promotions = normalizePromotions(product.promotions || []);
  const warrantyPackages = isService ? [] : normalizeWarrantyPackages(product.warranty_packages || []);
  const bundleOffers = normalizeBundleOffers(product.bundle_offers || []);
  const blocks = [
    renderProductPromotions(promotions),
    renderWarrantyPackages(warrantyPackages),
    renderBundleOffers(bundleOffers)
  ].filter(Boolean);

  if (!blocks.length) {
    return "";
  }

  return `
    <section class="product-commerce-panel">
      <div class="detail-section-heading">
        <span>Ưu đãi & dịch vụ</span>
        <h2>Thông tin mua hàng mở rộng</h2>
      </div>
      <div class="product-commerce-grid">
        ${blocks.join("")}
      </div>
    </section>
  `;
}

function renderProductPromotions(promotions) {
  if (!promotions.length) {
    return "";
  }

  const visiblePromotions = promotions.slice(0, 4);

  return `
    <article class="commerce-block commerce-promotions-block">
      <div class="commerce-block-heading">
        <span>Khuyến mãi</span>
        <h3>Ưu đãi đi kèm</h3>
      </div>
      <div class="promotion-list">
        ${visiblePromotions.map(function (promotion) {
          return `
            <article class="promotion-card">
              <div class="promotion-card-head">
                <span class="promotion-type-badge">${escapeHtml(getPromotionTypeLabel(promotion.promo_type))}</span>
                ${promotion.promo_code ? `<code>${escapeHtml(promotion.promo_code)}</code>` : ""}
              </div>
              <div>
                <h3>${escapeHtml(promotion.title)}</h3>
                <p>${escapeHtml(promotion.description || getPromotionSummary(promotion))}</p>
                <div class="commerce-meta-row">
                  <span>${escapeHtml(getPromotionDiscountText(promotion))}</span>
                  ${getPromotionDateRange(promotion) ? `<span>${escapeHtml(getPromotionDateRange(promotion))}</span>` : ""}
                </div>
              </div>
            </article>
          `;
        }).join("")}
      </div>
      <p class="commerce-note">Ưu đãi áp dụng theo điều kiện từng chương trình.</p>
      ${promotions.length > visiblePromotions.length ? `<p class="commerce-note">Hiển thị ${visiblePromotions.length} ưu đãi nổi bật nhất.</p>` : ""}
    </article>
  `;
}

function renderBundleOffers(bundleOffers) {
  if (!bundleOffers.length) {
    return "";
  }

  const visibleOffers = bundleOffers.slice(0, 4);

  return `
    <article class="commerce-block commerce-bundle-block">
      <div class="commerce-block-heading">
        <span>Combo</span>
        <h3>Mua kèm ưu đãi</h3>
      </div>
      <div class="product-bundle-list">
        ${visibleOffers.map(function (offer) {
          const addon = offer.addon_product || {};
          const addonFallback = getProductImageFallback(addon);
          return `
            <article class="product-bundle-card">
              <a class="bundle-product-image" href="${addon.slug ? `product-detail.html?slug=${encodeURIComponent(addon.slug)}` : "#"}" aria-label="${escapeAttribute(addon.name || "Sản phẩm mua kèm")}">
                <img
                  src="${escapeAttribute(getImageUrl(addon.primary_image, addon))}"
                  alt="${escapeAttribute(addon.name || "Sản phẩm mua kèm")}"
                  onerror="this.onerror=null;this.src='${escapeAttribute(addonFallback)}'"
                >
              </a>
              <div class="bundle-product-body">
                <div class="bundle-product-meta">
                  ${addon.sku ? `<span>${escapeHtml(addon.sku)}</span>` : ""}
                  ${addon.category_name ? `<span>${escapeHtml(addon.category_name)}</span>` : ""}
                </div>
                <h4>${escapeHtml(addon.name || "Sản phẩm mua kèm")}</h4>
                <p>${escapeHtml(offer.title || "Ưu đãi mua kèm")}</p>
                <div class="bundle-price-row">
                  ${addon.base_price ? `<strong>${formatCurrency(addon.sale_price || addon.base_price)}</strong>` : ""}
                  <span>${escapeHtml(getBundlePriceText(offer))}</span>
                </div>
              </div>
              ${addon.slug ? `<a class="btn btn-outline" href="product-detail.html?slug=${encodeURIComponent(addon.slug)}">Xem sản phẩm</a>` : ""}
            </article>
          `;
        }).join("")}
      </div>
      ${bundleOffers.length > visibleOffers.length ? `<p class="commerce-note">Hiển thị ${visibleOffers.length} gợi ý mua kèm phù hợp nhất.</p>` : ""}
    </article>
  `;
}

function renderWarrantyPackages(packages) {
  if (!packages.length) {
    return "";
  }

  const visiblePackages = packages.slice(0, 4);

  return `
    <article class="commerce-block commerce-warranty-block">
      <div class="commerce-block-heading">
        <span>Bảo hành</span>
        <h3>Gói bảo hành mở rộng</h3>
      </div>
      <div class="warranty-package-grid">
        <button
          class="warranty-package-card warranty-package-option active"
          type="button"
          data-package-id=""
          data-package-title=""
          data-package-duration=""
          data-package-price="0"
          aria-pressed="true"
        >
          <div class="warranty-package-head">
            <span>Mặc định</span>
          </div>
          <h4>Không chọn gói mở rộng</h4>
          <p>Sử dụng thời hạn bảo hành tiêu chuẩn theo sản phẩm.</p>
          <strong>+0đ</strong>
        </button>
        ${visiblePackages.map(function (item) {
          return `
            <button
              class="warranty-package-card warranty-package-option"
              type="button"
              data-package-id="${escapeAttribute(item.id)}"
              data-package-title="${escapeAttribute(item.title)}"
              data-package-duration="${escapeAttribute(item.duration_months || 0)}"
              data-package-price="${escapeAttribute(item.price || 0)}"
              aria-pressed="false"
            >
              <div class="warranty-package-head">
                <span>+${escapeHtml(item.duration_months || 0)} tháng</span>
                ${item.package_code ? `<code>${escapeHtml(item.package_code)}</code>` : ""}
              </div>
              <h4>${escapeHtml(item.title)}</h4>
              <p>${escapeHtml(item.description || `${item.duration_months || 0} tháng bảo hành mở rộng.`)}</p>
              <strong>${formatCurrency(item.price || 0)}</strong>
            </button>
          `;
        }).join("")}
      </div>
      <div id="warrantyPackagePriceSummary" class="warranty-price-summary"></div>
      <p class="commerce-note">Mỗi sản phẩm có thể chọn tối đa một gói bảo hành mở rộng.</p>
      ${packages.length > visiblePackages.length ? `<p class="commerce-note">Hiển thị ${visiblePackages.length} gói phù hợp nhất.</p>` : ""}
    </article>
  `;
}

function bindWarrantyPackageSelection() {
  const selector = document.querySelector(".commerce-warranty-block");
  const optionButtons = document.querySelectorAll(".warranty-package-option");
  const actionButtons = document.querySelectorAll(".js-add-cart, .js-buy-now");

  if (!selector || !optionButtons.length || !actionButtons.length) {
    return;
  }

  let basePayload = null;

  try {
    basePayload = JSON.parse(actionButtons[0].dataset.product || "{}");
  } catch (error) {
    basePayload = null;
  }

  if (!basePayload) {
    return;
  }

  function getSelectedPackage(button) {
    const packageId = Number(button.dataset.packageId || 0);

    if (!packageId) {
      return null;
    }

    return {
      id: packageId,
      title: button.dataset.packageTitle || "",
      duration_months: Number(button.dataset.packageDuration || 0),
      price: Number(button.dataset.packagePrice || 0)
    };
  }

  function applyPackage(selectedPackage) {
    const payload = {
      ...basePayload,
      warranty_package_id: selectedPackage ? selectedPackage.id : null,
      warranty_package_title: selectedPackage ? selectedPackage.title : "",
      warranty_package_duration_months: selectedPackage ? selectedPackage.duration_months : null,
      warranty_package_price: selectedPackage ? selectedPackage.price : 0,
      warranty_package: selectedPackage
    };

    actionButtons.forEach(function (button) {
      button.dataset.product = JSON.stringify(payload);
    });

    renderWarrantyPriceSummary(basePayload, selectedPackage);
  }

  optionButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      optionButtons.forEach(function (item) {
        item.classList.remove("active");
        item.setAttribute("aria-pressed", "false");
      });

      button.classList.add("active");
      button.setAttribute("aria-pressed", "true");
      applyPackage(getSelectedPackage(button));
    });
  });

  applyPackage(null);
}

function renderWarrantyPriceSummary(productPayload, selectedPackage) {
  const summary = document.getElementById("warrantyPackagePriceSummary");

  if (!summary) {
    return;
  }

  const productPrice = Number(productPayload.price || 0);
  const packagePrice = selectedPackage ? Number(selectedPackage.price || 0) : 0;

  summary.innerHTML = `
    <div><span>Giá sản phẩm</span><strong>${formatCurrency(productPrice)}</strong></div>
    <div><span>Gói bảo hành</span><strong>${packagePrice ? formatCurrency(packagePrice) : "Không chọn"}</strong></div>
    <div class="total-line"><span>Tạm tính khi thêm vào giỏ</span><strong>${formatCurrency(productPrice + packagePrice)}</strong></div>
  `;
}

function renderPolicyItem(item) {
  return `
    <article class="product-policy-card">
      <span>${escapeHtml(item.code)}</span>
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </div>
    </article>
  `;
}

function normalizeImportedHighlights(highlights) {
  return highlights.slice().sort(sortBySortOrder).map(function (item) {
    return {
      code: item.icon || "★",
      title: item.title,
      description: item.description || "",
      sort_order: Number(item.sort_order || 0)
    };
  }).filter(function (item) {
    return item.title;
  });
}

function normalizeImportedCommitments(commitments) {
  const seen = new Set();

  return commitments.slice().sort(function (a, b) {
    const scopeDiff = getCommitmentScopePriority(a.scope_type) - getCommitmentScopePriority(b.scope_type);

    if (scopeDiff !== 0) {
      return scopeDiff;
    }

    return sortBySortOrder(a, b);
  }).map(function (item) {
    return {
      code: item.icon || "✓",
      title: item.title,
      description: item.description || "",
      scope_type: item.scope_type || "global",
      sort_order: Number(item.sort_order || 0)
    };
  }).filter(function (item) {
    if (!item.title) {
      return false;
    }

    const key = `${normalizeSpecKey(item.title)}|${normalizeSpecKey(item.description)}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizePromotions(promotions) {
  return promotions.slice().sort(sortBySortOrder).filter(function (promotion) {
    return promotion && promotion.title;
  });
}

function normalizeBundleOffers(bundleOffers) {
  return bundleOffers.slice().sort(sortBySortOrder).filter(function (offer) {
    return offer && offer.addon_product && offer.addon_product.slug;
  });
}

function normalizeWarrantyPackages(packages) {
  return packages.slice().sort(sortBySortOrder).filter(function (item) {
    return item && item.title;
  });
}

function sortBySortOrder(a, b) {
  const orderDiff = Number(a.sort_order || 0) - Number(b.sort_order || 0);

  if (orderDiff !== 0) {
    return orderDiff;
  }

  return Number(a.id || 0) - Number(b.id || 0);
}

function getCommitmentScopePriority(scopeType) {
  const priorities = {
    product: 1,
    category: 2,
    global: 3
  };

  return priorities[scopeType] || 4;
}

function getCompactIconText(value, fallback) {
  const raw = String(value || fallback || "AT").trim();
  const iconMap = {
    cpu: "CPU",
    gpu: "GPU",
    ram: "RAM",
    storage: "SSD",
    ssd: "SSD",
    display: "4K",
    screen: "4K",
    warranty: "BH",
    shield: "BH",
    gift: "ƯĐ",
    service: "DV",
    official: "CH",
    support: "KT",
    delivery: "GH"
  };
  const normalized = normalizeSpecKey(raw);

  if (iconMap[normalized]) {
    return iconMap[normalized];
  }

  if (raw.length <= 4) {
    return raw.toUpperCase();
  }

  return raw.split(/\s+/).map(function (part) {
    return part.charAt(0);
  }).join("").slice(0, 4).toUpperCase() || fallback || "AT";
}

function getPromotionSummary(promotion) {
  if (promotion.discount_type === "percent" && promotion.discount_value) {
    return `Giảm ${promotion.discount_value}% theo chương trình.`;
  }

  if (promotion.discount_type === "fixed" && promotion.discount_value) {
    return `Giảm ${formatCurrency(promotion.discount_value)} theo chương trình.`;
  }

  if (promotion.discount_type === "gift") {
    return "Tặng kèm quà/ưu đãi theo chương trình.";
  }

  return "Ưu đãi áp dụng theo chính sách AeroTech.";
}

function getPromotionTypeLabel(type) {
  const labels = {
    voucher: "Voucher",
    gift: "Quà tặng",
    installment: "Trả góp",
    event: "Sự kiện",
    bundle: "Combo"
  };

  return labels[type] || "Ưu đãi";
}

function getPromotionDiscountText(promotion) {
  if (promotion.discount_type === "percent" && promotion.discount_value) {
    return `Giảm ${promotion.discount_value}%`;
  }

  if (promotion.discount_type === "fixed" && promotion.discount_value) {
    return `Giảm ${formatCurrency(promotion.discount_value)}`;
  }

  if (promotion.discount_type === "gift") {
    return "Quà tặng kèm";
  }

  return "Theo điều kiện chương trình";
}

function getPromotionDateRange(promotion) {
  const start = formatDateOnly(promotion.start_date);
  const end = formatDateOnly(promotion.end_date);

  if (start && end) {
    return `${start} - ${end}`;
  }

  if (end) {
    return `Đến ${end}`;
  }

  if (start) {
    return `Từ ${start}`;
  }

  return "";
}

function formatDateOnly(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function getBundlePriceText(offer) {
  if (offer.bundle_price !== null && offer.bundle_price !== undefined) {
    return `Giá combo: ${formatCurrency(offer.bundle_price)}`;
  }

  if (offer.discount_type === "percent" && offer.discount_value) {
    return `Giảm ${offer.discount_value}% khi mua kèm`;
  }

  if (offer.discount_type === "fixed" && offer.discount_value) {
    return `Giảm ${formatCurrency(offer.discount_value)} khi mua kèm`;
  }

  return "Ưu đãi mua kèm";
}

function renderSpecsTable(groups) {
  const normalizedGroups = normalizeSpecGroups(groups);

  if (!normalizedGroups.length) {
    return renderEmpty("Chưa có thông số kỹ thuật.");
  }

  return `
    <div class="spec-group-list">
      ${normalizedGroups.map(function (group) {
        const rows = group.items.map(function (item) {
          return `
            <tr>
              <th>${escapeHtml(item.label)}</th>
              <td>${escapeHtml(item.value)}</td>
            </tr>
          `;
        }).join("");

        return `
          <section class="spec-group spec-group-pro">
            <h3>${escapeHtml(formatSpecGroupName(group.group))}</h3>
            <table>
              <tbody>${rows}</tbody>
            </table>
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function renderRelatedProducts(products) {
  const container = document.getElementById("relatedProducts");

  if (!products.length) {
    container.innerHTML = renderEmpty("Chưa có sản phẩm tương tự.");
    return;
  }

  container.innerHTML = products.map(renderProductCard).join("");
}

async function loadProductReviews(slug) {
  const container = document.getElementById("productReviews");

  try {
    const response = await apiGet(`/products/${encodeURIComponent(slug)}/reviews`);
    const reviews = response.data || [];

    updateProductReviewSummary(reviews);
    container.className = "review-panel review-panel-pro";
    container.innerHTML = `
      ${renderReviewOverview(reviews)}
      ${renderReviewForm(slug)}
      ${reviews.length ? `
        <div class="review-list review-list-pro">
          ${reviews.map(renderReviewItem).join("")}
        </div>
      ` : renderEmpty("Chưa có đánh giá được duyệt cho sản phẩm này.")}
    `;
    bindReviewForm(slug);
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function renderReviewOverview(reviews) {
  const summary = getReviewSummary(reviews);

  return `
    <div class="review-overview">
      <div class="review-score-box">
        <strong>${summary.count ? summary.average.toFixed(1) : "0.0"}</strong>
        <span class="review-stars" aria-label="${summary.count ? `${summary.average.toFixed(1)} trên 5 sao` : "Chưa có đánh giá"}">
          ${renderReviewStars(Math.round(summary.average || 0))}
        </span>
        <small>${summary.count} đánh giá đã duyệt</small>
      </div>
      <div>
        <h3>Đánh giá từ khách hàng đã mua</h3>
        <p>Đánh giá mới sẽ được kiểm duyệt trước khi hiển thị trên trang sản phẩm.</p>
      </div>
    </div>
  `;
}

function renderReviewForm(slug) {
  const redirectTarget = `product-detail.html?slug=${encodeURIComponent(slug)}`;

  if (!isLoggedIn()) {
    return `
      <div class="review-form-card review-login-box">
        <div>
          <strong>Đăng nhập để đánh giá sản phẩm</strong>
          <p>Chỉ khách hàng đã mua và hoàn thành đơn hàng mới có thể gửi đánh giá.</p>
        </div>
        <a class="btn btn-outline" href="login.html?redirect=${encodeURIComponent(redirectTarget)}">Đăng nhập</a>
      </div>
    `;
  }

  const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (currentUser && currentUser.role && currentUser.role !== "customer") {
    return `
      <div class="review-form-card">
        <strong>Đánh giá dành cho khách hàng</strong>
        <p>Tài khoản nhân viên không gửi đánh giá sản phẩm trên storefront.</p>
      </div>
    `;
  }

  return `
    <form id="reviewForm" class="stack-form review-form review-form-card">
      <div class="form-grid compact-form-grid">
        <label>Điểm đánh giá
          <select id="reviewRating" required>
            <option value="5">5 sao</option>
            <option value="4">4 sao</option>
            <option value="3">3 sao</option>
            <option value="2">2 sao</option>
            <option value="1">1 sao</option>
          </select>
        </label>
      </div>
      <label>Nội dung đánh giá
        <textarea id="reviewComment" placeholder="Chia sẻ trải nghiệm thực tế sau khi sử dụng sản phẩm"></textarea>
      </label>
      <div class="review-form-actions">
        <button class="btn btn-primary" type="submit">Gửi đánh giá</button>
        <small>Đánh giá sẽ hiển thị sau khi được admin duyệt.</small>
      </div>
      <div id="reviewMessage"></div>
    </form>
  `;
}

function renderReviewItem(review) {
  const rating = Number(review.rating || 0);

  return `
    <article class="review-item review-item-pro">
      <div class="review-item-head">
        <div>
          <strong>${escapeHtml(review.reviewer_name || "Khách hàng AeroTech")}</strong>
          <span class="review-stars" aria-label="${rating} trên 5 sao">${renderReviewStars(rating)}</span>
        </div>
        <small>${escapeHtml(formatDateTime(review.created_at))}</small>
      </div>
      <p>${escapeHtml(review.comment || "Khách hàng chưa để lại nội dung chi tiết.")}</p>
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
      await authPost(`/products/${encodeURIComponent(slug)}/reviews`, {
        rating: Number(document.getElementById("reviewRating").value),
        comment: document.getElementById("reviewComment").value.trim()
      });
      document.getElementById("reviewMessage").innerHTML = `
        <div class="state-box state-success">Đánh giá của bạn đã được gửi và đang chờ duyệt.</div>
      `;
      document.getElementById("reviewComment").value = "";
    } catch (error) {
      document.getElementById("reviewMessage").innerHTML = renderError(error.message);
    }
  });
}

function bindProductGallery() {
  const mainImage = document.getElementById("productMainImage");
  const thumbnails = document.querySelectorAll(".gallery-thumbnail");

  if (!mainImage || !thumbnails.length) {
    return;
  }

  thumbnails.forEach(function (thumbnail) {
    thumbnail.addEventListener("click", function () {
      thumbnails.forEach(function (item) {
        item.classList.remove("active");
      });

      thumbnail.classList.add("active");
      mainImage.onerror = function () {
        this.onerror = null;
        this.src = thumbnail.dataset.imageFallback || this.src;
      };
      mainImage.src = thumbnail.dataset.imageSrc || mainImage.src;
      mainImage.alt = thumbnail.dataset.imageAlt || mainImage.alt;
    });
  });
}

function updateProductReviewSummary(reviews) {
  const element = document.getElementById("productReviewSummaryMini");

  if (!element) {
    return;
  }

  const summary = getReviewSummary(reviews);
  if (!summary.count) {
    element.innerHTML = `
      <span class="review-stars" aria-hidden="true">★★★★★</span>
      <span>Chưa có đánh giá được duyệt</span>
    `;
    return;
  }

  element.innerHTML = `
    <span class="review-stars" aria-hidden="true">${renderReviewStars(Math.round(summary.average))}</span>
    <span>${summary.average.toFixed(1)}/5 từ ${summary.count} đánh giá</span>
  `;
}

function getReviewSummary(reviews) {
  const count = reviews.length;
  const total = reviews.reduce(function (sum, review) {
    return sum + Number(review.rating || 0);
  }, 0);

  return {
    count,
    average: count ? total / count : 0
  };
}

function renderReviewStars(rating) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  return `${"★".repeat(safeRating)}${"☆".repeat(5 - safeRating)}`;
}

function getProductGalleryImages(product) {
  const images = (product.images || [])
    .filter(function (image) {
      return image && image.image_url;
    })
    .map(function (image) {
      return {
        image_url: image.image_url,
        alt_text: image.alt_text || product.name,
        is_primary: Boolean(image.is_primary),
        sort_order: Number(image.sort_order || 0)
      };
    });

  if (!images.length && product.primary_image) {
    images.push({
      image_url: product.primary_image,
      alt_text: product.name,
      is_primary: true,
      sort_order: 0
    });
  }

  if (!images.length) {
    images.push({
      image_url: getProductImageFallback(product),
      alt_text: product.name,
      is_primary: true,
      sort_order: 0
    });
  }

  return images;
}

function getQuickSpecs(product) {
  const specs = flattenProductSpecs(product);
  const usedIndexes = new Set();
  const result = [];

  QUICK_SPEC_RULES.forEach(function (rule) {
    const spec = specs.find(function (item) {
      return !usedIndexes.has(item.index) && matchesSpecRule(item, rule);
    });

    if (spec) {
      usedIndexes.add(spec.index);
      result.push({
        label: rule.label,
        value: spec.value
      });
    }
  });

  specs.forEach(function (spec) {
    if (result.length >= 6 || usedIndexes.has(spec.index)) {
      return;
    }

    usedIndexes.add(spec.index);
    result.push({
      label: spec.label,
      value: spec.value
    });
  });

  return result.slice(0, 6);
}

function deriveProductHighlights(product, quickSpecs) {
  const highlights = [];
  const byLabel = quickSpecs.reduce(function (map, spec) {
    map[normalizeSpecKey(spec.label)] = spec.value;
    return map;
  }, {});

  if (byLabel.cpu) {
    highlights.push({
      code: "CPU",
      title: "Hiệu năng xử lý",
      description: byLabel.cpu
    });
  }

  if (byLabel.gpu) {
    highlights.push({
      code: "GPU",
      title: "Đồ họa nổi bật",
      description: byLabel.gpu
    });
  }

  if (byLabel.ram || byLabel.luu_tru) {
    highlights.push({
      code: "MEM",
      title: "Bộ nhớ và lưu trữ",
      description: [byLabel.ram, byLabel.luu_tru].filter(Boolean).join(" | ")
    });
  }

  if (byLabel.man_hinh || byLabel.tan_so_quet) {
    highlights.push({
      code: "DSP",
      title: "Hiển thị",
      description: [byLabel.man_hinh, byLabel.tan_so_quet].filter(Boolean).join(" | ")
    });
  }

  if (!highlights.length && product.short_description) {
    highlights.push({
      code: "AT",
      title: "Phù hợp nhu cầu sử dụng",
      description: product.short_description
    });
  }

  if (Number(product.warranty_months) > 0) {
    highlights.push({
      code: "BH",
      title: "Bảo hành rõ ràng",
      description: `${product.warranty_months} tháng theo chính sách bảo hành của AeroTech.`
    });
  }

  return highlights.slice(0, 4);
}

function flattenProductSpecs(product) {
  const result = [];

  (product.specs || []).forEach(function (group, groupIndex) {
    (group.items || []).forEach(function (item, itemIndex) {
      const rawKey = item.key || item.spec_key || item.spec_label || "";
      const label = item.label || item.spec_label || formatSpecLabel(rawKey);
      const value = formatSpecValue(item);

      if (!value) {
        return;
      }

      result.push({
        index: `${groupIndex}-${itemIndex}`,
        group: group.group || item.spec_group || "Thông số",
        key: rawKey,
        label,
        value,
        normalizedKey: normalizeSpecKey(rawKey),
        normalizedLabel: normalizeSpecKey(label)
      });
    });
  });

  return result;
}

function normalizeSpecGroups(groups) {
  return (groups || []).map(function (group) {
    const items = (group.items || []).map(function (item) {
      return {
        label: item.label || item.spec_label || formatSpecLabel(item.key || item.spec_key || ""),
        value: formatSpecValue(item)
      };
    }).filter(function (item) {
      return item.value;
    });

    return {
      group: group.group || "Thông số",
      items
    };
  }).filter(function (group) {
    return group.items.length;
  });
}

function matchesSpecRule(spec, rule) {
  return rule.matchers.some(function (matcher) {
    const normalizedMatcher = normalizeSpecKey(matcher);
    return spec.normalizedKey.includes(normalizedMatcher) || spec.normalizedLabel.includes(normalizedMatcher);
  });
}

function formatSpecLabel(key) {
  const normalized = normalizeSpecKey(key);
  const labels = {
    cpu: "CPU",
    gpu: "GPU",
    vga: "GPU",
    ram: "RAM",
    storage: "Lưu trữ",
    ssd: "SSD",
    hdd: "HDD",
    display: "Màn hình",
    screen: "Màn hình",
    display_size: "Kích thước màn hình",
    display_resolution: "Độ phân giải",
    refresh_rate: "Tần số quét",
    panel: "Tấm nền",
    battery: "Pin",
    weight: "Trọng lượng",
    warranty: "Bảo hành"
  };

  if (labels[normalized]) {
    return labels[normalized];
  }

  return String(key || "Thông số")
    .replace(/_/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function formatSpecGroupName(groupName) {
  const normalized = normalizeSpecKey(groupName);
  const labels = {
    cpu_gpu: "Bộ xử lý & Đồ họa",
    processor_graphics: "Bộ xử lý & Đồ họa",
    memory_storage: "Bộ nhớ RAM - Ổ cứng",
    display: "Màn hình",
    screen: "Màn hình",
    connectivity: "Cổng kết nối",
    ports: "Cổng kết nối",
    battery_power: "Pin & sạc",
    warranty: "Bảo hành"
  };

  return labels[normalized] || groupName || "Thông số";
}

function formatSpecValue(item) {
  const value = item.value || item.spec_value || "";
  const unit = item.unit || "";

  return [value, unit].filter(Boolean).join(" ").trim();
}

function normalizeSpecKey(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getDiscountPercent(basePrice, salePrice) {
  if (!basePrice || !salePrice || salePrice >= basePrice) {
    return 0;
  }

  return Math.round(((basePrice - salePrice) / basePrice) * 100);
}
