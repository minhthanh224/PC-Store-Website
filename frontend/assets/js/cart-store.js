const CART_KEY = "se104_cart";
const CART_PROMOTION_KEY = "se104_cart_promotion";
const CART_USER_KEY_PREFIX = `${CART_KEY}:user:`;
const CART_PROMOTION_USER_KEY_PREFIX = `${CART_PROMOTION_KEY}:user:`;

function getCartOwnerKey() {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;

  if (!user) {
    return null;
  }

  return String(user.id || user.email || "").trim() || null;
}

function getCartStorageKey() {
  const ownerKey = getCartOwnerKey();
  return ownerKey ? `${CART_USER_KEY_PREFIX}${ownerKey}` : null;
}

function getCartPromotionStorageKey() {
  const ownerKey = getCartOwnerKey();
  return ownerKey ? `${CART_PROMOTION_USER_KEY_PREFIX}${ownerKey}` : null;
}

function clearLegacyGuestCartStorage() {
  localStorage.removeItem(CART_KEY);
  localStorage.removeItem(CART_PROMOTION_KEY);
}

function clearAllCartStorage() {
  const keys = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    keys.push(localStorage.key(index));
  }

  keys.filter(Boolean).forEach(function (key) {
    if (
      key === CART_KEY ||
      key === CART_PROMOTION_KEY ||
      key.startsWith(CART_USER_KEY_PREFIX) ||
      key.startsWith(CART_PROMOTION_USER_KEY_PREFIX)
    ) {
      localStorage.removeItem(key);
    }
  });
}

function redirectToLoginFromCurrentPage() {
  const currentPath = `${window.location.pathname.split("/").pop() || "index.html"}${window.location.search || ""}`;
  window.location.href = `login.html?redirect=${encodeURIComponent(currentPath)}`;
}

function getCartItems() {
  const storageKey = getCartStorageKey();

  if (!storageKey) {
    return [];
  }

  const rawCart = localStorage.getItem(storageKey);

  if (!rawCart) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawCart);
    return Array.isArray(parsed) ? parsed.map(normalizeCartProduct) : [];
  } catch (error) {
    return [];
  }
}

function saveCartItems(items) {
  const storageKey = getCartStorageKey();

  if (!storageKey) {
    clearLegacyGuestCartStorage();
    updateCartCount();
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify(items));
  updateCartCount();
}

function clearCart() {
  saveCartItems([]);
  clearCartPromotion();
}

function getCartPromotion() {
  const storageKey = getCartPromotionStorageKey();

  if (!storageKey) {
    return null;
  }

  const rawPromotion = localStorage.getItem(storageKey);

  if (!rawPromotion) {
    return null;
  }

  try {
    const promotion = JSON.parse(rawPromotion);

    if (!promotion || !promotion.code) {
      return null;
    }

    return {
      code: String(promotion.code || "").trim().toUpperCase(),
      title: promotion.title || "",
      description: promotion.description || "",
      discount_amount: Number(promotion.discount_amount || 0),
      eligible_subtotal: Number(promotion.eligible_subtotal || 0),
      total_amount: promotion.total_amount === undefined ? null : Number(promotion.total_amount || 0)
    };
  } catch (error) {
    return null;
  }
}

function saveCartPromotion(promotion) {
  if (!promotion || !promotion.code) {
    clearCartPromotion();
    return;
  }

  const storageKey = getCartPromotionStorageKey();

  if (!storageKey) {
    clearCartPromotion();
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify({
    code: String(promotion.code || "").trim().toUpperCase(),
    title: promotion.title || "",
    description: promotion.description || "",
    discount_amount: Number(promotion.discount_amount || 0),
    eligible_subtotal: Number(promotion.eligible_subtotal || 0),
    total_amount: promotion.total_amount === undefined ? null : Number(promotion.total_amount || 0)
  }));
}

