let auditLogPage = 1;

const AUDIT_ACTION_LABELS = {
  create_product: "Tạo sản phẩm",
  update_product: "Cập nhật sản phẩm",
  update_product_status: "Cập nhật trạng thái sản phẩm",
  export_products: "Xuất sản phẩm",
  import_products: "Import sản phẩm",
  create_brand: "Tạo thương hiệu",
  update_brand: "Cập nhật thương hiệu",
  update_brand_status: "Cập nhật trạng thái thương hiệu",
  create_category: "Tạo danh mục",
  update_category: "Cập nhật danh mục",
  update_category_status: "Cập nhật trạng thái danh mục",
  create_serial: "Thêm Serial",
  import_serials: "Import Serial",
  export_serials: "Xuất Serial",
  update_serial_status: "Cập nhật Serial",
  export_orders: "Xuất đơn hàng",
  update_order_status: "Cập nhật đơn hàng",
  add_order_note: "Ghi chú đơn hàng",
  assign_serial: "Gán Serial",
  unassign_serial: "Gỡ Serial",
  create_warranty_ticket: "Tạo phiếu bảo hành",
  update_warranty_status: "Cập nhật bảo hành",
  update_warranty_note: "Ghi chú bảo hành",
  approve_review: "Duyệt đánh giá",
  reject_review: "Từ chối đánh giá",
  export_report: "Xuất báo cáo"
};

const AUDIT_ENTITY_LABELS = {
  product: "Sản phẩm",
  brand: "Thương hiệu",
  category: "Danh mục",
  serial: "Serial",
  order: "Đơn hàng",
  warranty_ticket: "Bảo hành",
  product_review: "Đánh giá",
  report: "Báo cáo"
};

const AUDIT_ROLE_LABELS = {
  admin: "Admin",
  sales: "Sales",
  technician: "Technician"
};

document.addEventListener("DOMContentLoaded", initAuditLogs);

async function initAuditLogs() {
  const user = await requireAdminRole(["admin"]);
  if (!user) return;

  renderAdminLayout("audit-logs", user);
  bindAuditEvents();
  await loadAuditOptions();
  await loadAuditLogs();
}

function bindAuditEvents() {
  document.getElementById("auditFilterForm").addEventListener("submit", function (event) {
    event.preventDefault();
    auditLogPage = 1;
    loadAuditLogs();
  });

  document.getElementById("resetAuditFilterBtn").addEventListener("click", resetAuditFilters);
  document.getElementById("exportAuditBtn").addEventListener("click", exportAuditLogs);
}

async function loadAuditOptions() {
  try {
    const response = await adminGet("/admin/audit-logs/options");
    const options = response.data || {};
    fillAuditSelect("auditActionFilter", options.actionTypes || [], AUDIT_ACTION_LABELS, "Tất cả hành động");
    fillAuditSelect("auditEntityFilter", options.entityTypes || [], AUDIT_ENTITY_LABELS, "Tất cả dữ liệu");
  } catch (error) {
    showAdminMessage("auditMessage", "error", error.message);
  }
}

function fillAuditSelect(elementId, values, labelMap, defaultLabel) {
  const select = document.getElementById(elementId);
  if (!select) return;

  select.innerHTML = `<option value="">${escapeHtml(defaultLabel)}</option>` + values.map(function (value) {
    return `<option value="${escapeAttribute(value)}">${escapeHtml(labelMap[value] || value)}</option>`;
  }).join("");
}

function getAuditQuery(extra) {
  return buildQueryString({
    keyword: document.getElementById("auditKeywordInput").value.trim(),
    actionType: document.getElementById("auditActionFilter").value,
    entityType: document.getElementById("auditEntityFilter").value,
    actorRole: document.getElementById("auditRoleFilter").value,
    dateFrom: document.getElementById("auditDateFrom").value,
    dateTo: document.getElementById("auditDateTo").value,
    page: extra && extra.withoutPage ? undefined : auditLogPage,
    limit: extra && extra.withoutPage ? undefined : 20
  });
}

