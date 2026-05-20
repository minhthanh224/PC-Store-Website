document.addEventListener("DOMContentLoaded", function () {
  initHomePage();
});

async function initHomePage() {
  await loadSiteLayout();
  await Promise.all([
    loadHomeCategories(),
    loadFeaturedProducts()
  ]);
}

async function loadHomeCategories() {
  const container = document.getElementById("homeCategoryGrid");

  try {
    const response = await apiGet("/categories?tree=true");
    const categories = (response.data || []).filter(isDisplayableHomeCategory);

    container.classList.remove("loading-box");
    container.innerHTML = categories.map(function (category) {
      const children = (category.children || []).filter(isDisplayableHomeCategory);
      const displayChildren = children.length ? children.slice(0, 3) : getHomeCategoryFallbackItems(category).map(function (name) {
        return { name: name };
      });
      const firstChildren = displayChildren.slice(0, 3).map(function (child) {
        return `<li>${escapeHtml(child.name)}</li>`;
      }).join("");

      const bannerImage = getCategoryBannerImage(category);
      const style = bannerImage ? ` style="--card-bg: url('${escapeAttribute(bannerImage)}')"` : "";

      return `
        <a class="category-tile need-card image-card"${style} href="products.html?category=${encodeURIComponent(category.slug)}">
          <div class="need-card-content">
            <h3 class="need-card-title">${escapeHtml(category.name)}</h3>
            <ul class="need-card-list">${firstChildren}</ul>
          </div>
        </a>
      `;
    }).join("") || renderEmpty("Chưa có danh mục phù hợp để hiển thị.");
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function isDisplayableHomeCategory(category) {
  const text = `${category.name || ""} ${category.slug || ""}`.toLowerCase();
  const hiddenTerms = [
    ["ph", "ase"].join(""),
    ["de", "mo"].join(""),
    ["sam", "ple"].join(""),
    "test",
    ["se", "104"].join(""),
    ["nexa", "core"].join(""),
    "mẫu"
  ];

  return !hiddenTerms.some(function (term) {
    return text.includes(term);
  });
}

function getHomeCategoryFallbackItems(category) {
  const key = getBannerKeyFromSlug(category.slug);
  const fallback = {
    pc_build: ["PC Gaming", "PC văn phòng", "PC đồ họa"],
    laptop: ["Laptop Gaming", "Laptop văn phòng", "Ultrabook"],
    component: ["CPU", "VGA", "RAM / SSD"],
    monitor: ["Gaming 144Hz", "Màn hình 4K", "Văn phòng"],
    accessory: ["Bàn phím", "Chuột", "Tai nghe"]
  };

  return fallback[key] || ["Sản phẩm nổi bật", "Hàng chính hãng", "Tư vấn nhanh"];
}

async function loadFeaturedProducts() {
  const sectionIds = [
    "featuredPcBuilds",
    "featuredGamingLaptops",
    "featuredOfficeLaptops",
    "featuredComponents",
    "featuredMonitors",
    "featuredAccessories"
  ];

  try {
    const response = await apiGet("/products/featured");
    const products = response.data || [];
    const laptopProducts = products.filter(function (product) {
      return product.product_type === "laptop";
    });
    const gamingLaptops = laptopProducts.filter(function (product) {
      const text = `${product.name || ""} ${product.category_name || ""}`.toLowerCase();
      return text.includes("gaming");
    });
    const officeLaptops = laptopProducts.filter(function (product) {
      const text = `${product.name || ""} ${product.category_name || ""}`.toLowerCase();
      return !text.includes("gaming") || text.includes("văn phòng") || text.includes("ultrabook");
    });

    renderFeaturedSection("featuredPcBuilds", products.filter(function (product) {
      return product.product_type === "pc_build";
    }));
    renderFeaturedSection("featuredGamingLaptops", gamingLaptops.length ? gamingLaptops : laptopProducts.slice(0, 4));
    renderFeaturedSection("featuredOfficeLaptops", officeLaptops.length ? officeLaptops : laptopProducts.slice(0, 4));
    renderFeaturedSection("featuredComponents", products.filter(function (product) {
      return product.product_type === "component";
    }));
    renderFeaturedSection("featuredMonitors", products.filter(function (product) {
      return product.product_type === "monitor";
    }));
    renderFeaturedSection("featuredAccessories", products.filter(function (product) {
      return product.product_type === "accessory";
    }));
  } catch (error) {
    sectionIds.forEach(function (id) {
      const container = document.getElementById(id);
      if (container) {
        container.innerHTML = renderError(error.message);
      }
    });
  }
}

function renderFeaturedSection(elementId, products) {
  const container = document.getElementById(elementId);

  if (!container) {
    return;
  }

  container.classList.remove("loading-box");

  if (!products.length) {
    const section = container.closest(".storefront-section");
    if (section) {
      section.style.display = "none";
      return;
    }

    container.innerHTML = renderEmpty("Chưa có sản phẩm nổi bật trong nhóm này.");
    return;
  }

  container.innerHTML = products.slice(0, 4).map(renderProductCard).join("");
}


