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

  return `
    <article class="cart-item">
      <img
        src="${escapeAttribute(getImageUrl(item.image, item))}"
        alt="${escapeAttribute(item.name)}"
        onerror="this.onerror=null;this.src='${escapeAttribute(imageFallback)}'"
      >
      <div>
        <h2>${escapeHtml(item.name)}</h2>
        <p>SKU: ${escapeHtml(item.sku)}</p>
        <p>${formatCurrency(item.price)}</p>
      </div>
      <div class="quantity-control">
        <button type="button" data-action="decrease" data-id="${escapeAttribute(item.product_id)}">-</button>
        <input type="number" min="1" max="${escapeAttribute(item.available_stock)}" value="${escapeAttribute(item.quantity)}" data-id="${escapeAttribute(item.product_id)}">
        <button type="button" data-action="increase" data-id="${escapeAttribute(item.product_id)}">+</button>
      </div>
      <div class="cart-line-total">
        <strong>${formatCurrency(item.price * item.quantity)}</strong>
        <button class="btn btn-light" type="button" data-action="remove" data-id="${escapeAttribute(item.product_id)}">Xóa</button>
      </div>
    </article>
  `;
}

function renderCartSummary() {
  const subtotal = getCartSubtotal();
  const shipping = getEstimatedShipping(subtotal);
  const total = subtotal + shipping;

  return `
    <h2>Tổng đơn hàng</h2>
    <div class="summary-row"><span>Tạm tính</span><strong>${formatCurrency(subtotal)}</strong></div>
    <div class="summary-row"><span>Phí giao hàng</span><strong>${formatCurrency(shipping)}</strong></div>
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

  const clearButton = document.getElementById("clearCartBtn");
  if (clearButton) {
    clearButton.addEventListener("click", function () {
      clearCart();
      renderCartPage();
    });
  }
}

function handleCartControl(event) {
  const target = event.target;
  const productId = target.dataset.id;

  if (!productId) {
    return;
  }

  const item = getCartItems().find(function (cartItem) {
    return Number(cartItem.product_id) === Number(productId);
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


