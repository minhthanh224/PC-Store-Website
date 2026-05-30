document.addEventListener("DOMContentLoaded", function () {
  initComparePage();
});

const COMPARE_SPEC_PRIORITY = [
  "cpu",
  "gpu",
  "vga",
  "ram",
  "storage",
  "luu_tru",
  "display_size",
  "kich_thuoc_man_hinh",
  "display_resolution",
  "do_phan_giai",
  "refresh_rate",
  "tan_so_quet",
  "panel",
  "tam_nen",
  "battery",
  "pin",
  "weight",
  "trong_luong",
  "warranty",
  "bao_hanh",
  "socket",
  "cores",
  "threads",
  "vram",
  "capacity",
  "interface"
];

let comparePageInitialized = false;

async function initComparePage() {
  await loadSiteLayout();
  await renderComparePage();

  if (!comparePageInitialized) {
    comparePageInitialized = true;
    window.addEventListener("aerotech:compare-updated", function () {
      renderComparePage();
    });
  }
}

async function renderComparePage() {
  const container = document.getElementById("compareContent");
  const items = getCompareItems();

  if (items.length < 2) {
    container.className = "compare-content";
    container.innerHTML = renderCompareEmpty(items.length);
    return;
  }

  container.className = "compare-content loading-box";
  container.innerHTML = "Đang tải dữ liệu sản phẩm...";

  try {
    const products = await loadCompareProducts(items);

    if (products.length < 2) {
      container.className = "compare-content";
      container.innerHTML = renderCompareEmpty(products.length, "Một số sản phẩm trong danh sách không còn khả dụng.");
      return;
    }

    container.className = "compare-content";
    container.innerHTML = renderCompareTable(products);
    syncCompareButtons();
  } catch (error) {
    container.className = "compare-content";
    container.innerHTML = renderError(error.message);
  }
}

async function loadCompareProducts(items) {
  const settledProducts = await Promise.all(items.map(async function (item) {
    try {
      const response = await apiGet(`/products/${encodeURIComponent(item.slug)}`);
      return response.data;
    } catch (error) {
      removeCompareProduct(getCompareItemKey(item), { silent: true });
      return null;
    }
  }));

  return settledProducts.filter(Boolean).slice(0, COMPARE_MAX_ITEMS);
}

function renderCompareEmpty(selectedCount, note) {
  return `
    <section class="empty-state-card compare-empty-state">
      <h2>Hãy chọn ít nhất 2 sản phẩm để so sánh.</h2>
      <p>${escapeHtml(note || (selectedCount ? "Bạn đã chọn 1 sản phẩm. Hãy chọn thêm một sản phẩm cùng nhóm để bảng so sánh có ý nghĩa hơn." : "Danh sách so sánh đang trống."))}</p>
      <a class="btn btn-primary" href="products.html">Tiếp tục chọn sản phẩm</a>
    </section>
  `;
}

function renderCompareTable(products) {
  const mixedWarning = isMixedCompareGroup(products) ? `
    <div class="compare-warning">
      Nên so sánh các sản phẩm cùng nhóm để kết quả dễ đọc hơn.
    </div>
  ` : "";
  const rows = buildCompareRows(products);

  return `
    <section class="compare-toolbar">
      <div>
        <strong>${products.length}/${COMPARE_MAX_ITEMS} sản phẩm đang được so sánh</strong>
        <p>Thông số được lấy trực tiếp từ dữ liệu sản phẩm hiện tại.</p>
      </div>
      <div class="compare-toolbar-actions">
        <a class="btn btn-light" href="products.html">Chọn thêm</a>
        <button class="btn btn-outline js-compare-clear" type="button">Xóa tất cả</button>
      </div>
    </section>
    ${mixedWarning}
    <section class="compare-table-wrap" aria-label="Bảng so sánh sản phẩm">
      <table class="compare-table">
        <thead>
          <tr>
            <th class="compare-feature-col">Sản phẩm</th>
            ${products.map(function (product) {
              return `<th>${renderCompareProductHeader(product)}</th>`;
            }).join("")}
          </tr>
        </thead>
        ${rows.map(function (group) {
          return renderCompareGroup(group, products);
        }).join("")}
      </table>
    </section>
  `;
}

