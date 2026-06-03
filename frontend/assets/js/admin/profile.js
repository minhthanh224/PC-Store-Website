document.addEventListener("DOMContentLoaded", initStaffProfile);

async function initStaffProfile() {
  const user = await requireAdminRole(["admin", "sales", "technician"]);

  if (!user) {
    return;
  }

  renderAdminLayout("profile", user);
  renderStaffProfile(user);
}

function renderStaffProfile(user) {
  const container = document.getElementById("staffProfileContent");

  if (!container) {
    return;
  }

  const displayName = getAdminDisplayName(user);
  const roleLabel = getAdminRoleLabel(user.role);
  const statusLabel = getStaffProfileStatusLabel(user.status);
  const createdAt = user.created_at ? formatDateTime(user.created_at) : "Chưa có dữ liệu";
  const phone = user.phone ? user.phone : "Chưa cập nhật";

  container.className = "staff-profile-layout";
  container.innerHTML = `
    <section class="admin-panel staff-profile-card staff-profile-identity-card">
      <div class="staff-profile-identity">
        <span class="staff-profile-avatar" aria-hidden="true">${escapeHtml(getAdminAvatarInitial(displayName))}</span>
        <div>
          <p class="eyebrow">Tài khoản nội bộ</p>
          <h2>${escapeHtml(displayName)}</h2>
          <p>${escapeHtml(user.email || "Chưa có email")}</p>
          <span class="admin-role-badge">${escapeHtml(roleLabel)}</span>
        </div>
      </div>
      <div class="staff-profile-actions">
        <a class="btn btn-primary" href="dashboard.html">Về dashboard</a>
        <a class="btn btn-light" href="../index.html">Về storefront</a>
      </div>
    </section>

    <section class="admin-panel staff-profile-card">
      <div class="admin-section-heading-inline">
        <div>
          <h2>Thông tin tài khoản</h2>
          <p>Thông tin này chỉ dùng để nhận diện nhân sự và phân quyền trong hệ thống.</p>
        </div>
      </div>
      <dl class="staff-profile-detail-grid">
        ${renderStaffProfileRow("Họ tên", displayName)}
        ${renderStaffProfileRow("Email", user.email || "Chưa có email")}
        ${renderStaffProfileRow("Số điện thoại", phone)}
        ${renderStaffProfileRow("Vai trò", roleLabel)}
        ${renderStaffProfileRow("Trạng thái", statusLabel)}
        ${renderStaffProfileRow("Ngày tạo", createdAt)}
      </dl>
    </section>

    <section class="admin-panel staff-profile-card">
      <div class="admin-section-heading-inline">
        <div>
          <h2>Phạm vi quyền truy cập</h2>
          <p>Quyền thao tác được kiểm soát bởi role hiện tại, không chỉnh sửa trực tiếp tại trang này.</p>
        </div>
      </div>
      <ul class="staff-profile-access-list">
        ${getStaffProfileAccessItems(user.role).map(function (item) {
          return `<li>${escapeHtml(item)}</li>`;
        }).join("")}
      </ul>
    </section>

    <section class="admin-panel staff-profile-card staff-profile-note">
      <strong>Lưu ý bảo mật</strong>
      <p>Trang này không hiển thị mật khẩu, token hoặc hash. Việc đổi vai trò, trạng thái tài khoản và reset mật khẩu chỉ thực hiện ở khu vực quản trị người dùng dành cho admin.</p>
    </section>
  `;
}

function renderStaffProfileRow(label, value) {
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `;
}

function getStaffProfileStatusLabel(status) {
  const labels = {
    active: "Đang hoạt động",
    inactive: "Đã khóa"
  };

  return labels[status] || status || "Chưa có dữ liệu";
}

function getStaffProfileAccessItems(role) {
  const items = {
    admin: [
      "Quản trị hệ thống và tài khoản người dùng.",
      "Quản lý catalog, import sản phẩm, thương hiệu và danh mục.",
      "Theo dõi đơn hàng, kho serial, bảo hành, đánh giá và báo cáo.",
      "Truy cập dashboard và toàn bộ khu vực AeroTech Admin."
    ],
    sales: [
      "Xem và xử lý đơn hàng.",
      "Duyệt đơn, cập nhật trạng thái và theo dõi gán serial.",
      "Tra cứu thông tin khách hàng trong phạm vi đơn hàng.",
      "Không truy cập quản lý catalog hoặc báo cáo admin-only."
    ],
    technician: [
      "Quản lý kho serial và thêm serial cho sản phẩm.",
      "Tạo, cập nhật và tra cứu phiếu bảo hành.",
      "Theo dõi cảnh báo tồn kho thấp liên quan kỹ thuật.",
      "Không truy cập báo cáo hoặc quản lý catalog admin-only."
    ]
  };

  return items[role] || ["Tài khoản có quyền truy cập theo cấu hình hệ thống."];
}
