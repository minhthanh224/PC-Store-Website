const adminUserService = require("../services/adminUser.service");
const { logAuditEvent } = require("../services/adminAudit.service");

function getUserLabel(user) {
  return user ? `${user.full_name || user.email} <${user.email}>` : "Người dùng";
}

function getChangedFields(previous, user) {
  const fields = {};

  ["full_name", "phone", "role", "status"].forEach(function (key) {
    if ((previous && previous[key]) !== (user && user[key])) {
      fields[key] = {
        old: previous ? previous[key] : null,
        new: user ? user[key] : null
      };
    }
  });

  return fields;
}

async function getUsers(req, res) {
  const result = await adminUserService.getUsers(req.query);

  res.json({
    success: true,
    data: result.users,
    pagination: result.pagination
  });
}

async function createUser(req, res) {
  const result = await adminUserService.createUser(req.body);

  await logAuditEvent(req, {
    action_type: "user_created",
    entity_type: "user",
    entity_id: result.user.id,
    entity_label: getUserLabel(result.user),
    message: `Tạo tài khoản ${result.user.email}.`,
    metadata: {
      target_user_id: result.user.id,
      target_email: result.user.email,
      role: result.user.role,
      status: result.user.status
    }
  });

  res.status(201).json({
    success: true,
    message: "Tạo tài khoản thành công.",
    data: result.user
  });
}

async function updateUser(req, res) {
  const result = await adminUserService.updateUser(req.params.id, req.body, req.user);
  const changedFields = getChangedFields(result.previous, result.user);
  const statusChanged = Boolean(changedFields.status);

  await logAuditEvent(req, {
    action_type: statusChanged ? "user_status_changed" : "user_updated",
    entity_type: "user",
    entity_id: result.user.id,
    entity_label: getUserLabel(result.user),
    message: `Cập nhật tài khoản ${result.user.email}.`,
    metadata: {
      target_user_id: result.user.id,
      target_email: result.user.email,
      changes: changedFields,
      old_role: result.previous.role,
      new_role: result.user.role,
      old_status: result.previous.status,
      new_status: result.user.status
    }
  });

  res.json({
    success: true,
    message: "Cập nhật tài khoản thành công.",
    data: result.user
  });
}

async function updateUserStatus(req, res) {
  const result = await adminUserService.updateUserStatus(req.params.id, req.body.status, req.user);

  await logAuditEvent(req, {
    action_type: "user_status_changed",
    entity_type: "user",
    entity_id: result.user.id,
    entity_label: getUserLabel(result.user),
    message: `${result.user.status === "active" ? "Mở khóa" : "Khóa"} tài khoản ${result.user.email}.`,
    metadata: {
      target_user_id: result.user.id,
      target_email: result.user.email,
      old_status: result.previous.status,
      new_status: result.user.status
    }
  });

  res.json({
    success: true,
    message: result.user.status === "active"
      ? "Đã mở khóa tài khoản."
      : "Đã khóa tài khoản.",
    data: result.user
  });
}

async function resetUserPassword(req, res) {
  const result = await adminUserService.resetUserPassword(req.params.id, req.body, req.user);

  await logAuditEvent(req, {
    action_type: "user_password_reset",
    entity_type: "user",
    entity_id: result.user.id,
    entity_label: getUserLabel(result.user),
    message: `Đặt mật khẩu tạm thời cho tài khoản ${result.user.email}.`,
    metadata: {
      target_user_id: result.user.id,
      target_email: result.user.email
    }
  });

  res.json({
    success: true,
    message: "Đã đặt mật khẩu tạm thời.",
    data: result.user
  });
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  updateUserStatus,
  resetUserPassword
};