function renderCompareProductHeader(product) {
  const detailsUrl = `product-detail.html?slug=${encodeURIComponent(product.slug)}`;
  const image = getComparePrimaryImage(product);
  const imageFallback = getProductImageFallback(product);
  const isService = isServiceProduct(product);
  const canBuy = !isService && Number(product.available_stock) > 0;
  const cartPayload = escapeAttribute(JSON.stringify(getCartProductPayload({
    ...product,
    primary_image: image
  })));

  return `
    <article class="compare-product-card">
      <button
        class="compare-remove-btn js-compare-remove"
        type="button"
        data-compare-key="${escapeAttribute(product.slug)}"
        aria-label="Bỏ ${escapeAttribute(product.name)} khỏi so sánh"
      >×</button>
      <a href="${detailsUrl}" class="compare-product-image">
        <img
          src="${escapeAttribute(getImageUrl(image, product))}"
          alt="${escapeAttribute(product.name)}"
          onerror="this.onerror=null;this.src='${escapeAttribute(imageFallback)}'"
        >
      </a>
      <h2><a href="${detailsUrl}">${escapeHtml(product.name)}</a></h2>
      <p>${escapeHtml(product.brand_name || product.category_name || "AeroTech")}</p>
      <strong>${formatCurrency(product.sale_price || product.base_price)}</strong>
      <span class="stock-badge ${Number(product.available_stock) > 0 || isService ? "in-stock" : "out-stock"}">
        ${escapeHtml(getStockLabel(product))}
      </span>
      <div class="compare-product-actions">
        <a class="btn btn-outline" href="${detailsUrl}">Chi tiết</a>
        ${isService ? `
          <a class="btn btn-primary" href="contact.html">Liên hệ tư vấn</a>
        ` : `
          <button
            class="btn btn-primary js-add-cart"
            type="button"
            data-product="${cartPayload}"
            ${canBuy ? "" : "disabled"}
          >Thêm giỏ</button>
        `}
      </div>
    </article>
  `;
}

function renderCompareGroup(group, products) {
  return `
    <tbody class="compare-group">
      <tr class="compare-group-title">
        <th colspan="${products.length + 1}">${escapeHtml(group.group)}</th>
      </tr>
      ${group.rows.map(function (row) {
        return `
          <tr class="${row.isDifferent ? "is-different" : ""}">
            <th class="compare-feature-col">${escapeHtml(row.label)}</th>
            ${products.map(function (product) {
              const value = row.values[product.slug] || "—";
              return `<td>${escapeHtml(value)}</td>`;
            }).join("")}
          </tr>
        `;
      }).join("")}
    </tbody>
  `;
}

function buildCompareRows(products) {
  const groups = [
    buildBasicCompareGroup(products)
  ].concat(buildSpecCompareGroups(products));

  return groups.map(function (group) {
    return {
      group: group.group,
      rows: group.rows.map(function (row) {
        return {
          ...row,
          isDifferent: hasDifferentCompareValues(Object.values(row.values))
        };
      })
    };
  });
}

function buildBasicCompareGroup(products) {
  const rows = [
    {
      key: "price",
      label: "Giá bán",
      values: mapProductValues(products, function (product) {
        return formatCurrency(product.sale_price || product.base_price);
      })
    },
    {
      key: "brand",
      label: "Thương hiệu",
      values: mapProductValues(products, function (product) {
        return product.brand_name || "AeroTech";
      })
    },
    {
      key: "category",
      label: "Danh mục",
      values: mapProductValues(products, function (product) {
        return product.category_name || (product.category && product.category.name) || "—";
      })
    },
    {
      key: "type",
      label: "Loại sản phẩm",
      values: mapProductValues(products, function (product) {
        return getProductTypeLabel(product.product_type);
      })
    },
    {
      key: "warranty",
      label: "Bảo hành",
      values: mapProductValues(products, function (product) {
        return Number(product.warranty_months) > 0 ? `${product.warranty_months} tháng` : "Theo chính sách";
      })
    },
    {
      key: "stock",
      label: "Tình trạng",
      values: mapProductValues(products, function (product) {
        return getStockLabel(product);
      })
    }
  ];

  return {
    group: "Thông tin cơ bản",
    rows
  };
}

