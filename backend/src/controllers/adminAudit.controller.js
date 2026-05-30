const adminAuditService = require("../services/adminAudit.service");
const { buildCsv, sendCsv, formatDateForFilename } = require("../utils/csvExport");

async function getAuditLogs(req, res) {
  const result = await adminAuditService.getAuditLogs(req.query);

  res.json({
    success: true,
    data: result.logs,
    pagination: result.pagination
  });
}

async function getAuditFilterOptions(req, res) {
  const options = await adminAuditService.getAuditFilterOptions();

  res.json({
    success: true,
    data: options
  });
}

async function exportAuditLogs(req, res) {
  const logs = await adminAuditService.exportAuditLogs(req.query);
  const headers = [
    { key: "created_at", label: "Thời gian" },
    { key: "actor_name", label: "Người thao tác" },
    { key: "actor_email", label: "Email" },
    { key: "actor_role", label: "Vai trò" },
    { key: "action_type", label: "Hành động" },
    { key: "entity_type", label: "Loại dữ liệu" },
    { key: "entity_id", label: "ID/Mã dữ liệu" },
    { key: "entity_label", label: "Đối tượng" },
    { key: "message", label: "Nội dung" },
    { key: "ip_address", label: "IP" },
    { key: "user_agent", label: "User Agent" }
  ];

  sendCsv(res, `aerotech-audit-logs-${formatDateForFilename(new Date())}.csv`, buildCsv(headers, logs));
}

module.exports = {
  getAuditLogs,
  getAuditFilterOptions,
  exportAuditLogs
};