async function loadAuditLogs() {
  const container = document.getElementById("auditTable");
  container.className = "admin-table-wrap loading-box";
  container.innerHTML = "Đang tải nhật ký...";

  try {
    const response = await adminGet(`/admin/audit-logs?${getAuditQuery()}`);
    container.className = "admin-table-wrap";
    container.innerHTML = renderAuditTable(response.data || []);
    renderAuditPagination(response.pagination);
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function renderAuditTable(logs) {
  if (!logs.length) {
    return renderEmpty("Chưa có nhật ký phù hợp.");
  }

  return `
    <table class="admin-table audit-log-table">
      <thead>
        <tr>
          <th>Thời gian</th>
          <th>Người thao tác</th>
          <th>Hành động</th>
          <th>Đối tượng</th>
          <th>Nội dung</th>
          <th>IP</th>
        </tr>
      </thead>
      <tbody>
        ${logs.map(renderAuditRow).join("")}
      </tbody>
    </table>
  `;
}

function renderAuditRow(log) {
  const actor = getAdminPersonDisplayName(log.actor_name, "Nhân sự");
  const actionLabel = AUDIT_ACTION_LABELS[log.action_type] || log.action_type || "Thao tác";
  const entityLabel = AUDIT_ENTITY_LABELS[log.entity_type] || log.entity_type || "Hệ thống";
  const metadata = log.metadata ? renderAuditMetadata(log.metadata) : "";

  return `
    <tr>
      <td data-label="Thời gian">
        <strong>${escapeHtml(formatDateTime(log.created_at))}</strong>
      </td>
      <td data-label="Người thao tác">
        <strong>${escapeHtml(actor)}</strong>
        <p class="table-subtext">${escapeHtml(log.actor_email || "")}</p>
        <span class="status-badge ${escapeAttribute(log.actor_role || "")}">${escapeHtml(AUDIT_ROLE_LABELS[log.actor_role] || log.actor_role || "-")}</span>
      </td>
      <td data-label="Hành động">
        <span class="audit-action-pill">${escapeHtml(actionLabel)}</span>
      </td>
      <td data-label="Đối tượng">
        <strong>${escapeHtml(entityLabel)}</strong>
        <p class="table-subtext">${escapeHtml(log.entity_label || log.entity_id || "-")}</p>
      </td>
      <td data-label="Nội dung" class="audit-message-cell">
        ${escapeHtml(log.message || "")}
        ${metadata}
      </td>
      <td data-label="IP">${escapeHtml(log.ip_address || "-")}</td>
    </tr>
  `;
}

function renderAuditMetadata(metadata) {
  const pairs = Object.entries(metadata).filter(function ([, value]) {
    return value !== undefined && value !== null && value !== "";
  }).slice(0, 4);

  if (!pairs.length) {
    return "";
  }

  return `
    <details class="audit-metadata">
      <summary>Chi tiết</summary>
      <dl>
        ${pairs.map(function ([key, value]) {
          return `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(formatAuditMetadataValue(value))}</dd></div>`;
        }).join("")}
      </dl>
    </details>
  `;
}

function formatAuditMetadataValue(value) {
  if (Array.isArray(value)) {
    return value.length > 6 ? `${value.slice(0, 6).join(", ")}...` : value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function renderAuditPagination(pagination) {
  const container = document.getElementById("auditPagination");

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
      auditLogPage = Number(button.dataset.page);
      loadAuditLogs();
    });
  });
}

function resetAuditFilters() {
  document.getElementById("auditKeywordInput").value = "";
  document.getElementById("auditActionFilter").value = "";
  document.getElementById("auditEntityFilter").value = "";
  document.getElementById("auditRoleFilter").value = "";
  document.getElementById("auditDateFrom").value = "";
  document.getElementById("auditDateTo").value = "";
  document.getElementById("auditMessage").innerHTML = "";
  auditLogPage = 1;
  loadAuditLogs();
}

async function exportAuditLogs() {
  try {
    await adminDownloadFile(`/admin/audit-logs/export?${getAuditQuery({ withoutPage: true })}`, "aerotech-audit-logs.csv");
    showAdminMessage("auditMessage", "success", "Đã xuất file nhật ký hệ thống.");
  } catch (error) {
    showAdminMessage("auditMessage", "error", error.message);
  }
}
