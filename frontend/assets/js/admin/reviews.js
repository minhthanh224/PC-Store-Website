document.addEventListener("DOMContentLoaded", initAdminReviews);

async function initAdminReviews() {
  const user = await requireAdminRole(["admin"]);
  if (!user) return;
  renderAdminLayout("reviews", user);
  document.getElementById("reviewFilterForm").addEventListener("submit", function (event) { event.preventDefault(); loadAdminReviews(); });
  await loadAdminReviews();
}

async function loadAdminReviews() {
  const status = document.getElementById("reviewStatus").value;
  const response = await adminGet(`/admin/reviews${status ? `?status=${encodeURIComponent(status)}` : ""}`);
  const rows = response.data || [];
  const container = document.getElementById("reviewTable");
  container.className = "admin-table-wrap";
  container.innerHTML = rows.length ? `<table class="admin-table"><thead><tr><th>Sản phẩm</th><th>Khách hàng</th><th>Sao</th><th>Nội dung</th><th>Trạng thái</th><th>Hành động</th></tr></thead><tbody>${rows.map(function (row) { return `<tr><td>${escapeHtml(row.product_name)}<p class="table-subtext">${escapeHtml(row.sku)}</p></td><td>${escapeHtml(row.reviewer_name)}<p class="table-subtext">${escapeHtml(row.reviewer_email)}</p></td><td>${escapeHtml(row.rating)}/5</td><td>${escapeHtml(row.comment || "")}</td><td><span class="status-badge ${escapeAttribute(row.status)}">${escapeHtml(row.status)}</span></td><td><button class="btn btn-primary js-review-status" data-id="${row.id}" data-status="approved" type="button">Duyệt</button><button class="btn btn-outline js-review-status" data-id="${row.id}" data-status="rejected" type="button">Từ chối</button></td></tr>`; }).join("")}</tbody></table>` : renderEmpty("Chưa có đánh giá phù hợp.");
  document.querySelectorAll(".js-review-status").forEach(function (button) { button.addEventListener("click", async function () { try { const result = await adminPatch(`/admin/reviews/${button.dataset.id}/status`, { status: button.dataset.status }); showAdminMessage("reviewMessage", "success", result.message); await loadAdminReviews(); } catch (error) { showAdminMessage("reviewMessage", "error", error.message); } }); });
}
