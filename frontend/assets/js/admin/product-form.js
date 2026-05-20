let editingProductId = null;

document.addEventListener("DOMContentLoaded", initProductForm);

async function initProductForm() {
  const user = await requireAdminRole(["admin"]);
  if (!user) return;

  renderAdminLayout("products", user);
  editingProductId = new URLSearchParams(window.location.search).get("id");
  bindProductFormEvents();
  await loadProductFormOptions();

  if (editingProductId) {
    document.getElementById("productFormTitle").textContent = "Cập nhật sản phẩm";
    await loadProductForEdit(editingProductId);
  } else {
    addImageRow();
    addSpecRow();
  }
}

function bindProductFormEvents() {
  document.getElementById("addImageRowBtn").addEventListener("click", addImageRow);
  document.getElementById("addSpecRowBtn").addEventListener("click", addSpecRow);
  document.getElementById("productForm").addEventListener("submit", saveProduct);
  document.getElementById("imageRows").addEventListener("click", removeDynamicRow);
  document.getElementById("specRows").addEventListener("click", removeDynamicRow);
}

async function loadProductFormOptions() {
  const [categoriesResponse, brandsResponse] = await Promise.all([
    adminGet("/admin/categories"),
    adminGet("/admin/brands")
  ]);

  document.getElementById("productCategory").innerHTML = categoriesResponse.data.map(function (category) {
    const prefix = category.parent_id ? "-- " : "";
    return `<option value="${escapeAttribute(category.id)}">${prefix}${escapeHtml(category.name)}</option>`;
  }).join("");
  document.getElementById("productBrand").innerHTML = `<option value="">Không có thương hiệu</option>${brandsResponse.data.map(function (brand) {
    return `<option value="${escapeAttribute(brand.id)}">${escapeHtml(brand.name)}</option>`;
  }).join("")}`;
}

async function loadProductForEdit(id) {
  const response = await adminGet(`/admin/products/${id}`);
  const product = response.data;

  document.getElementById("productName").value = product.name || "";
  document.getElementById("productSku").value = product.sku || "";
  document.getElementById("productSlug").value = product.slug || "";
  document.getElementById("productCategory").value = product.category_id;
  document.getElementById("productBrand").value = product.brand_id || "";
  document.getElementById("productType").value = product.product_type;
  document.getElementById("productBasePrice").value = product.base_price;
  document.getElementById("productSalePrice").value = product.sale_price || "";
  document.getElementById("productWarranty").value = product.warranty_months;
  document.getElementById("productStock").value = product.stock_quantity;
  document.getElementById("productStatus").value = product.status;
  document.getElementById("productRequiresSerial").checked = product.requires_serial;
  document.getElementById("productFeatured").checked = product.is_featured;
  document.getElementById("productShortDescription").value = product.short_description || "";
  document.getElementById("productDescription").value = product.description || "";

  document.getElementById("imageRows").innerHTML = "";
  document.getElementById("specRows").innerHTML = "";
  (product.images || []).forEach(addImageRow);
  (product.specs || []).forEach(addSpecRow);

  if (!product.images || product.images.length === 0) addImageRow();
  if (!product.specs || product.specs.length === 0) addSpecRow();
}

function addImageRow(image) {
  const container = document.getElementById("imageRows");
  const row = document.createElement("div");
  row.className = "dynamic-row image-row";
  row.innerHTML = `
    <input class="image-url" placeholder="assets/images/products/example.jpg" value="${escapeAttribute((image && image.image_url) || "")}">
    <input class="image-alt" placeholder="Alt text" value="${escapeAttribute((image && image.alt_text) || "")}">
    <input class="image-order" type="number" placeholder="Thứ tự" value="${escapeAttribute((image && image.sort_order) || 0)}">
    <label class="checkbox-row"><input class="image-primary" type="checkbox" ${(image && image.is_primary) ? "checked" : ""}> Chính</label>
    <button class="btn btn-light js-remove-row" type="button">Xóa</button>
  `;
  container.appendChild(row);
}

function addSpecRow(spec) {
  const container = document.getElementById("specRows");
  const row = document.createElement("div");
  row.className = "dynamic-row spec-row";
  row.innerHTML = `
    <input class="spec-group" placeholder="Nhóm" value="${escapeAttribute((spec && spec.spec_group) || "")}">
    <input class="spec-key" placeholder="Tên thông số" value="${escapeAttribute((spec && spec.spec_key) || "")}">
    <input class="spec-value" placeholder="Giá trị" value="${escapeAttribute((spec && spec.spec_value) || "")}">
    <input class="spec-order" type="number" placeholder="Thứ tự" value="${escapeAttribute((spec && spec.sort_order) || 0)}">
    <button class="btn btn-light js-remove-row" type="button">Xóa</button>
  `;
  container.appendChild(row);
}

function removeDynamicRow(event) {
  if (event.target.classList.contains("js-remove-row")) {
    event.target.closest(".dynamic-row").remove();
  }
}

function collectProductPayload() {
  const images = Array.from(document.querySelectorAll(".image-row")).map(function (row) {
    return {
      image_url: row.querySelector(".image-url").value.trim(),
      alt_text: row.querySelector(".image-alt").value.trim(),
      sort_order: Number(row.querySelector(".image-order").value || 0),
      is_primary: row.querySelector(".image-primary").checked
    };
  }).filter(function (image) {
    return image.image_url;
  });
  const specs = Array.from(document.querySelectorAll(".spec-row")).map(function (row) {
    return {
      spec_group: row.querySelector(".spec-group").value.trim(),
      spec_key: row.querySelector(".spec-key").value.trim(),
      spec_value: row.querySelector(".spec-value").value.trim(),
      sort_order: Number(row.querySelector(".spec-order").value || 0)
    };
  }).filter(function (spec) {
    return spec.spec_key && spec.spec_value;
  });

  return {
    name: document.getElementById("productName").value.trim(),
    sku: document.getElementById("productSku").value.trim(),
    slug: document.getElementById("productSlug").value.trim(),
    category_id: Number(document.getElementById("productCategory").value),
    brand_id: document.getElementById("productBrand").value ? Number(document.getElementById("productBrand").value) : null,
    product_type: document.getElementById("productType").value,
    base_price: Number(document.getElementById("productBasePrice").value || 0),
    sale_price: document.getElementById("productSalePrice").value ? Number(document.getElementById("productSalePrice").value) : null,
    warranty_months: Number(document.getElementById("productWarranty").value || 0),
    requires_serial: document.getElementById("productRequiresSerial").checked,
    stock_quantity: Number(document.getElementById("productStock").value || 0),
    is_featured: document.getElementById("productFeatured").checked,
    status: document.getElementById("productStatus").value,
    short_description: document.getElementById("productShortDescription").value.trim(),
    description: document.getElementById("productDescription").value.trim(),
    images,
    specs
  };
}

async function saveProduct(event) {
  event.preventDefault();
  showAdminMessage("productFormMessage", "success", "Đang lưu sản phẩm...");

  try {
    const payload = collectProductPayload();
    if (editingProductId) {
      await adminPut(`/admin/products/${editingProductId}`, payload);
    } else {
      const response = await adminPost("/admin/products", payload);
      editingProductId = response.data.id;
      window.history.replaceState({}, "", `product-form.html?id=${editingProductId}`);
    }
    showAdminMessage("productFormMessage", "success", "Lưu sản phẩm thành công.");
  } catch (error) {
    showAdminMessage("productFormMessage", "error", error.message);
  }
}


