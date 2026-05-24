let adminBrands = [];

document.addEventListener("DOMContentLoaded", initBrands);

async function initBrands() {
  const user = await requireAdminRole(["admin"]);
  if (!user) return;

  renderAdminLayout("brands", user);
  document.getElementById("brandForm").addEventListener("submit", saveBrand);
  document.getElementById("resetBrandFormBtn").addEventListener("click", resetBrandForm);
  await loadBrands();
}

async function loadBrands() {
  const container = document.getElementById("brandTable");

  try {
    const response = await adminGet("/admin/brands");
    adminBrands = response.data || [];
    container.className = "admin-table-wrap";
    container.innerHTML = renderBrandTable(adminBrands);
    bindBrandActions();
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function renderBrandTable(brands) {
  return `
    <table class="admin-table">
      <thead><tr><th>ID</th><th>Tên</th><th>Slug</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>
        ${brands.map(function (brand) {
          return `
            <tr>
              <td>${escapeHtml(brand.id)}</td>
              <td>${escapeHtml(brand.name)}</td>
              <td>${escapeHtml(brand.slug)}</td>
              <td><span class="status-badge ${escapeAttribute(brand.status)}">${escapeHtml(getCatalogStatusLabel(brand.status))}</span></td>
              <td class="table-actions">
                <button class="btn btn-outline js-edit-brand" type="button" data-id="${escapeAttribute(brand.id)}">Sửa</button>
                <button class="btn ${brand.status === "active" ? "btn-danger-outline" : "btn-success-outline"} js-toggle-brand" type="button" data-id="${escapeAttribute(brand.id)}" data-status="${brand.status === "active" ? "inactive" : "active"}">${brand.status === "active" ? "Ngừng" : "Kích hoạt"}</button>
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function bindBrandActions() {
  document.querySelectorAll(".js-edit-brand").forEach(function (button) {
    button.addEventListener("click", function () {
      const brand = adminBrands.find(function (item) {
        return Number(item.id) === Number(button.dataset.id);
      });
      if (!brand) return;
      document.getElementById("brandId").value = brand.id;
      document.getElementById("brandName").value = brand.name;
      document.getElementById("brandSlug").value = brand.slug;
      document.getElementById("brandDescription").value = brand.description || "";
      document.getElementById("brandStatus").value = brand.status;
      showAdminMessage("brandMessage", "success", `Đang chỉnh sửa: ${brand.name}`);
    });
  });

  document.querySelectorAll(".js-toggle-brand").forEach(function (button) {
    button.addEventListener("click", async function () {
      try {
        await adminPatch(`/admin/brands/${button.dataset.id}/status`, { status: button.dataset.status });
        await loadBrands();
      } catch (error) {
        showAdminMessage("brandMessage", "error", error.message);
      }
    });
  });
}

async function saveBrand(event) {
  event.preventDefault();
  const id = document.getElementById("brandId").value;
  const payload = {
    name: document.getElementById("brandName").value.trim(),
    slug: document.getElementById("brandSlug").value.trim(),
    description: document.getElementById("brandDescription").value.trim(),
    status: document.getElementById("brandStatus").value
  };

  try {
    if (id) {
      await adminPut(`/admin/brands/${id}`, payload);
    } else {
      await adminPost("/admin/brands", payload);
    }
    resetBrandForm();
    showAdminMessage("brandMessage", "success", "Lưu thương hiệu thành công.");
    await loadBrands();
  } catch (error) {
    showAdminMessage("brandMessage", "error", error.message);
  }
}

function resetBrandForm() {
  document.getElementById("brandForm").reset();
  document.getElementById("brandId").value = "";
  document.getElementById("brandMessage").innerHTML = "";
}


