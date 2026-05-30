let adminOrderDetailUser = null;
let adminOrderCode = "";

document.addEventListener("DOMContentLoaded", initAdminOrderDetail);

async function initAdminOrderDetail() {
  adminOrderDetailUser = await requireAdminRole(["admin", "sales", "technician"]);
  if (!adminOrderDetailUser) return;

  renderAdminLayout("orders", adminOrderDetailUser);
  adminOrderCode = new URLSearchParams(window.location.search).get("code") || "";

  if (!adminOrderCode) {
    document.getElementById("adminOrderDetail").innerHTML = renderError("Thiếu mã đơn hàng.");
    return;
  }

  await loadAdminOrderDetail();
}

async function loadAdminOrderDetail() {
  const container = document.getElementById("adminOrderDetail");
  container.className = "loading-box";
  container.innerHTML = "Đang tải đơn hàng...";

  try {
    const response = await adminGet(`/admin/orders/${encodeURIComponent(adminOrderCode)}`);
    container.className = "";
    container.innerHTML = renderAdminOrderDetail(response.data);
    bindAdminOrderDetailActions();
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}

function renderAdminOrderDetail(data) {
  const order = data.order;
  const workflow = data.workflow;

  return `
    <section class="admin-panel">
      <div class="admin-order-summary">
        <div>
          <h2>${escapeHtml(order.order_code)}</h2>
          <p>${escapeHtml(formatDateTime(order.created_at))}</p>
        </div>
        <span class="status-badge ${escapeAttribute(order.status)}">${escapeHtml(getOrderStatusLabel(order.status))}</span>
      </div>
      ${renderAdminOrderTimeline(order.status)}
      ${renderOrderStatusActions(order, workflow)}
      ${workflow.missing_serial_count > 0 ? `<div class="admin-warning-box">Đơn còn ${escapeHtml(workflow.missing_serial_count)} sản phẩm cần gán Serial trước khi giao hàng.</div>` : ""}
      ${adminOrderDetailUser.role === "sales" && workflow.missing_serial_count > 0 ? `<div class="admin-note-box">Chỉ Technician hoặc Admin được gán Serial.</div>` : ""}
    </section>

    <div class="admin-detail-grid">
      <section class="admin-panel">
        <h2>Thông tin khách hàng</h2>
        <p><strong>${escapeHtml(order.customer_name)}</strong></p>
        <p>${escapeHtml(order.customer_phone)}</p>
        <p>${escapeHtml(order.customer_email || "")}</p>
        <p>${escapeHtml(order.address_line)}, ${escapeHtml(order.ward)}, ${escapeHtml(order.district)}, ${escapeHtml(order.province)}</p>
        ${order.note ? `<p>Ghi chú: ${escapeHtml(order.note)}</p>` : ""}
      </section>

      <section class="admin-panel">
        <h2>Thanh toán</h2>
        <p>${escapeHtml(getPaymentMethodLabel(order.payment_method))}</p>
        <p>${escapeHtml(getPaymentStatusLabel(order.payment_status))}</p>
        <div class="order-money-box">
          <div><span>Tạm tính</span><strong>${formatCurrency(order.subtotal_amount)}</strong></div>
          <div><span>Phí giao hàng</span><strong>${formatCurrency(order.shipping_fee)}</strong></div>
          <div><span>Giảm giá</span><strong>${formatCurrency(order.discount_amount)}</strong></div>
          <div class="total-line"><span>Tổng cộng</span><strong>${formatCurrency(order.total_amount)}</strong></div>
        </div>
      </section>
    </div>

    <section class="admin-panel">
      <h2>Sản phẩm trong đơn</h2>
      <div class="admin-table-wrap">
        ${renderAdminOrderItems(data.items, order)}
      </div>
    </section>
  `;
}

function renderAdminOrderTimeline(status) {
  const steps = [
    { key: "pending", label: "Chờ duyệt" },
    { key: "approved", label: "Đã duyệt" },
    { key: "shipping", label: "Đang giao" },
    { key: "completed", label: "Hoàn thành" },
    { key: "cancelled", label: "Đã hủy" }
  ];
  const orderMap = {
    pending: 1,
    approved: 2,
    shipping: 3,
    completed: 4,
    cancelled: 5
  };

  return `
    <div class="timeline admin-timeline">
      ${steps.map(function (step) {
        const active = status === "cancelled" ? step.key === "cancelled" : orderMap[step.key] <= orderMap[status] && step.key !== "cancelled";
        return `<span class="${active ? "active" : ""}">${escapeHtml(step.label)}</span>`;
      }).join("")}
    </div>
  `;
}

function renderOrderStatusActions(order, workflow) {
  if (!["admin", "sales"].includes(adminOrderDetailUser.role)) {
    return `<div class="admin-note-box">Technician có thể xem đơn và gán Serial, nhưng không được duyệt, hủy hoặc cập nhật trạng thái đơn.</div>`;
  }

  if (["completed", "cancelled"].includes(order.status)) {
    return "";
  }

  const buttons = [];

  if (workflow.can_approve) {
    buttons.push(`<button class="btn btn-primary js-detail-status" type="button" data-status="approved">Duyệt đơn</button>`);
  }

  if (order.status === "approved") {
    buttons.push(`<button class="btn btn-primary js-detail-status" type="button" data-status="shipping" ${workflow.missing_serial_count > 0 ? "disabled" : ""}>Chuyển giao hàng</button>`);
  }

  if (workflow.can_complete) {
    buttons.push(`<button class="btn btn-primary js-detail-status" type="button" data-status="completed">Hoàn thành</button>`);
  }

  if (workflow.can_cancel) {
    buttons.push(`<button class="btn btn-outline js-detail-status" type="button" data-status="cancelled">Hủy đơn</button>`);
  }

  if (!buttons.length) {
    return "";
  }

  return `<div class="form-actions admin-status-actions">${buttons.join("")}</div>`;
}

function renderAdminOrderItems(items, order) {
  return `
    <table class="admin-table admin-order-items-table">
      <thead>
        <tr>
          <th>Sản phẩm</th>
          <th>SKU</th>
          <th>SL</th>
          <th>Đơn giá</th>
          <th>Thành tiền</th>
          <th>Serial</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(function (item) {
          const imageFallback = getProductImageFallback(item);

          return `
            <tr>
              <td>
                <div class="table-product-cell">
                  <img src="${escapeAttribute(getImageUrl(item.product_image, item))}" alt="${escapeAttribute(item.product_name_snapshot)}" onerror="this.onerror=null;this.src='${escapeAttribute(imageFallback)}'">
                  <span>
                    <strong>${escapeHtml(item.product_name_snapshot)}</strong>
                    ${renderAdminItemWarrantyPackage(item)}
                  </span>
                </div>
              </td>
              <td>${escapeHtml(item.sku_snapshot)}</td>
              <td>${escapeHtml(item.quantity)}</td>
              <td>
                ${formatCurrency(item.unit_price)}
                ${item.warranty_package_id ? `<p class="table-subtext">Gói BH: ${formatCurrency(item.warranty_package_price || 0)}</p>` : ""}
              </td>
              <td>${formatCurrency(item.total_price)}</td>
              <td>${renderSerialCell(item, order)}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function renderAdminItemWarrantyPackage(item) {
  if (!item.warranty_package_id) {
    return "";
  }

  return `
    <small class="table-subtext">
      Bảo hành mở rộng: ${escapeHtml(item.warranty_package_title || "Gói bảo hành")}
      (+${escapeHtml(item.warranty_package_duration_months || 0)} tháng)
    </small>
  `;
}

function renderSerialCell(item, order) {
  if (!item.requires_serial) {
    return `<span class="status-badge active">Không yêu cầu Serial</span>`;
  }

  if (item.serial_number_id) {
    return `
      <div class="serial-cell">
        <span class="status-badge sold">${escapeHtml(item.serial_code || "Đã gán Serial")}</span>
        <p class="table-subtext">${escapeHtml(item.serial_status || "")}</p>
        ${adminOrderDetailUser.role === "admin" && order.status === "approved" ? `<button class="btn btn-outline js-unassign-serial" type="button" data-item-id="${escapeAttribute(item.id)}">Gỡ Serial</button>` : ""}
      </div>
    `;
  }

  if (!["approved", "shipping"].includes(order.status)) {
    return `<span class="table-subtext">Chỉ gán Serial sau khi đơn được duyệt.</span>`;
  }

  if (!["admin", "technician"].includes(adminOrderDetailUser.role)) {
    return `<span class="table-subtext warning-text">Chỉ Technician hoặc Admin được gán Serial.</span>`;
  }

  const options = (item.available_serials || []).map(function (serial) {
    return `<option value="${escapeAttribute(serial.id)}">${escapeHtml(serial.serial_code)}</option>`;
  }).join("");

  return `
    <div class="serial-assign-row">
      <select id="serialSelect${escapeAttribute(item.id)}" ${options ? "" : "disabled"}>
        ${options || '<option value="">Không có Serial trong kho</option>'}
      </select>
      <button class="btn btn-primary js-assign-serial" type="button" data-item-id="${escapeAttribute(item.id)}" ${options ? "" : "disabled"}>Gán Serial</button>
    </div>
  `;
}

function bindAdminOrderDetailActions() {
  document.querySelectorAll(".js-detail-status").forEach(function (button) {
    button.addEventListener("click", function () {
      updateOrderStatusFromDetail(button.dataset.status);
    });
  });

  document.querySelectorAll(".js-assign-serial").forEach(function (button) {
    button.addEventListener("click", function () {
      assignSerialFromDetail(button.dataset.itemId);
    });
  });

  document.querySelectorAll(".js-unassign-serial").forEach(function (button) {
    button.addEventListener("click", function () {
      unassignSerialFromDetail(button.dataset.itemId);
    });
  });
}

async function updateOrderStatusFromDetail(status) {
  if (status === "cancelled" && !confirm("Bạn chắc chắn muốn hủy đơn hàng này? Serial đã gán sẽ được trả về kho.")) {
    return;
  }

  try {
    const response = await adminPatch(`/admin/orders/${encodeURIComponent(adminOrderCode)}/status`, {
      status
    });
    showAdminMessage("adminOrderDetailMessage", "success", response.message || "Cập nhật đơn hàng thành công.");
    await loadAdminOrderDetail();
  } catch (error) {
    showAdminMessage("adminOrderDetailMessage", "error", error.message);
  }
}

async function assignSerialFromDetail(itemId) {
  const select = document.getElementById(`serialSelect${itemId}`);
  const serialNumberId = select ? Number(select.value) : 0;

  if (!serialNumberId) {
    showAdminMessage("adminOrderDetailMessage", "error", "Vui lòng chọn Serial.");
    return;
  }

  try {
    const response = await adminPost(`/admin/orders/${encodeURIComponent(adminOrderCode)}/items/${encodeURIComponent(itemId)}/assign-serial`, {
      serial_number_id: serialNumberId
    });
    showAdminMessage("adminOrderDetailMessage", "success", response.message || "Gán Serial thành công.");
    await loadAdminOrderDetail();
  } catch (error) {
    showAdminMessage("adminOrderDetailMessage", "error", error.message);
  }
}

async function unassignSerialFromDetail(itemId) {
  if (!confirm("Gỡ Serial khỏi sản phẩm này? Thao tác này chỉ nên dùng để sửa sai trước khi giao hàng.")) {
    return;
  }

  try {
    const response = await adminPatch(`/admin/orders/${encodeURIComponent(adminOrderCode)}/items/${encodeURIComponent(itemId)}/unassign-serial`, {});
    showAdminMessage("adminOrderDetailMessage", "success", response.message || "Gỡ Serial thành công.");
    await loadAdminOrderDetail();
  } catch (error) {
    showAdminMessage("adminOrderDetailMessage", "error", error.message);
  }
}


