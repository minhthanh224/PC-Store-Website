document.addEventListener("DOMContentLoaded", function () {
  initHomePage();
});

const HOME_HERO_AUTOPLAY_MS = 5200;
const HOME_HERO_SLIDES = [
  {
    badge: "AEROTECH RETAIL PRO",
    title: "Nâng cấp góc làm việc và chiến game của bạn",
    description: "PC build, laptop, màn hình và phụ kiện công nghệ được tuyển chọn cho học tập, làm việc, gaming và sáng tạo nội dung.",
    image: "/assets/images/hero/hero-main.webp",
    primaryCta: {
      label: "Xem PC Build",
      href: "products.html?productType=pc_build"
    },
    secondaryCta: {
      label: "Khám phá sản phẩm",
      href: "products.html"
    }
  },
  {
    badge: "NEW ARRIVAL",
    title: "Dòng laptop mới cho học tập và di chuyển",
    description: "Thiết kế gọn nhẹ, pin tốt, cấu hình ổn định cho sinh viên và dân văn phòng.",
    image: "/assets/images/hero/hero-ultrabook.webp",
    primaryCta: {
      label: "Xem Laptop",
      href: "products.html?productType=laptop"
    },
    secondaryCta: {
      label: "Tìm hiểu thêm",
      href: "products.html?productType=laptop&category=ultrabook"
    }
  },
  {
    badge: "MEGA SALE",
    title: "Săn ưu đãi thiết bị gaming và phụ kiện",
    description: "Giảm giá cho gaming gear, màn hình và linh kiện trong thời gian giới hạn.",
    image: "/assets/images/hero/hero-accessories.webp",
    primaryCta: {
      label: "Xem khuyến mãi",
      href: "products.html?productType=accessory"
    },
    secondaryCta: {
      label: "Mua ngay",
      href: "products.html"
    }
  },
  {
    badge: "CUSTOM BUILD",
    title: "Build PC theo nhu cầu của bạn",
    description: "Từ gaming, học tập đến workstation, AeroTech hỗ trợ tư vấn cấu hình phù hợp.",
    image: "/assets/images/banners/banner-pc-build.webp",
    primaryCta: {
      label: "Xem dịch vụ",
      href: "products.html?productType=service"
    },
    secondaryCta: {
      label: "Liên hệ tư vấn",
      href: "contact.html"
    }
  }
];

async function initHomePage() {
  await loadSiteLayout();
  initHomeHeroCarousel();
  await Promise.all([
    loadHomeCategories(),
    loadFeaturedProducts()
  ]);
}

function initHomeHeroCarousel() {
  const carousel = document.getElementById("homeHeroCarousel");
  const slidesTrack = document.getElementById("homeHeroSlides");
  const dotsContainer = document.getElementById("homeHeroDots");

  if (!carousel || !slidesTrack || !dotsContainer || !HOME_HERO_SLIDES.length) {
    return;
  }

  let activeIndex = 0;
  let autoplayTimer = null;
  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  slidesTrack.innerHTML = HOME_HERO_SLIDES.map(function (slide, index) {
    return renderHeroSlide(slide, index);
  }).join("");

  dotsContainer.innerHTML = HOME_HERO_SLIDES.map(function (_, index) {
    return `
      <button
        class="hero-carousel-dot"
        type="button"
        aria-label="Chuyển đến slide ${index + 1}"
        data-slide-index="${index}"
      ></button>
    `;
  }).join("");

  const prevButton = carousel.querySelector(".hero-carousel-prev");
  const nextButton = carousel.querySelector(".hero-carousel-next");
  const dotButtons = Array.from(dotsContainer.querySelectorAll(".hero-carousel-dot"));

  function setActiveSlide(nextIndex) {
    activeIndex = (nextIndex + HOME_HERO_SLIDES.length) % HOME_HERO_SLIDES.length;
    slidesTrack.style.transform = `translateX(-${activeIndex * 100}%)`;

    dotButtons.forEach(function (button, index) {
      const isActive = index === activeIndex;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-current", isActive ? "true" : "false");
    });
  }

  function startAutoplay() {
    if (prefersReducedMotion || HOME_HERO_SLIDES.length < 2) {
      return;
    }

    stopAutoplay();
    autoplayTimer = window.setInterval(function () {
      setActiveSlide(activeIndex + 1);
    }, HOME_HERO_AUTOPLAY_MS);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function restartAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  if (prevButton) {
    prevButton.addEventListener("click", function () {
      setActiveSlide(activeIndex - 1);
      restartAutoplay();
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", function () {
      setActiveSlide(activeIndex + 1);
      restartAutoplay();
    });
  }

  dotButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setActiveSlide(Number(button.dataset.slideIndex || 0));
      restartAutoplay();
    });
  });

  carousel.addEventListener("mouseenter", stopAutoplay);
  carousel.addEventListener("mouseleave", startAutoplay);
  carousel.addEventListener("focusin", stopAutoplay);
  carousel.addEventListener("focusout", startAutoplay);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  });

  setActiveSlide(0);
  startAutoplay();
}

function renderHeroSlide(slide, index) {
  const secondaryCta = slide.secondaryCta ? `
    <a class="btn btn-secondary" href="${escapeAttribute(slide.secondaryCta.href)}">${escapeHtml(slide.secondaryCta.label)}</a>
  ` : "";

  return `
    <section class="hero-carousel-slide" aria-label="${escapeAttribute(slide.title)}" aria-roledescription="slide" data-slide="${index + 1}">
      <div class="hero-carousel-bg" style="background-image: url('${escapeAttribute(slide.image)}')"></div>
      <div class="hero-carousel-content image-card-content">
        <p class="eyebrow">${escapeHtml(slide.badge)}</p>
        <h1>${escapeHtml(slide.title)}</h1>
        <p>${escapeHtml(slide.description)}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="${escapeAttribute(slide.primaryCta.href)}">${escapeHtml(slide.primaryCta.label)}</a>
          ${secondaryCta}
        </div>
      </div>
    </section>
  `;
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
    ["m", "ẫu"].join("")
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


