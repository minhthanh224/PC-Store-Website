document.addEventListener("DOMContentLoaded", function () {
  initCartPage();
});

async function initCartPage() {
  await loadSiteLayout();
  renderCartPage();
}

function renderCartPage() {
  const itemsContainer = document.getElementById("cartItems");
  const summaryContainer = document.getElementById("cartSummary");
  const items = getCartItems();

  if (!items.length) {
    itemsContainer.className = "cart-items cart-empty-shell";
    itemsContainer.innerHTML = `
      <section class="empty-state-card cart-empty-state">
        <img src="${escapeAttribute(EMPTY_CART_IMAGE)}" alt="" aria-hidden="true">
        <p class="eyebrow">Giỏ hàng</p>
        <h2>Giỏ hàng đang trống</h2>
        <p>Chọn PC build, laptop, linh kiện hoặc phụ kiện phù hợp để bắt đầu đơn hàng của bạn.</p>
        <a class="btn btn-primary" href="products.html">Tiếp tục mua sắm</a>
      </section>
    `;
    summaryContainer.innerHTML = "";
    return;
  }

  itemsContainer.className = "cart-items";
  itemsContainer.innerHTML = items.map(renderCartItem).join("");
  summaryContainer.innerHTML = renderCartSummary();
  bindCartPageEvents();
}

function renderCartItem(item) {
  const imageFallback = item.fallback_image || getProductImageFallback(item);
  const itemKey = getCartItemKey(item);
  const lineUnitPrice = getCartLineUnitPrice(item);
  const isBundleAddon = Boolean(item.is_bundle_addon);

  return `
    <article class="cart-item ${isBundleAddon ? "cart-item-bundle-addon" : ""}">
      <img
        src="${escapeAttribute(getImageUrl(item.image, item))}"
        alt="${escapeAttribute(item.name)}"
        onerror="this.onerror=null;this.src='${escapeAttribute(imageFallback)}'"
      >
      <div>
        <h2>${escapeHtml(item.name)}</h2>
        <p>SKU: ${escapeHtml(item.sku)}</p>
        ${renderCartBundleNote(item)}
        ${isBundleAddon ? renderCartBundlePricing(item) : `<p>Giá sản phẩm: ${formatCurrency(item.price)}</p>`}
        ${!isBundleAddon ? renderCartWarrantyPackage(item) : ""}
      </div>
      ${isBundleAddon ? `
        <div class="quantity-control bundle-quantity-note">
          <span>x${escapeHtml(item.quantity)}</span>
          <small>Theo sản phẩm chính</small>
        </div>
      ` : `
        <div class="quantity-control">
          <button type="button" data-action="decrease" data-id="${escapeAttribute(itemKey)}">-</button>
          <input type="number" min="1" max="${escapeAttribute(item.available_stock)}" value="${escapeAttribute(item.quantity)}" data-id="${escapeAttribute(itemKey)}">
          <button type="button" data-action="increase" data-id="${escapeAttribute(itemKey)}">+</button>
        </div>
      `}
      <div class="cart-line-total">
        <small>${formatCurrency(lineUnitPrice)} x ${escapeHtml(item.quantity)}</small>
        <strong>${formatCurrency(getCartLineTotal(item))}</strong>
        <button class="btn btn-light" type="button" data-action="remove" data-id="${escapeAttribute(itemKey)}">Xóa</button>
      </div>
    </article>
  `;
}

function renderCartBundleNote(item) {
  if (!item.is_bundle_addon) {
    return "";
  }

  return `
    <div class="cart-bundle-note">
      <strong>Mua kèm ưu đãi</strong>
      <span>${item.bundle_parent_name ? `Đi kèm: ${escapeHtml(item.bundle_parent_name)}` : "Đi kèm sản phẩm chính"}</span>
      ${item.bundle_offer_title ? `<span>${escapeHtml(item.bundle_offer_title)}</span>` : ""}
    </div>
  `;
}

function renderCartBundlePricing(item) {
  return `
    <div class="cart-bundle-price-note">
      ${item.original_unit_price ? `<span>Giá gốc: <del>${formatCurrency(item.original_unit_price)}</del></span>` : ""}
      <span>Giá mua kèm: <strong>${formatCurrency(getCartLineUnitPrice(item))}</strong></span>
    </div>
  `;
}

function renderCartWarrantyPackage(item) {
  if (!item.warranty_package_id) {
    return '<p class="cart-warranty-note">Bảo hành mở rộng: Không chọn</p>';
  }

  return `
    <div class="cart-warranty-note selected">
      <strong>${escapeHtml(item.warranty_package_title || "Gói bảo hành mở rộng")}</strong>
      <span>+${escapeHtml(item.warranty_package_duration_months || 0)} tháng - ${formatCurrency(item.warranty_package_price || 0)}</span>
    </div>
  `;
}

