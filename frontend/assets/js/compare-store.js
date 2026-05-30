const COMPARE_STORAGE_KEY = "aerotech_compare_products";
const COMPARE_MAX_ITEMS = 4;

function getCompareItems() {
  let items = [];

  try {
    items = JSON.parse(localStorage.getItem(COMPARE_STORAGE_KEY)) || [];
  } catch (error) {
    items = [];
  }

  const seen = new Set();
  return items.filter(function (item) {
    const key = getCompareItemKey(item);

    if (!key || !item.slug || !item.name || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  }).slice(0, COMPARE_MAX_ITEMS);
}

function saveCompareItems(items, options) {
  const normalizedItems = items.slice(0, COMPARE_MAX_ITEMS);
  localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(normalizedItems));
  renderCompareBar();
  syncCompareButtons();

  if (!options || !options.silent) {
    window.dispatchEvent(new CustomEvent("aerotech:compare-updated", {
      detail: {
        items: normalizedItems
      }
    }));
  }
}

function getCompareItemKey(item) {
  return item && (item.slug || String(item.id || ""));
}

function normalizeCompareProduct(product) {
  if (!product || !product.slug || !product.name) {
    return null;
  }

  return {
    id: product.id || product.product_id || null,
    slug: product.slug,
    name: product.name,
    image: getImageUrl(product.image || product.primary_image, product),
    fallback_image: product.fallback_image || getProductImageFallback(product),
    price: Number(product.price || product.sale_price || product.base_price || 0),
    base_price: product.base_price || null,
    sale_price: product.sale_price || null,
    brand_name: product.brand_name || (product.brand && product.brand.name) || "",
    category_name: product.category_name || (product.category && product.category.name) || "",
    category_slug: product.category_slug || (product.category && product.category.slug) || "",
    product_type: product.product_type || "",
    available_stock: Number(product.available_stock || 0)
  };
}

function isCompareSelected(product) {
  const key = getCompareItemKey(product);

  if (!key) {
    return false;
  }

  return getCompareItems().some(function (item) {
    return getCompareItemKey(item) === key;
  });
}

function addCompareProduct(product, options) {
  const normalizedProduct = normalizeCompareProduct(product);

  if (!normalizedProduct) {
    showToast("Không thể đọc thông tin sản phẩm để so sánh.", "error");
    return false;
  }

  const items = getCompareItems();
  const exists = items.some(function (item) {
    return getCompareItemKey(item) === getCompareItemKey(normalizedProduct);
  });

  if (exists) {
    if (!options || !options.silent) {
      showToast("Sản phẩm đã có trong danh sách so sánh.", "error");
    }
    return false;
  }

  if (items.length >= COMPARE_MAX_ITEMS) {
    showToast("Chỉ có thể so sánh tối đa 4 sản phẩm.", "error");
    return false;
  }

  saveCompareItems(items.concat(normalizedProduct));

  if (!options || !options.silent) {
    showToast("Đã thêm sản phẩm vào danh sách so sánh.");
  }

  return true;
}

function removeCompareProduct(key, options) {
  const currentKey = String(key || "");
  const nextItems = getCompareItems().filter(function (item) {
    return getCompareItemKey(item) !== currentKey;
  });

  saveCompareItems(nextItems, options);
}

function clearCompareProducts(options) {
  saveCompareItems([], options);
}

function toggleCompareProduct(product) {
  const normalizedProduct = normalizeCompareProduct(product);

  if (!normalizedProduct) {
    showToast("Không thể đọc thông tin sản phẩm để so sánh.", "error");
    return;
  }

  if (isCompareSelected(normalizedProduct)) {
    removeCompareProduct(getCompareItemKey(normalizedProduct));
    showToast("Đã bỏ sản phẩm khỏi danh sách so sánh.");
    return;
  }

  addCompareProduct(normalizedProduct);
}

function parseComparePayload(button) {
  try {
    return JSON.parse(button.dataset.compareProduct || "{}");
  } catch (error) {
    return null;
  }
}