function clearCartPromotion() {
  const storageKey = getCartPromotionStorageKey();

  if (storageKey) {
    localStorage.removeItem(storageKey);
  }

  localStorage.removeItem(CART_PROMOTION_KEY);
}

function getCartCount() {
  return getCartItems().reduce(function (total, item) {
    return total + Number(item.quantity || 0);
  }, 0);
}

function getCartSubtotal() {
  return getCartItems().reduce(function (total, item) {
    return total + getCartLineTotal(item);
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
  const warrantyPackage = product.warranty_package || {};
  const warrantyPackageId = product.warranty_package_id || warrantyPackage.id || null;
  const warrantyPackagePrice = Number(product.warranty_package_price || warrantyPackage.price || 0);
  const isBundleAddon = Boolean(product.is_bundle_addon);
  const bundleOffer = product.bundle_offer || {};
  const parentKey = product.bundle_parent_key || "";
  const bundleOfferId = product.bundle_offer_id || bundleOffer.id || null;
  const baseKey = product.cart_item_key || product.item_key || product.key || "";
  const normalized = {
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
    product_type: product.product_type,
    warranty_package_id: isBundleAddon ? null : (warrantyPackageId ? Number(warrantyPackageId) : null),
    warranty_package_title: isBundleAddon ? "" : (product.warranty_package_title || warrantyPackage.title || ""),
    warranty_package_duration_months: isBundleAddon ? null : (product.warranty_package_duration_months || warrantyPackage.duration_months || null),
    warranty_package_price: isBundleAddon ? 0 : warrantyPackagePrice,
    is_bundle_addon: isBundleAddon,
    bundle_parent_key: isBundleAddon ? parentKey : null,
    bundle_parent_name: product.bundle_parent_name || "",
    bundle_offer_id: isBundleAddon && bundleOfferId ? Number(bundleOfferId) : null,
    bundle_offer_title: product.bundle_offer_title || bundleOffer.title || "",
    bundle_discount_type: product.bundle_discount_type || bundleOffer.discount_type || null,
    bundle_discount_value: product.bundle_discount_value !== undefined ? Number(product.bundle_discount_value || 0) : (bundleOffer.discount_value !== undefined && bundleOffer.discount_value !== null ? Number(bundleOffer.discount_value || 0) : null),
    original_unit_price: product.original_unit_price !== undefined && product.original_unit_price !== null ? Number(product.original_unit_price) : Number(product.price || 0),
    bundle_unit_price: product.bundle_unit_price !== undefined && product.bundle_unit_price !== null ? Number(product.bundle_unit_price) : null,
    bundle_addons: Array.isArray(product.bundle_addons) ? product.bundle_addons : []
  };

  normalized.cart_item_key = baseKey || getCartItemKey(normalized);
  return normalized;
}

function getBundleSignature(addons) {
  if (!Array.isArray(addons) || addons.length === 0) {
    return "none";
  }

  return addons.map(function (addon) {
    return Number(addon.bundle_offer_id || addon.id || addon.offer_id || 0);
  }).filter(Boolean).sort(function (a, b) {
    return a - b;
  }).join("-") || "none";
}

function getCartItemKey(item) {
  if (item.cart_item_key) {
    return String(item.cart_item_key);
  }

  if (item.is_bundle_addon) {
    return `bundle:${item.bundle_parent_key || "parent"}:${Number(item.product_id)}:${item.bundle_offer_id || "none"}`;
  }

  const warrantyPart = item.warranty_package_id || "none";
  const bundlePart = getBundleSignature(item.bundle_addons || []);
  return `main:${Number(item.product_id)}:${warrantyPart}:addons:${bundlePart}`;
}

function getCartLineUnitPrice(item) {
  if (item.is_bundle_addon) {
    return Number(item.bundle_unit_price !== null && item.bundle_unit_price !== undefined ? item.bundle_unit_price : item.price || 0);
  }

  return Number(item.price || 0) + Number(item.warranty_package_price || 0);
}

function getCartLineTotal(item) {
  return getCartLineUnitPrice(item) * Number(item.quantity || 0);
}

function getBundleAddonUnitPrice(addon) {
  const originalPrice = Number(addon.original_unit_price || addon.price || 0);

  if (addon.bundle_unit_price !== undefined && addon.bundle_unit_price !== null) {
    return Math.max(Number(addon.bundle_unit_price || 0), 0);
  }

  if (addon.bundle_price !== undefined && addon.bundle_price !== null && addon.bundle_price !== "") {
    return Math.max(Number(addon.bundle_price || 0), 0);
  }

  if (addon.discount_type === "percent" && addon.discount_value) {
    return Math.max(originalPrice * (1 - Number(addon.discount_value) / 100), 0);
  }

  if (addon.discount_type === "fixed" && addon.discount_value) {
    return Math.max(originalPrice - Number(addon.discount_value), 0);
  }

  return originalPrice;
}

function normalizeBundleAddonPayload(addon, parentItem) {
  const addonProduct = addon.addon_product || addon.product || addon;
  const originalUnitPrice = Number(addon.original_unit_price || addon.price || addonProduct.price || addonProduct.sale_price || addonProduct.base_price || 0);
  const bundleUnitPrice = getBundleAddonUnitPrice({
    ...addon,
    original_unit_price: originalUnitPrice
  });

  return normalizeCartProduct({
    product_id: addonProduct.id || addonProduct.product_id || addon.addon_product_id,
    slug: addonProduct.slug,
    name: addonProduct.name,
    sku: addonProduct.sku,
    image: addonProduct.primary_image || addonProduct.image,
    fallback_image: addonProduct.fallback_image || getProductImageFallback(addonProduct),
    price: bundleUnitPrice,
    quantity: parentItem.quantity,
    requires_serial: Boolean(addonProduct.requires_serial),
    available_stock: Number(addonProduct.available_stock || 0),
    product_type: addonProduct.product_type,
    is_bundle_addon: true,
    bundle_parent_key: getCartItemKey(parentItem),
    bundle_parent_name: parentItem.name,
    bundle_offer_id: addon.bundle_offer_id || addon.id || addon.offer_id,
    bundle_offer_title: addon.bundle_offer_title || addon.title || "Mua kèm ưu đãi",
    bundle_discount_type: addon.bundle_discount_type || addon.discount_type || null,
    bundle_discount_value: addon.bundle_discount_value !== undefined ? addon.bundle_discount_value : addon.discount_value,
    original_unit_price: originalUnitPrice,
    bundle_unit_price: bundleUnitPrice,
    bundle_offer: addon
  });
}

function addToCart(product, quantity) {
  if (!isLoggedIn()) {
    clearLegacyGuestCartStorage();
    updateCartCount();
    return {
      success: false,
      requiresLogin: true,
      message: "Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng."
    };
  }

  const selectedAddons = Array.isArray(product.bundle_addons) ? product.bundle_addons : [];
  const itemToAdd = normalizeCartProduct({
    ...product,
    quantity: quantity || 1,
    bundle_addons: selectedAddons
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

  const mainKey = getCartItemKey(itemToAdd);
  itemToAdd.cart_item_key = mainKey;
  const addonItems = selectedAddons.map(function (addon) {
    return normalizeBundleAddonPayload(addon, itemToAdd);
  });

  const invalidAddon = addonItems.find(function (addon) {
    return !addon.product_id || isServiceProduct(addon) || addon.available_stock <= 0 || addon.quantity > addon.available_stock;
  });

  if (invalidAddon) {
    return {
      success: false,
      message: `Sản phẩm mua kèm ${invalidAddon.name || "đã chọn"} hiện không đủ hàng hoặc không hợp lệ.`
    };
  }

  const items = getCartItems();
  const existingItem = items.find(function (item) {
    return getCartItemKey(item) === mainKey && !item.is_bundle_addon;
  });

  if (existingItem) {
    const nextQuantity = Number(existingItem.quantity) + itemToAdd.quantity;

    if (nextQuantity > itemToAdd.available_stock) {
      return {
        success: false,
        message: `Sản phẩm chỉ còn ${itemToAdd.available_stock} sản phẩm khả dụng.`
      };
    }

    const addonOverStock = addonItems.find(function (addon) {
      return nextQuantity > addon.available_stock;
    });

    if (addonOverStock) {
      return {
        success: false,
        message: `Sản phẩm mua kèm ${addonOverStock.name} chỉ còn ${addonOverStock.available_stock} sản phẩm khả dụng.`
      };
    }

    existingItem.quantity = nextQuantity;
    existingItem.available_stock = itemToAdd.available_stock;

    items.forEach(function (item) {
      if (item.is_bundle_addon && item.bundle_parent_key === mainKey) {
        item.quantity = nextQuantity;
      }
    });
  } else {
    if (itemToAdd.quantity > itemToAdd.available_stock) {
      return {
        success: false,
        message: `Sản phẩm chỉ còn ${itemToAdd.available_stock} sản phẩm khả dụng.`
      };
    }

    items.push(itemToAdd);
    addonItems.forEach(function (addon) {
      items.push(addon);
    });
  }

  saveCartItems(items);
  clearCartPromotion();

  return {
    success: true,
    message: selectedAddons.length ? "Đã thêm sản phẩm và ưu đãi mua kèm vào giỏ hàng." : "Đã thêm sản phẩm vào giỏ hàng."
  };
}

function updateCartItemQuantity(productIdOrKey, quantity) {
  const items = getCartItems();
  const item = items.find(function (cartItem) {
    return getCartItemKey(cartItem) === String(productIdOrKey) || Number(cartItem.product_id) === Number(productIdOrKey);
  });

  if (!item || item.is_bundle_addon) {
    return;
  }

  const nextQuantity = Math.max(1, Math.min(Number(quantity), Number(item.available_stock)));
  item.quantity = nextQuantity;

  items.forEach(function (cartItem) {
    if (cartItem.is_bundle_addon && cartItem.bundle_parent_key === getCartItemKey(item)) {
      cartItem.quantity = Math.min(nextQuantity, Number(cartItem.available_stock || nextQuantity));
    }
  });

  saveCartItems(items);
  clearCartPromotion();
}

function removeCartItem(productIdOrKey) {
  const targetKey = String(productIdOrKey);
  const items = getCartItems();
  const targetItem = items.find(function (item) {
    return getCartItemKey(item) === targetKey || Number(item.product_id) === Number(productIdOrKey);
  });

  if (!targetItem) {
    saveCartItems(items);
    return;
  }

  const nextItems = items.filter(function (item) {
    if (getCartItemKey(item) === getCartItemKey(targetItem)) {
      return false;
    }

    if (!targetItem.is_bundle_addon && item.is_bundle_addon && item.bundle_parent_key === getCartItemKey(targetItem)) {
      return false;
    }

    return true;
  });
  saveCartItems(nextItems);
  clearCartPromotion();
}

function getCartOrderItemsPayload() {
  return getCartItems().map(function (item) {
    return {
      product_id: item.product_id,
      quantity: item.quantity,
      warranty_package_id: item.warranty_package_id || null,
      cart_item_key: getCartItemKey(item),
      is_bundle_addon: Boolean(item.is_bundle_addon),
      bundle_parent_key: item.bundle_parent_key || null,
      bundle_offer_id: item.bundle_offer_id || null
    };
  });
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

    if (!result.success && result.requiresLogin) {
      window.setTimeout(function () {
        redirectToLoginFromCurrentPage();
      }, 650);
      return;
    }

    if (result.success && buyButton) {
      window.location.href = "checkout.html";
    }
  });
}