function renderCartSummary() {
  const subtotal = getCartSubtotal();
  const shipping = getEstimatedShipping(subtotal);
  const promotion = getCartPromotion();
  const discount = promotion ? Number(promotion.discount_amount || 0) : 0;
  const total = Math.max(subtotal + shipping - discount, 0);

  return `
    <h2>Tổng đơn hàng</h2>
    <div class="summary-row"><span>Tạm tính</span><strong>${formatCurrency(subtotal)}</strong></div>
    <div class="summary-row"><span>Phí giao hàng</span><strong>${formatCurrency(shipping)}</strong></div>
    ${promotion ? `<div class="summary-row discount-row"><span>Mã ${escapeHtml(promotion.code)}</span><strong>-${formatCurrency(discount)}</strong></div>` : ""}
    <div class="cart-promotion-box">
      <label for="cartPromotionCode">Mã ưu đãi</label>
      <div class="promotion-input-row">
        <input id="cartPromotionCode" type="text" value="${escapeAttribute(promotion ? promotion.code : "")}" placeholder="Nhập mã ưu đãi">
        <button id="applyCartPromotionBtn" class="btn btn-light" type="button">Áp dụng</button>
      </div>
      ${promotion ? `
        <div class="promotion-applied-note">
          <strong>${escapeHtml(promotion.title || promotion.code)}</strong>
          <span>Đã giảm ${formatCurrency(discount)}</span>
          <button id="removeCartPromotionBtn" type="button">Bỏ mã</button>
        </div>
      ` : ""}
      <div id="cartPromotionMessage" class="promotion-message"></div>
    </div>
    <div class="summary-row total-line"><span>Tổng cộng</span><strong>${formatCurrency(total)}</strong></div>
    <a class="btn btn-primary" href="checkout.html">Tiến hành đặt hàng</a>
    <button id="clearCartBtn" class="btn btn-light" type="button">Xóa giỏ hàng</button>
  `;
}

function bindCartPageEvents() {
  document.querySelectorAll(".cart-item button, .cart-item input").forEach(function (element) {
    element.addEventListener("click", handleCartControl);
    element.addEventListener("change", handleCartControl);
  });

  const applyPromotionButton = document.getElementById("applyCartPromotionBtn");
  if (applyPromotionButton) {
    applyPromotionButton.addEventListener("click", applyCartPromotion);
  }

  const removePromotionButton = document.getElementById("removeCartPromotionBtn");
  if (removePromotionButton) {
    removePromotionButton.addEventListener("click", function () {
      clearCartPromotion();
      renderCartPage();
    });
  }

  const clearButton = document.getElementById("clearCartBtn");
  if (clearButton) {
    clearButton.addEventListener("click", function () {
      clearCart();
      renderCartPage();
    });
  }
}

async function applyCartPromotion() {
  const input = document.getElementById("cartPromotionCode");
  const message = document.getElementById("cartPromotionMessage");
  const code = input ? input.value.trim() : "";

  if (!code) {
    if (message) message.innerHTML = renderError("Vui lòng nhập mã ưu đãi.");
    return;
  }

  if (!isLoggedIn()) {
    if (message) message.innerHTML = renderError("Bạn cần đăng nhập để áp dụng mã ưu đãi.");
    return;
  }

  try {
    if (message) message.innerHTML = renderLoading("Đang kiểm tra mã ưu đãi...");
    const response = await authPost("/orders/promotion-preview", {
      promotion_code: code,
      items: getCartOrderItemsPayload()
    });
    saveCartPromotion({
      code: response.data.promotion.code,
      title: response.data.promotion.title,
      description: response.data.promotion.description,
      discount_amount: response.data.discount_amount,
      eligible_subtotal: response.data.eligible_subtotal,
      total_amount: response.data.total_amount
    });
    renderCartPage();
  } catch (error) {
    clearCartPromotion();
    if (message) message.innerHTML = renderError(error.message);
  }
}

function handleCartControl(event) {
  const target = event.target;
  const productId = target.dataset.id;

  if (!productId) {
    return;
  }

  const item = getCartItems().find(function (cartItem) {
    return getCartItemKey(cartItem) === String(productId);
  });

  if (!item) {
    return;
  }

  if (target.dataset.action === "remove") {
    removeCartItem(productId);
  } else if (target.dataset.action === "increase") {
    updateCartItemQuantity(productId, Number(item.quantity) + 1);
  } else if (target.dataset.action === "decrease") {
    updateCartItemQuantity(productId, Number(item.quantity) - 1);
  } else if (target.tagName === "INPUT") {
    updateCartItemQuantity(productId, Number(target.value));
  }

  renderCartPage();
}


