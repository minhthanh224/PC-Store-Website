const CART_KEY = "se104_cart";

function getCartItems() {
  const rawCart = localStorage.getItem(CART_KEY);

  if (!rawCart) {
    return [];
  }

  try {
    return JSON.parse(rawCart);
  } catch (error) {
    return [];
  }
}

function saveCartItems(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateCartCount();
}

function clearCart() {
  saveCartItems([]);
}

function getCartCount() {
  return getCartItems().reduce(function (total, item) {
    return total + Number(item.quantity || 0);
  }, 0);
}

function getCartSubtotal() {
  return getCartItems().reduce(function (total, item) {
    return total + Number(item.price || 0) * Number(item.quantity || 0);
  }, 0);
}

function getEstimatedShipping(subtotal) {
  return subtotal >= 3000000 || subtotal === 0 ? 0 : 40000;
}

function updateCartCount() {
  const element = document.getElementById("cartCount");

  if (element) {
    const count = getCartCount();
    const cartLink = element.closest(".cart-link");

    element.textContent = String(count);

    if (cartLink) {
      cartLink.setAttribute("aria-label", `Giỏ hàng, ${count} sản phẩm`);
    }
  }
}

function normalizeCartProduct(product) {
  return {
    product_id: Number(product.product_id),
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    image: getImageUrl(product.image, product),
    fallback_image: product.fallback_image || getProductImageFallback(product),
    price: Number(product.price || 0),
    quantity: Number(product.quantity || 1),
    requires_serial: Boolean(product.requires_serial),
    available_stock: Number(product.available_stock || 0),
    product_type: product.product_type
  };
}

function addToCart(product, quantity) {
  const itemToAdd = normalizeCartProduct({
    ...product,
    quantity: quantity || 1
  });

  if (!itemToAdd.product_id) {
    return {
      success: false,
      message: "Sản phẩm không hợp lệ."
    };
  }

  if (isServiceProduct(itemToAdd)) {
    return {
      success: false,
      message: "Dịch vụ kỹ thuật cần được tư vấn trước khi đặt lịch."
    };
  }

  if (itemToAdd.available_stock <= 0) {
    return {
      success: false,
      message: "Sản phẩm hiện tạm hết hàng."
    };
  }

  const items = getCartItems();
  const existingItem = items.find(function (item) {
    return Number(item.product_id) === itemToAdd.product_id;
  });

  if (existingItem) {
    const nextQuantity = Number(existingItem.quantity) + itemToAdd.quantity;

    if (nextQuantity > itemToAdd.available_stock) {
      return {
        success: false,
        message: `Sản phẩm chỉ còn ${itemToAdd.available_stock} sản phẩm khả dụng.`
      };
    }

    existingItem.quantity = nextQuantity;
    existingItem.available_stock = itemToAdd.available_stock;
  } else {
    if (itemToAdd.quantity > itemToAdd.available_stock) {
      return {
        success: false,
        message: `Sản phẩm chỉ còn ${itemToAdd.available_stock} sản phẩm khả dụng.`
      };
    }

    items.push(itemToAdd);
  }

  saveCartItems(items);

  return {
    success: true,
    message: "Đã thêm sản phẩm vào giỏ hàng."
  };
}

function updateCartItemQuantity(productId, quantity) {
  const items = getCartItems();
  const item = items.find(function (cartItem) {
    return Number(cartItem.product_id) === Number(productId);
  });

  if (!item) {
    return;
  }

  const nextQuantity = Math.max(1, Math.min(Number(quantity), Number(item.available_stock)));
  item.quantity = nextQuantity;
  saveCartItems(items);
}

function removeCartItem(productId) {
  const nextItems = getCartItems().filter(function (item) {
    return Number(item.product_id) !== Number(productId);
  });
  saveCartItems(nextItems);
}

function readProductPayload(button) {
  try {
    return JSON.parse(button.dataset.product);
  } catch (error) {
    return null;
  }
}

function bindCartActionButtons() {
  document.addEventListener("click", function (event) {
    const addButton = event.target.closest(".js-add-cart");
    const buyButton = event.target.closest(".js-buy-now");
    const button = addButton || buyButton;

    if (!button) {
      return;
    }

    const product = readProductPayload(button);

    if (!product) {
      showToast("Không thể đọc thông tin sản phẩm.", "error");
      return;
    }

    const result = addToCart(product, 1);
    showToast(result.message, result.success ? "success" : "error");

    if (result.success && buyButton) {
      window.location.href = "checkout.html";
    }
  });
}


