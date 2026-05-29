let adminCategories = [];

document.addEventListener("DOMContentLoaded", initCategories);

async function initCategories() {
  const user = await requireAdminRole(["admin"]);
  if (!user) return;

  renderAdminLayout("categories", user);
  document.getElementById("categoryForm").addEventListener("submit", saveCategory);
  document.getElementById("categoryFilterForm").addEventListener("submit", function (event) {
    event.preventDefault();
    renderFilteredCategories();
  });
  document.getElementById("refreshCategoriesBtn").addEventListener("click", refreshCategoryList);
  document.getElementById("resetCategoryFormBtn").addEventListener("click", resetCategoryForm);
  await loadCategories();
}

async function loadCategories() {
  const container = document.getElementById("categoryTable");

  try {
    const response = await adminGet("/admin/categories");
    adminCategories = response.data || [];
    renderCategoryParentOptions();
    container.className = "admin-table-wrap";
    container.innerHTML = renderCategoryTable(getFilteredCategories());
    bindCategoryActions();
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function getFilteredCategories() {
  const keyword = document.getElementById("categoryKeyword").value.trim().toLowerCase();
  const status = document.getElementById("categoryFilterStatus").value;

  return adminCategories.filter(function (category) {
    const keywordMatched = !keyword
      || String(category.name || "").toLowerCase().includes(keyword)
      || String(category.slug || "").toLowerCase().includes(keyword);
    const statusMatched = !status || category.status === status;

    return keywordMatched && statusMatched;
  });
}

function renderFilteredCategories() {
  const container = document.getElementById("categoryTable");
  container.className = "admin-table-wrap";
  container.innerHTML = renderCategoryTable(getFilteredCategories());
  bindCategoryActions();
}

async function refreshCategoryList() {
  document.getElementById("categoryKeyword").value = "";
  document.getElementById("categoryFilterStatus").value = "";
  await loadCategories();
}

function renderCategoryParentOptions() {
  document.getElementById("categoryParent").innerHTML = `<option value="">Không có danh mục cha</option>${adminCategories.map(function (category) {
    return `<option value="${escapeAttribute(category.id)}">${escapeHtml(category.name)}</option>`;
  }).join("")}`;
}

function getParentName(parentId) {
  const parent = adminCategories.find(function (category) {
    return Number(category.id) === Number(parentId);
  });
  return parent ? parent.name : "";
}

function renderCategoryTable(categories) {
  if (!categories.length) {
    return renderEmpty("Chưa có danh mục phù hợp.");
  }

  return `
    <table class="admin-table">
      <thead><tr><th>ID</th><th>Tên</th><th>Cha</th><th>Slug</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>
        ${categories.map(function (category) {
          return `
            <tr>
              <td>${escapeHtml(category.id)}</td>
              <td>${escapeHtml(category.name)}</td>
              <td>${escapeHtml(getParentName(category.parent_id) || "—")}</td>
              <td>${escapeHtml(category.slug)}</td>
              <td><span class="status-badge ${escapeAttribute(category.status)}">${escapeHtml(getCatalogStatusLabel(category.status))}</span></td>
              <td class="table-actions">
                <button class="btn btn-outline js-edit-category" type="button" data-id="${escapeAttribute(category.id)}">Sửa</button>
                <button class="btn ${category.status === "active" ? "btn-danger-outline" : "btn-success-outline"} js-toggle-category" type="button" data-id="${escapeAttribute(category.id)}" data-status="${category.status === "active" ? "inactive" : "active"}">${category.status === "active" ? "Ngừng" : "Kích hoạt"}</button>
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function bindCategoryActions() {
  document.querySelectorAll(".js-edit-category").forEach(function (button) {
    button.addEventListener("click", function () {
      const category = adminCategories.find(function (item) {
        return Number(item.id) === Number(button.dataset.id);
      });
      if (!category) return;
      document.getElementById("categoryId").value = category.id;
      document.getElementById("categoryParent").value = category.parent_id || "";
      document.getElementById("categoryName").value = category.name;
      document.getElementById("categorySlug").value = category.slug;
      document.getElementById("categoryDescription").value = category.description || "";
      document.getElementById("categoryStatus").value = category.status;
      showAdminMessage("categoryMessage", "success", `Đang chỉnh sửa: ${category.name}`);
    });
  });

  document.querySelectorAll(".js-toggle-category").forEach(function (button) {
    button.addEventListener("click", async function () {
      try {
        await adminPatch(`/admin/categories/${button.dataset.id}/status`, { status: button.dataset.status });
        await loadCategories();
      } catch (error) {
        showAdminMessage("categoryMessage", "error", error.message);
      }
    });
  });
}

async function saveCategory(event) {
  event.preventDefault();
  const id = document.getElementById("categoryId").value;
  const payload = {
    parent_id: document.getElementById("categoryParent").value ? Number(document.getElementById("categoryParent").value) : null,
    name: document.getElementById("categoryName").value.trim(),
    slug: document.getElementById("categorySlug").value.trim(),
    description: document.getElementById("categoryDescription").value.trim(),
    status: document.getElementById("categoryStatus").value
  };

  try {
    if (id) {
      await adminPut(`/admin/categories/${id}`, payload);
    } else {
      await adminPost("/admin/categories", payload);
    }
    resetCategoryForm();
    showAdminMessage("categoryMessage", "success", "Lưu danh mục thành công.");
    await loadCategories();
  } catch (error) {
    showAdminMessage("categoryMessage", "error", error.message);
  }
}

function resetCategoryForm() {
  document.getElementById("categoryForm").reset();
  document.getElementById("categoryId").value = "";
  document.getElementById("categoryMessage").innerHTML = "";
}


