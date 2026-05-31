let adminUsers = [];
let adminUserPage = 1;
let currentAdminUser = null;

document.addEventListener("DOMContentLoaded", initAdminUsers);

async function initAdminUsers() {
  const user = await requireAdminRole(["admin"]);
  if (!user) return;

  currentAdminUser = user;
  renderAdminLayout("users", user);
  bindAdminUserEvents();
  resetAdminUserForm();
  await loadAdminUsers();
}

function bindAdminUserEvents() {
  document.getElementById("userForm").addEventListener("submit", saveAdminUser);
  document.getElementById("resetUserFormBtn").addEventListener("click", resetAdminUserForm);
  document.getElementById("userPasswordResetForm").addEventListener("submit", submitAdminUserPasswordReset);
  document.getElementById("cancelPasswordResetBtn").addEventListener("click", hidePasswordResetPanel);
  document.getElementById("userFilterForm").addEventListener("submit", function (event) {
    event.preventDefault();
    adminUserPage = 1;
    loadAdminUsers();
  });
  document.getElementById("resetUserFilterBtn").addEventListener("click", resetUserFilters);
}

async function loadAdminUsers() {
  const container = document.getElementById("userTable");
  const query = buildQueryString({
    keyword: document.getElementById("userKeyword").value.trim(),
    role: document.getElementById("userRoleFilter").value,
    status: document.getElementById("userStatusFilter").value,
    page: adminUserPage,
    limit: 12
  });

  container.className = "admin-table-wrap loading-box";
  container.innerHTML = "Đang tải người dùng...";

  try {
    const response = await adminGet(`/admin/users${query ? `?${query}` : ""}`);
    adminUsers = response.data || [];
    container.className = "admin-table-wrap";
    container.innerHTML = renderAdminUserTable(adminUsers);
    renderAdminUserPagination(response.pagination);
    bindAdminUserTableActions();
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function renderAdminUserTable(users) {
  if (!users.length) {
    return renderEmpty("Chưa có người dùng phù hợp.");
  }

  return `
    <table class="admin-table admin-user-table">
      <thead>
        <tr>
          <th>Người dùng</th>
          <th>Email</th>
          <th>Số điện thoại</th>
          <th>Vai trò</th>
          <th>Trạng thái</th>
          <th>Ngày tạo</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(renderAdminUserRow).join("")}
      </tbody>
    </table>
  `;
}

function renderAdminUserRow(user) {
  const isSelf = isCurrentAdminUser(user);
  const nextStatus = user.status === "active" ? "inactive" : "active";

  return `
    <tr>
      <td data-label="Người dùng">
        <strong>${escapeHtml(getAdminPersonDisplayName(user.full_name, "Người dùng AeroTech"))}</strong>
        ${isSelf ? '<p class="table-subtext user-self-label">Tài khoản hiện tại</p>' : ""}
      </td>
      <td data-label="Email">${escapeHtml(user.email || "")}</td>
      <td data-label="Số điện thoại">${escapeHtml(user.phone || "Chưa cập nhật")}</td>
      <td data-label="Vai trò">${escapeHtml(getAdminRoleLabel(user.role))}</td>
      <td data-label="Trạng thái">
        <span class="status-badge ${escapeAttribute(user.status)}">${escapeHtml(getUserStatusLabel(user.status))}</span>
      </td>
      <td data-label="Ngày tạo">${escapeHtml(formatDateTime(user.created_at))}</td>
      <td data-label="Hành động" class="table-actions">
        <button class="btn btn-light js-edit-user" type="button" data-id="${escapeAttribute(user.id)}">Sửa</button>
        ${isSelf ? "" : `<button class="btn ${user.status === "active" ? "btn-danger-outline" : "btn-success-outline"} js-user-status" type="button" data-id="${escapeAttribute(user.id)}" data-status="${escapeAttribute(nextStatus)}">${user.status === "active" ? "Khóa" : "Mở khóa"}</button>`}
        ${isSelf ? "" : `<button class="btn btn-light js-user-password" type="button" data-id="${escapeAttribute(user.id)}">Đặt mật khẩu</button>`}
      </td>
    </tr>
  `;
}

function bindAdminUserTableActions() {
  document.querySelectorAll(".js-edit-user").forEach(function (button) {
    button.addEventListener("click", function () {
      editAdminUser(Number(button.dataset.id));
    });
  });

  document.querySelectorAll(".js-user-status").forEach(function (button) {
    button.addEventListener("click", function () {
      updateAdminUserStatus(Number(button.dataset.id), button.dataset.status);
    });
  });

  document.querySelectorAll(".js-user-password").forEach(function (button) {
    button.addEventListener("click", function () {
      showPasswordResetPanel(Number(button.dataset.id));
    });
  });
}

async function saveAdminUser(event) {
  event.preventDefault();

  const userId = document.getElementById("userId").value;
  const payload = {
    full_name: document.getElementById("userFullName").value.trim(),
    phone: document.getElementById("userPhone").value.trim(),
    role: document.getElementById("userRole").value,
    status: document.getElementById("userStatus").value
  };

  if (!userId) {
    payload.email = document.getElementById("userEmail").value.trim();
    payload.password = document.getElementById("userPassword").value;
  }

  try {
    const response = userId
      ? await adminPut(`/admin/users/${encodeURIComponent(userId)}`, payload)
      : await adminPost("/admin/users", payload);

    showAdminMessage("userFormMessage", "success", response.message || "Đã lưu tài khoản.");
    resetAdminUserForm();
    await loadAdminUsers();
  } catch (error) {
    showAdminMessage("userFormMessage", "error", error.message);
  }
}

function editAdminUser(id) {
  const user = adminUsers.find(function (item) {
    return Number(item.id) === Number(id);
  });

  if (!user) {
    return;
  }

  const isSelf = isCurrentAdminUser(user);

  document.getElementById("userId").value = user.id;
  document.getElementById("userFullName").value = user.full_name || "";
  document.getElementById("userEmail").value = user.email || "";
  document.getElementById("userPhone").value = user.phone || "";
  document.getElementById("userRole").value = user.role;
  document.getElementById("userStatus").value = user.status;
  document.getElementById("userPassword").value = "";
  document.getElementById("userFormTitle").textContent = "Cập nhật tài khoản";
  document.getElementById("userEmail").disabled = true;
  document.getElementById("userEmail").required = false;
  document.getElementById("userPasswordField").hidden = true;
  document.getElementById("userPassword").required = false;
  document.getElementById("currentUserGuardNote").hidden = !isSelf;
  document.getElementById("userRole").disabled = isSelf;
  document.getElementById("userStatus").disabled = isSelf;
  document.getElementById("userFormMessage").innerHTML = "";
  document.querySelector(".admin-user-form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetAdminUserForm() {
  const form = document.getElementById("userForm");

  form.reset();
  document.getElementById("userId").value = "";
  document.getElementById("userFormTitle").textContent = "Tạo tài khoản";
  document.getElementById("userEmail").disabled = false;
  document.getElementById("userEmail").required = true;
  document.getElementById("userPasswordField").hidden = false;
  document.getElementById("userPassword").required = true;
  document.getElementById("userRole").disabled = false;
  document.getElementById("userStatus").disabled = false;
  document.getElementById("userRole").value = "customer";
  document.getElementById("userStatus").value = "active";
  document.getElementById("currentUserGuardNote").hidden = true;
  document.getElementById("userFormMessage").innerHTML = "";
}

function resetUserFilters() {
  document.getElementById("userKeyword").value = "";
  document.getElementById("userRoleFilter").value = "";
  document.getElementById("userStatusFilter").value = "";
  document.getElementById("userListMessage").innerHTML = "";
  adminUserPage = 1;
  loadAdminUsers();
}

async function updateAdminUserStatus(id, status) {
  const user = adminUsers.find(function (item) {
    return Number(item.id) === Number(id);
  });
  const actionLabel = status === "active" ? "mở khóa" : "khóa";

  if (!user || !confirm(`Bạn chắc chắn muốn ${actionLabel} tài khoản ${user.email}?`)) {
    return;
  }

  try {
    const response = await adminPatch(`/admin/users/${encodeURIComponent(id)}/status`, {
      status
    });
    showAdminMessage("userListMessage", "success", response.message || "Đã cập nhật trạng thái.");
    await loadAdminUsers();
  } catch (error) {
    showAdminMessage("userListMessage", "error", error.message);
  }
}

function showPasswordResetPanel(id) {
  const user = adminUsers.find(function (item) {
    return Number(item.id) === Number(id);
  });

  if (!user) {
    return;
  }

  document.getElementById("passwordResetUserId").value = user.id;
  document.getElementById("passwordResetValue").value = "";
  document.getElementById("passwordResetTarget").textContent = `Tài khoản: ${user.full_name || user.email} (${user.email})`;
  document.getElementById("userPasswordResetPanel").hidden = false;
  document.getElementById("passwordResetValue").focus();
  document.querySelector(".user-password-reset-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hidePasswordResetPanel() {
  document.getElementById("passwordResetUserId").value = "";
  document.getElementById("passwordResetValue").value = "";
  document.getElementById("passwordResetTarget").textContent = "Chọn một tài khoản trong danh sách để đặt mật khẩu tạm thời.";
  document.getElementById("userPasswordResetPanel").hidden = true;
}

async function submitAdminUserPasswordReset(event) {
  event.preventDefault();

  const id = document.getElementById("passwordResetUserId").value;
  const password = document.getElementById("passwordResetValue").value;

  if (password.length < 6) {
    showAdminMessage("userFormMessage", "error", "Mật khẩu tạm thời phải có ít nhất 6 ký tự.");
    return;
  }

  try {
    const response = await adminPatch(`/admin/users/${encodeURIComponent(id)}/password`, {
      password
    });
    hidePasswordResetPanel();
    showAdminMessage("userFormMessage", "success", response.message || "Đã đặt mật khẩu tạm thời.");
  } catch (error) {
    showAdminMessage("userFormMessage", "error", error.message);
  }
}

function renderAdminUserPagination(pagination) {
  const container = document.getElementById("userPagination");

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
      adminUserPage = Number(button.dataset.page);
      loadAdminUsers();
    });
  });
}

function isCurrentAdminUser(user) {
  return Boolean(currentAdminUser && user && Number(currentAdminUser.id) === Number(user.id));
}

function getUserStatusLabel(status) {
  const labels = {
    active: "Đang hoạt động",
    inactive: "Đã khóa"
  };

  return labels[status] || status || "";
}
