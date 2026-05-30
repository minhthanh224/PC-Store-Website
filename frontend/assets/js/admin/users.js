let adminUsers = [];
document.addEventListener("DOMContentLoaded", initAdminUsers);

async function initAdminUsers() {
  const user = await requireAdminRole(["admin"]);
  if (!user) return;
  renderAdminLayout("users", user);
  document.getElementById("userForm").addEventListener("submit", saveAdminUser);
  document.getElementById("userFilterForm").addEventListener("submit", function (event) { event.preventDefault(); loadAdminUsers(); });
  document.getElementById("resetUserForm").addEventListener("click", resetAdminUserForm);
  await loadAdminUsers();
}

async function loadAdminUsers() {
  const query = buildQueryString({ keyword: document.getElementById("userKeyword").value.trim(), role: document.getElementById("userRoleFilter").value, status: document.getElementById("userStatusFilter").value });
  const response = await adminGet(`/admin/users${query ? `?${query}` : ""}`);
  adminUsers = response.data || [];
  document.getElementById("userTable").className = "admin-table-wrap";
  document.getElementById("userTable").innerHTML = adminUsers.length ? `<table class="admin-table"><thead><tr><th>Họ tên</th><th>Email</th><th>Số điện thoại</th><th>Vai trò</th><th>Trạng thái</th><th>Hành động</th></tr></thead><tbody>${adminUsers.map(function (item) { return `<tr><td>${escapeHtml(item.full_name)}</td><td>${escapeHtml(item.email)}</td><td>${escapeHtml(item.phone || "")}</td><td>${escapeHtml(getAdminRoleLabel(item.role))}</td><td><span class="status-badge ${escapeAttribute(item.status)}">${item.status === "active" ? "Hoạt động" : "Đã khóa"}</span></td><td><button class="btn btn-light js-edit-user" type="button" data-id="${item.id}">Sửa</button></td></tr>`; }).join("")}</tbody></table>` : renderEmpty("Chưa có tài khoản phù hợp.");
  document.querySelectorAll(".js-edit-user").forEach(function (button) { button.addEventListener("click", function () { editAdminUser(Number(button.dataset.id)); }); });
}

async function saveAdminUser(event) {
  event.preventDefault();
  const id = document.getElementById("userId").value;
  const payload = { full_name: document.getElementById("userFullName").value.trim(), email: document.getElementById("userEmail").value.trim(), phone: document.getElementById("userPhone").value.trim(), password: document.getElementById("userPassword").value, role: document.getElementById("userRole").value, status: document.getElementById("userStatus").value };
  try {
    const response = id ? await adminPut(`/admin/users/${id}`, payload) : await adminPost("/admin/users", payload);
    showAdminMessage("userMessage", "success", response.message);
    resetAdminUserForm();
    await loadAdminUsers();
  } catch (error) { showAdminMessage("userMessage", "error", error.message); }
}

function editAdminUser(id) {
  const user = adminUsers.find(function (item) { return item.id === id; });
  if (!user) return;
  document.getElementById("userId").value = user.id; document.getElementById("userFullName").value = user.full_name; document.getElementById("userEmail").value = user.email; document.getElementById("userPhone").value = user.phone || ""; document.getElementById("userPassword").value = ""; document.getElementById("userRole").value = user.role; document.getElementById("userStatus").value = user.status; document.getElementById("userFormTitle").textContent = "Cập nhật tài khoản";
}

function resetAdminUserForm() { document.getElementById("userForm").reset(); document.getElementById("userId").value = ""; document.getElementById("userFormTitle").textContent = "Tạo tài khoản"; }