function buildSpecCompareGroups(products) {
  const groupMap = new Map();

  products.forEach(function (product) {
    flattenCompareSpecs(product).forEach(function (spec) {
      const groupKey = normalizeCompareKey(spec.group || "Thông số");
      const rowKey = spec.normalizedKey || normalizeCompareKey(spec.label);
      const compositeKey = `${groupKey}__${rowKey}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          group: formatCompareGroupName(spec.group || "Thông số"),
          rows: new Map()
        });
      }

      const group = groupMap.get(groupKey);
      if (!group.rows.has(compositeKey)) {
        group.rows.set(compositeKey, {
          key: rowKey,
          label: spec.label,
          sortOrder: spec.sortOrder,
          values: {}
        });
      }

      group.rows.get(compositeKey).values[product.slug] = spec.value;
    });
  });

  return Array.from(groupMap.values()).map(function (group) {
    return {
      group: group.group,
      rows: Array.from(group.rows.values()).sort(compareSpecRows)
    };
  });
}

function flattenCompareSpecs(product) {
  const result = [];

  (product.specs || []).forEach(function (group, groupIndex) {
    (group.items || []).forEach(function (item, itemIndex) {
      const rawKey = item.key || item.spec_key || item.spec_label || "";
      const label = item.label || item.spec_label || formatCompareSpecLabel(rawKey);
      const value = formatCompareSpecValue(item);

      if (!value) {
        return;
      }

      result.push({
        group: group.group || item.spec_group || "Thông số",
        key: rawKey,
        label,
        value,
        normalizedKey: normalizeCompareKey(rawKey),
        sortOrder: Number(item.sort_order || item.sortOrder || groupIndex * 100 + itemIndex)
      });
    });
  });

  return result;
}

function compareSpecRows(a, b) {
  const priorityA = getSpecPriority(a.key);
  const priorityB = getSpecPriority(b.key);

  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }

  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }

  return a.label.localeCompare(b.label, "vi");
}

function getSpecPriority(key) {
  const normalized = normalizeCompareKey(key);
  const index = COMPARE_SPEC_PRIORITY.findIndex(function (priorityKey) {
    return normalized.includes(priorityKey);
  });

  return index === -1 ? 999 : index;
}

function mapProductValues(products, getter) {
  return products.reduce(function (values, product) {
    values[product.slug] = getter(product);
    return values;
  }, {});
}

function hasDifferentCompareValues(values) {
  const cleanValues = values
    .map(function (value) {
      return normalizeCompareValue(value);
    })
    .filter(function (value) {
      return value && value !== "—";
    });

  return new Set(cleanValues).size > 1;
}

function normalizeCompareValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeCompareKey(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatCompareSpecLabel(key) {
  const normalized = normalizeCompareKey(key);
  const labels = {
    cpu: "CPU",
    gpu: "GPU",
    vga: "GPU",
    ram: "RAM",
    storage: "Lưu trữ",
    luu_tru: "Lưu trữ",
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

  return labels[normalized] || String(key || "Thông số").replace(/_/g, " ").trim();
}

function formatCompareGroupName(groupName) {
  const normalized = normalizeCompareKey(groupName);
  const labels = {
    cau_hinh: "Cấu hình",
    cpu_gpu: "Bộ xử lý & Đồ họa",
    memory_storage: "Bộ nhớ RAM - Ổ cứng",
    display: "Màn hình",
    connectivity: "Cổng kết nối",
    ports: "Cổng kết nối",
    battery_power: "Pin & sạc",
    warranty: "Bảo hành"
  };

  return labels[normalized] || groupName || "Thông số";
}

function formatCompareSpecValue(item) {
  const value = item.value || item.spec_value || "";
  const unit = item.unit || "";

  return [value, unit].filter(Boolean).join(" ").trim();
}

function getComparePrimaryImage(product) {
  const primaryImage = (product.images || []).find(function (image) {
    return image.is_primary;
  }) || (product.images || [])[0];

  return primaryImage ? primaryImage.image_url : product.primary_image;
}

function isMixedCompareGroup(products) {
  const productTypes = new Set(products.map(function (product) {
    return product.product_type;
  }).filter(Boolean));
  const categories = new Set(products.map(function (product) {
    return product.category_slug || (product.category && product.category.slug);
  }).filter(Boolean));

  return productTypes.size > 1 || categories.size > 1;
}
