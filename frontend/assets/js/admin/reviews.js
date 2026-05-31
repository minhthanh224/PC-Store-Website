let adminReviewPage = 1;

document.addEventListener("DOMContentLoaded", initAdminReviews);

async function initAdminReviews() {
  const user = await requireAdminRole(["admin"]);
  if (!user) return;

  renderAdminLayout("reviews", user);
  document.getElementById("reviewFilterForm").addEventListener("submit", function (event) {
    event.preventDefault();
    adminReviewPage = 1;
    loadAdminReviews();
  });
  document.getElementById("resetReviewFilterBtn").addEventListener("click", resetReviewFilters);
  await loadAdminReviews();
}

async function loadAdminReviews() {
  const container = document.getElementById("reviewTable");
  const query = buildQueryString({
    status: document.getElementById("reviewStatusFilter").value,
    search: document.getElementById("reviewSearchInput").value.trim(),
    page: adminReviewPage,
    limit: 12
  });

  container.className = "admin-table-wrap loading-box";
  container.innerHTML = "Đang tải đánh giá...";

  try {
    const response = await adminGet(`/admin/reviews?${query}`);
    container.className = "admin-table-wrap";
    container.innerHTML = renderReviewTable(response.data || []);
    renderReviewPagination(response.pagination);
    bindReviewActions();
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function resetReviewFilters() {
  document.getElementById("reviewStatusFilter").value = "approved";
  document.getElementById("reviewSearchInput").value = "";
  document.getElementById("reviewMessage").innerHTML = "";
  adminReviewPage = 1;
  loadAdminReviews();
}

function renderReviewTable(reviews) {
  if (!reviews.length) {
    return renderEmpty("Chưa có đánh giá phù hợp.");
  }

  return `
    <table class="admin-table admin-review-table">
      <thead>
        <tr>
          <th>Sản phẩm</th>
          <th>Khách hàng</th>
          <th>Rating</th>
          <th>Nội dung</th>
          <th>Trạng thái</th>
          <th>Ngày tạo</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        ${reviews.map(renderReviewRow).join("")}
      </tbody>
    </table>
  `;
}

function renderReviewRow(review) {
  const customerName = getAdminPersonDisplayName(review.customer_name, "Khách hàng");
  const customerEmail = review.customer_email || "";

  return `
    <tr>
      <td data-label="Sản phẩm">
        <strong>${escapeHtml(getAdminRecordDisplayText(review.product_name, "Sản phẩm AeroTech"))}</strong>
        <p class="table-subtext">${escapeHtml(review.product_sku || "")}</p>
      </td>
      <td data-label="Khách hàng">
        <strong>${escapeHtml(customerName)}</strong>
        <p class="table-subtext">${escapeHtml(customerEmail)}</p>
      </td>
      <td data-label="Rating" class="review-rating-cell">${renderReviewStars(review.rating)}</td>
      <td data-label="Nội dung" class="review-comment-cell">${escapeHtml(review.comment || "Không có nội dung.")}</td>
      <td data-label="Trạng thái"><span class="status-badge ${escapeAttribute(review.status)}">${escapeHtml(getReviewStatusLabel(review.status))}</span></td>
      <td data-label="Ngày tạo">${escapeHtml(formatDateTime(review.created_at))}</td>
      <td data-label="Hành động" class="table-actions">
        ${renderReviewActions(review)}
      </td>
    </tr>
  `;
}

function renderReviewActions(review) {
  if (review.status === "approved") {
    return `<button class="btn btn-danger-outline js-review-status" type="button" data-id="${escapeAttribute(review.id)}" data-status="rejected">Ẩn đánh giá</button>`;
  }

  return `<button class="btn btn-success-outline js-review-status" type="button" data-id="${escapeAttribute(review.id)}" data-status="approved">Hiện lại</button>`;
}

function bindReviewActions() {
  document.querySelectorAll(".js-review-status").forEach(function (button) {
    button.addEventListener("click", async function () {
      const status = button.dataset.status;
      const message = status === "approved"
        ? "Hiện lại đánh giá này?"
        : "Ẩn đánh giá này khỏi storefront?";

      if (!confirm(message)) {
        return;
      }

      try {
        const response = await adminPatch(`/admin/reviews/${encodeURIComponent(button.dataset.id)}/status`, {
          status
        });
        showAdminMessage("reviewMessage", "success", response.message || "Đã cập nhật đánh giá.");
        await loadAdminReviews();
      } catch (error) {
        showAdminMessage("reviewMessage", "error", error.message);
      }
    });
  });
}

function renderReviewPagination(pagination) {
  const container = document.getElementById("reviewPagination");

  if (!pagination || pagination.totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  const buttons = [];
  for (let page = 1; page <= pagination.totalPages; page += 1) {
    buttons.push(`<button class="page-button ${page === pagination.page ? "active" : ""}" type="button" data-page="${page}">${page}</button>`);
  }

  container.innerHTML = buttons.join("");
  container.querySelectorAll("button").forEach(function (button) {
    button.addEventListener("click", function () {
      adminReviewPage = Number(button.dataset.page);
      loadAdminReviews();
    });
  });
}

function renderReviewStars(rating) {
  const value = Math.max(Math.min(Number(rating) || 0, 5), 0);
  return `<span aria-label="${escapeAttribute(value)} sao">${"★".repeat(value)}${"☆".repeat(5 - value)}</span>`;
}

function getReviewStatusLabel(status) {
  const labels = {
    approved: "Đang hiển thị",
    rejected: "Đã ẩn"
  };

  return labels[status] || "Đang hiển thị";
}
