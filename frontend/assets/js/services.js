document.addEventListener("DOMContentLoaded", initServicesPage);

async function initServicesPage() {
  await loadSiteLayout();
  await loadServices();
}

async function loadServices() {
  const grid = document.getElementById("serviceGrid");

  grid.className = "service-grid loading-box";
  grid.innerHTML = "Đang tải dịch vụ...";

  try {
    const response = await apiGet("/products?productType=service&limit=48&sort=name_asc");
    const services = response.data || [];

    grid.className = "service-grid";

    if (!services.length) {
      grid.innerHTML = renderEmpty("AeroTech đang cập nhật danh sách dịch vụ.");
      return;
    }

    grid.innerHTML = services.map(renderServiceCard).join("");
  } catch (error) {
    grid.className = "service-grid";
    grid.innerHTML = renderError(error.message || "Không thể tải danh sách dịch vụ.");
  }
}

function renderServiceCard(service) {
  const detailsUrl = `product-detail.html?slug=${encodeURIComponent(service.slug)}`;
  const imageFallback = getProductImageFallback(service);
  const servicePrice = getEffectivePrice(service);
  const canOrder = servicePrice > 0 && Number(service.available_stock || 0) > 0;
  const cartPayload = escapeAttribute(JSON.stringify(getCartProductPayload(service)));
  const specs = (service.short_specs || []).slice(0, 3);
  const features = specs.length ? specs : [
    "Tư vấn bởi kỹ thuật viên",
    "Tiếp nhận tại showroom hoặc online"
  ];

  return `
    <article class="service-card">
      <a class="service-card-image" href="${detailsUrl}" aria-label="${escapeAttribute(service.name)}">
        <img
          src="${escapeAttribute(getImageUrl(service.primary_image, service))}"
          alt="${escapeAttribute(service.name)}"
          onerror="this.onerror=null;this.src='${escapeAttribute(imageFallback)}'"
        >
      </a>
      <div class="service-card-body">
        <div class="service-card-meta">
          <span>${escapeHtml(service.category_name || "Dịch vụ kỹ thuật")}</span>
          <span>${canOrder ? "Có thể đặt dịch vụ" : "Tư vấn trước"}</span>
        </div>
        <h2><a href="${detailsUrl}">${escapeHtml(service.name)}</a></h2>
        <p>${escapeHtml(service.short_description || "Dịch vụ kỹ thuật được AeroTech tư vấn theo nhu cầu thực tế.")}</p>
        <ul class="service-feature-list">
          ${features.map(function (item) {
            return `<li>${escapeHtml(item)}</li>`;
          }).join("")}
        </ul>
        <div class="service-card-footer">
          <strong>${servicePrice > 0 ? formatCurrency(servicePrice) : "Liên hệ tư vấn"}</strong>
          <span>${canOrder ? "Đặt online được" : "Cần xác nhận nhu cầu"}</span>
        </div>
        <div class="service-actions">
          <a class="btn btn-outline" href="${detailsUrl}">Chi tiết</a>
          ${canOrder ? `
            <button
              class="btn btn-primary js-add-cart"
              type="button"
              data-product="${cartPayload}"
            >Đặt dịch vụ</button>
          ` : '<a class="btn btn-primary" href="contact.html">Liên hệ tư vấn</a>'}
        </div>
      </div>
    </article>
  `;
}