function renderCompareBar() {
  if (!document.body) {
    return;
  }

  let bar = document.getElementById("compareBar");
  if (!bar) {
    bar = document.createElement("aside");
    bar.id = "compareBar";
    bar.className = "compare-bar";
    bar.setAttribute("aria-live", "polite");
    document.body.appendChild(bar);
  }

  const items = getCompareItems();
  document.body.classList.toggle("has-compare-bar", items.length > 0);

  if (!items.length) {
    bar.hidden = true;
    bar.innerHTML = "";
    return;
  }

  bar.hidden = false;
  bar.innerHTML = `
    <div class="compare-bar-inner">
      <div class="compare-bar-summary">
        <strong>Đã chọn ${items.length}/${COMPARE_MAX_ITEMS} sản phẩm</strong>
        <small>${items.length < 2 ? "Chọn thêm ít nhất 1 sản phẩm để so sánh." : "Sẵn sàng mở bảng so sánh."}</small>
      </div>
      <div class="compare-bar-products">
        ${items.map(renderCompareBarItem).join("")}
      </div>
      <div class="compare-bar-actions">
        <button class="btn btn-light js-compare-clear" type="button">Xóa tất cả</button>
        <button class="btn btn-primary js-compare-open" type="button" ${items.length < 2 ? "disabled" : ""}>So sánh</button>
      </div>
    </div>
  `;
}

function renderCompareBarItem(item) {
  const imageFallback = item.fallback_image || getProductImageFallback(item);

  return `
    <article class="compare-bar-item">
      <img
        src="${escapeAttribute(getImageUrl(item.image, item))}"
        alt="${escapeAttribute(item.name)}"
        onerror="this.onerror=null;this.src='${escapeAttribute(imageFallback)}'"
      >
      <span>${escapeHtml(item.name)}</span>
      <button
        class="js-compare-remove"
        type="button"
        data-compare-key="${escapeAttribute(getCompareItemKey(item))}"
        aria-label="Bỏ ${escapeAttribute(item.name)} khỏi danh sách so sánh"
      >×</button>
    </article>
  `;
}

function syncCompareButtons() {
  const buttons = document.querySelectorAll(".js-compare-toggle");

  buttons.forEach(function (button) {
    const product = parseComparePayload(button);
    const selected = isCompareSelected(product);
    const defaultLabel = button.dataset.defaultLabel || "So sánh";
    const selectedLabel = button.dataset.selectedLabel || "Đã chọn";
    const nextLabel = selected ? selectedLabel : defaultLabel;

    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
    if (button.textContent !== nextLabel) {
      button.textContent = nextLabel;
    }
  });
}

function bindCompareEvents() {
  if (window.__aerotechCompareBound) {
    return;
  }

  window.__aerotechCompareBound = true;

  document.addEventListener("click", function (event) {
    const toggleButton = event.target.closest(".js-compare-toggle");
    if (toggleButton) {
      toggleCompareProduct(parseComparePayload(toggleButton));
      return;
    }

    const removeButton = event.target.closest(".js-compare-remove");
    if (removeButton) {
      removeCompareProduct(removeButton.dataset.compareKey);
      return;
    }

    if (event.target.closest(".js-compare-clear")) {
      clearCompareProducts();
      showToast("Đã xóa danh sách so sánh.");
      return;
    }

    if (event.target.closest(".js-compare-open")) {
      const items = getCompareItems();
      if (items.length < 2) {
        showToast("Hãy chọn ít nhất 2 sản phẩm để so sánh.", "error");
        return;
      }

      window.location.href = "compare.html";
    }
  });

  window.addEventListener("storage", function (event) {
    if (event.key === COMPARE_STORAGE_KEY) {
      renderCompareBar();
      syncCompareButtons();
    }
  });
}

function observeCompareButtons() {
  if (window.__aerotechCompareObserver || !document.body || typeof MutationObserver === "undefined") {
    return;
  }

  let syncTimer = null;
  window.__aerotechCompareObserver = new MutationObserver(function () {
    window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(syncCompareButtons, 60);
  });
  window.__aerotechCompareObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function initCompareExperience() {
  renderCompareBar();
  syncCompareButtons();
  bindCompareEvents();
  observeCompareButtons();
}

document.addEventListener("DOMContentLoaded", initCompareExperience);
