let warrantyPortalTab = "items";

document.addEventListener("DOMContentLoaded", initMyWarrantyPage);

async function initMyWarrantyPage() {
  await loadSiteLayout();
  bindWarrantyPortalTabs();
  bindWarrantyLookupForm();

  const params = new URLSearchParams(window.location.search);
  const serialFromUrl = params.get("serial") || "";
  const ticketCode = params.get("ticket") || "";
  const currentUser = getCurrentUser();

  updateWarrantyViewerLine(currentUser);
  updateWarrantyLoginCallout(currentUser);

  if (!currentUser) {
    renderWarrantyAccessState(null);
    switchWarrantyPortalTab("lookup");
  } else if (currentUser.role !== "customer") {
    renderWarrantyAccessState(currentUser);
    hideWarrantyLoginPrompt();
    switchWarrantyPortalTab("lookup");
  } else {
    hideWarrantyLoginPrompt();
    await loadWarrantyItems();
  }

  if (serialFromUrl) {
    switchWarrantyPortalTab("lookup");
    const input = document.getElementById("warrantySerialInput");
    input.value = serialFromUrl;
    await lookupWarrantySerial(serialFromUrl);
  }

  if (ticketCode && currentUser && currentUser.role === "customer") {
    await loadMyWarrantyDetail(ticketCode);
  }
}

function bindWarrantyPortalTabs() {
  document.querySelectorAll("#warrantyPortalTabs button").forEach(function (button) {
    button.addEventListener("click", async function () {
      const nextTab = button.dataset.tab || "items";
      switchWarrantyPortalTab(nextTab);

      if (nextTab === "items") {
        const currentUser = getCurrentUser();

        if (currentUser && currentUser.role === "customer") {
          await loadWarrantyItems();
        } else {
          renderWarrantyAccessState(currentUser);
        }
      }
    });
  });
}

function switchWarrantyPortalTab(tab) {
  warrantyPortalTab = tab;
  document.querySelectorAll("#warrantyPortalTabs button").forEach(function (button) {
    button.classList.toggle("active", button.dataset.tab === tab);
  });

  document.getElementById("warrantyItemsPanel").hidden = tab !== "items";
  document.getElementById("warrantyLookupPanel").hidden = tab !== "lookup";
}

function updateWarrantyViewerLine(user) {
  const viewerLine = document.getElementById("warrantyViewerLine");

  if (!viewerLine) {
    return;
  }

  if (user && user.role === "customer") {
    viewerLine.hidden = false;
    viewerLine.textContent = `Đang xem bảo hành của: ${user.full_name || user.email || "Khách hàng AeroTech"}`;
    return;
  }

  viewerLine.hidden = true;
  viewerLine.textContent = "";
}

function updateWarrantyLoginCallout(user) {
  if (!user) {
    showWarrantyLoginPrompt();
    return;
  }

  hideWarrantyLoginPrompt();
}

function hideWarrantyLoginPrompt() {
  const prompt = document.getElementById("customerWarrantyPrompt");

  if (!prompt) {
    return;
  }

  prompt.hidden = true;
  prompt.innerHTML = "";
}

function showWarrantyLoginPrompt() {
  const prompt = document.getElementById("customerWarrantyPrompt");

  if (!prompt) {
    return;
  }

  prompt.hidden = false;
  prompt.innerHTML = `
    <strong>Đăng nhập để xem bảo hành của bạn.</strong>
    <span>Khách chưa đăng nhập vẫn có thể tra cứu Serial ở tab bên cạnh.</span>
    <a class="btn btn-primary" href="login.html?redirect=${encodeURIComponent("my-warranty.html")}">Đăng nhập</a>
  `;
}

function renderWarrantyAccessState(user) {
  const container = document.getElementById("warrantyItemsList");

  if (!container) {
    return;
  }

  container.className = "warranty-items-list";

  if (!user) {
    container.innerHTML = `
      <div class="account-empty-state warranty-access-state">
        <h3>Cần đăng nhập để xem sản phẩm đã mua</h3>
        <p>Bạn vẫn có thể dùng tab Tra cứu Serial để kiểm tra bảo hành thủ công.</p>
        <a class="btn btn-primary" href="login.html?redirect=${encodeURIComponent("my-warranty.html")}">Đăng nhập</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="account-empty-state warranty-access-state">
      <h3>Danh sách này chỉ dành cho tài khoản khách hàng</h3>
      <p>Tài khoản quản trị vẫn có thể tra cứu Serial thủ công hoặc xử lý phiếu trong khu vực admin.</p>
      <a class="btn btn-light" href="admin/dashboard.html">Vào quản trị</a>
    </div>
  `;
}

async function loadWarrantyItems() {
  const container = document.getElementById("warrantyItemsList");

  container.className = "warranty-items-list loading-box";
  container.innerHTML = "Đang tải sản phẩm bảo hành...";

  try {
    const response = await authGet("/warranty/my-items");
    const items = response.data || [];
    container.className = "warranty-items-list";

    if (!items.length) {
      container.innerHTML = `
        <div class="account-empty-state">
          <p>Chưa có sản phẩm đã hoàn thành đơn hàng để hiển thị bảo hành.</p>
          <a class="btn btn-soft" href="products.html">Tiếp tục mua sắm</a>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(renderWarrantyItemCard).join("");
    bindWarrantyItemActions();
  } catch (error) {
    container.className = "warranty-items-list";
    container.innerHTML = renderError(error.message);
  }
}

function renderWarrantyItemCard(item) {
  const imageUrl = item.product_image || getProductImageFallback({
    product_type: item.requires_serial ? "component" : "accessory",
    category_slug: item.category_slug
  });
  const latestTicket = item.latest_ticket;
  const canRequest = Boolean(item.can_request_warranty);
  const blockedText = item.is_expired ? "Đã hết hạn" : (item.request_block_reason || "Chưa thể gửi yêu cầu bảo hành.");

  return `
    <article class="warranty-item-card" data-order-item-id="${escapeAttribute(item.order_item_id)}">
      <a class="warranty-item-image" href="product-detail.html?slug=${encodeURIComponent(item.slug || "")}">
        <img src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(item.product_name || "Sản phẩm bảo hành")}" loading="lazy" onerror="this.onerror=null;this.src='${escapeAttribute(getProductImageFallback({ product_type: "accessory" }))}';">
      </a>
      <div class="warranty-item-body">
        <div class="warranty-item-head">
          <div>
            <p class="eyebrow">${escapeHtml(item.brand_name || item.category_name || "AeroTech")}</p>
            <h2>${escapeHtml(item.product_name || "Sản phẩm bảo hành")}</h2>
          </div>
          <span class="status-badge warranty-${escapeAttribute(item.warranty_status || "inactive")}">${escapeHtml(item.warranty_status_label || getWarrantyCoverageLabel(item.warranty_status))}</span>
        </div>
        <dl class="warranty-item-meta">
          <div><dt>Đơn hàng</dt><dd>${escapeHtml(item.order_code || "")}</dd></div>
          <div><dt>SKU</dt><dd>${escapeHtml(item.sku || "")}</dd></div>
          <div><dt>Serial</dt><dd class="warranty-serial-code">${escapeHtml(item.serial_code || "Chưa gán Serial")}</dd></div>
          <div><dt>Ngày mua</dt><dd>${escapeHtml(formatDateOnly(item.purchase_date))}</dd></div>
          <div><dt>Bảo hành</dt><dd>${escapeHtml(item.warranty_months || 0)} tháng</dd></div>
          <div><dt>Hết hạn</dt><dd>${escapeHtml(formatDateOnly(item.warranty_end_date))}</dd></div>
          ${latestTicket ? `<div><dt>Trạng thái phiếu</dt><dd>${escapeHtml(getWarrantyTicketStatusLabel(latestTicket.status))}</dd></div>` : ""}
        </dl>
        ${latestTicket ? renderLatestTicket(latestTicket) : ""}
        <div class="warranty-item-actions">
          ${canRequest ? `
            <button class="btn btn-primary js-toggle-warranty-request" type="button" data-order-item-id="${escapeAttribute(item.order_item_id)}">Yêu cầu bảo hành</button>
          ` : `
            <span class="warranty-request-blocked">${escapeHtml(blockedText)}</span>
          `}
          ${latestTicket ? `<button class="btn btn-light js-view-my-warranty" type="button" data-ticket="${escapeAttribute(latestTicket.ticket_code)}">Xem trạng thái</button>` : ""}
          ${item.serial_code ? `<button class="btn btn-light js-lookup-owned-serial" type="button" data-serial="${escapeAttribute(item.serial_code)}">Tra cứu Serial</button>` : ""}
        </div>
        ${canRequest ? renderWarrantyRequestForm(item) : ""}
      </div>
    </article>
  `;
}

function renderLatestTicket(ticket) {
  return `
    <div class="warranty-ticket-inline">
      <strong>Phiếu gần nhất: ${escapeHtml(ticket.ticket_code)}</strong>
      <span class="status-badge ${escapeAttribute(ticket.status)}">${escapeHtml(getWarrantyTicketStatusLabel(ticket.status))}</span>
      <p>${escapeHtml(ticket.issue_description || "")}</p>
    </div>
  `;
}

function renderWarrantyRequestForm(item) {
  return `
    <form class="warranty-request-inline" data-order-item-id="${escapeAttribute(item.order_item_id)}" hidden>
      <label>
        Mô tả lỗi cần bảo hành
        <textarea name="issue_description" rows="4" minlength="10" placeholder="Mô tả triệu chứng lỗi, thời điểm phát sinh và phụ kiện đi kèm..." required></textarea>
      </label>
      <div class="warranty-request-actions">
        <button class="btn btn-primary" type="submit">Gửi yêu cầu</button>
        <button class="btn btn-light js-cancel-warranty-request" type="button">Hủy</button>
      </div>
      <div class="warranty-request-message" aria-live="polite"></div>
    </form>
  `;
}

function bindWarrantyItemActions() {
  document.querySelectorAll(".js-toggle-warranty-request").forEach(function (button) {
    button.addEventListener("click", function () {
      const card = button.closest(".warranty-item-card");
      const form = card && card.querySelector(".warranty-request-inline");

      if (form) {
        form.hidden = false;
        form.querySelector("textarea").focus();
      }
    });
  });

  document.querySelectorAll(".js-cancel-warranty-request").forEach(function (button) {
    button.addEventListener("click", function () {
      const form = button.closest(".warranty-request-inline");

      if (form) {
        form.hidden = true;
        form.reset();
        const message = form.querySelector(".warranty-request-message");
        if (message) {
          message.innerHTML = "";
        }
      }
    });
  });

  document.querySelectorAll(".warranty-request-inline").forEach(function (form) {
    form.addEventListener("submit", submitWarrantyRequest);
  });

  document.querySelectorAll(".js-view-my-warranty").forEach(function (button) {
    button.addEventListener("click", function () {
      loadMyWarrantyDetail(button.dataset.ticket);
    });
  });

  document.querySelectorAll(".js-lookup-owned-serial").forEach(function (button) {
    button.addEventListener("click", async function () {
      switchWarrantyPortalTab("lookup");
      const input = document.getElementById("warrantySerialInput");
      input.value = button.dataset.serial || "";
      await lookupWarrantySerial(input.value);
      document.getElementById("warrantyLookupPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

async function submitWarrantyRequest(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const message = form.querySelector(".warranty-request-message");
  const button = form.querySelector("button[type='submit']");
  const issueDescription = form.issue_description.value.trim();
  const orderItemId = Number(form.dataset.orderItemId);

  if (!issueDescription || issueDescription.length < 10) {
    message.innerHTML = `<div class="state-box state-error">Vui lòng mô tả lỗi ít nhất 10 ký tự.</div>`;
    return;
  }

  button.disabled = true;
  message.innerHTML = `<div class="state-box">Đang gửi yêu cầu bảo hành...</div>`;

  try {
    const response = await authPost("/warranty/requests", {
      order_item_id: orderItemId,
      issue_description: issueDescription
    });
    message.innerHTML = `<div class="state-box state-success">Đã tạo phiếu ${escapeHtml(response.data.ticket_code)}. AeroTech sẽ tiếp nhận và cập nhật trạng thái tại đây.</div>`;
    await loadWarrantyItems();
  } catch (error) {
    message.innerHTML = `<div class="state-box state-error">${escapeHtml(error.message)}</div>`;
    button.disabled = false;
  }
}

function bindWarrantyLookupForm() {
  const form = document.getElementById("warrantyLookupForm");
  const input = document.getElementById("warrantySerialInput");

  if (!form || !input) {
    return;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    lookupWarrantySerial(input.value.trim());
  });
}

async function lookupWarrantySerial(serial) {
  const result = document.getElementById("warrantyLookupResult");

  if (!serial) {
    result.innerHTML = renderError("Vui lòng nhập Serial cần tra cứu.");
    return;
  }

  result.className = "warranty-result-section loading-box";
  result.innerHTML = "Đang tra cứu bảo hành...";

  try {
    const response = await apiGet(`/warranty/lookup?serial=${encodeURIComponent(serial)}`);
    result.className = "warranty-result-section";
    result.innerHTML = renderWarrantyLookupResult(response.data);
    window.history.replaceState({}, "", `my-warranty.html?serial=${encodeURIComponent(serial)}`);
  } catch (error) {
    result.className = "warranty-result-section";
    result.innerHTML = `<div class="warranty-result-card warranty-error">${escapeHtml(error.message)}</div>`;
  }
}

function renderWarrantyLookupResult(data) {
  if (data.status === "not_activated") {
    return `<div class="warranty-result-card warranty-warning">${escapeHtml(data.message)}</div>`;
  }

  if (data.status === "inactive" && data.message) {
    return `
      <div class="warranty-result-card warranty-warning">
        <h2>Không hợp lệ</h2>
        <p>${escapeHtml(data.message)}</p>
        ${renderWarrantyBasicInfo(data)}
      </div>
    `;
  }

  return `
    <article class="warranty-result-card">
      <div class="warranty-result-header">
        <div>
          <p class="eyebrow">Kết quả bảo hành</p>
          <h2>${escapeHtml(data.product_name)}</h2>
          <p>${escapeHtml(data.brand_name || "AeroTech")} / ${escapeHtml(data.category_name || "")}</p>
        </div>
        <span class="status-badge warranty-${escapeAttribute(data.warranty_status)}">${escapeHtml(data.warranty_status_label || getWarrantyCoverageLabel(data.warranty_status))}</span>
      </div>
      ${renderWarrantyBasicInfo(data)}
      ${renderActiveTicket(data.active_ticket)}
      ${renderTicketHistory(data.ticket_history || [])}
    </article>
  `;
}

function renderWarrantyBasicInfo(data) {
  return `
    <dl class="warranty-info-grid">
      <div><dt>Sản phẩm</dt><dd>${escapeHtml(data.product_name || "")}</dd></div>
      <div><dt>Thương hiệu</dt><dd>${escapeHtml(data.brand_name || "")}</dd></div>
      <div><dt>SKU</dt><dd>${escapeHtml(data.sku || "")}</dd></div>
      <div><dt>Serial</dt><dd>${escapeHtml(data.serial_code || "")}</dd></div>
      <div><dt>Mã đơn hàng</dt><dd>${escapeHtml(data.order_code || "")}</dd></div>
      <div><dt>Ngày mua</dt><dd>${escapeHtml(formatDateOnly(data.purchase_date))}</dd></div>
      <div><dt>Thời hạn bảo hành</dt><dd>${escapeHtml(data.warranty_months || 0)} tháng</dd></div>
      <div><dt>Ngày hết hạn</dt><dd>${escapeHtml(formatDateOnly(data.warranty_end_date))}</dd></div>
      <div><dt>Trạng thái Serial</dt><dd>${escapeHtml(getSerialStatusLabel(data.serial_status))}</dd></div>
      <div><dt>Trạng thái đơn</dt><dd>${escapeHtml(getOrderStatusLabel(data.order_status))}</dd></div>
    </dl>
  `;
}

function renderActiveTicket(ticket) {
  if (!ticket) {
    return "";
  }

  return `
    <section class="warranty-ticket-panel">
      <h3>Phiếu bảo hành đang xử lý</h3>
      <p><strong>${escapeHtml(ticket.ticket_code)}</strong> - ${escapeHtml(getWarrantyTicketStatusLabel(ticket.status))}</p>
      <p>${escapeHtml(ticket.issue_description || "")}</p>
      <p>Ngày tiếp nhận: ${escapeHtml(formatDateOnly(ticket.received_date))}</p>
    </section>
  `;
}

function renderTicketHistory(tickets) {
  if (!tickets.length) {
    return "";
  }

  return `
    <section class="warranty-ticket-panel">
      <h3>Lịch sử bảo hành</h3>
      <div class="warranty-history-list">
        ${tickets.map(function (ticket) {
          return `
            <article>
              <strong>${escapeHtml(ticket.ticket_code)}</strong>
              <span class="status-badge ${escapeAttribute(ticket.status)}">${escapeHtml(getWarrantyTicketStatusLabel(ticket.status))}</span>
              <p>${escapeHtml(ticket.issue_description || "")}</p>
              <p>${escapeHtml(formatDateOnly(ticket.received_date))}${ticket.completed_date ? ` - ${escapeHtml(formatDateOnly(ticket.completed_date))}` : ""}</p>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

async function loadMyWarrantyDetail(ticketCode) {
  const panel = document.getElementById("myWarrantyDetail");

  panel.hidden = false;
  panel.className = "warranty-detail-section loading-box";
  panel.innerHTML = "Đang tải chi tiết phiếu bảo hành...";

  try {
    const response = await authGet(`/warranty/my/${encodeURIComponent(ticketCode)}`);
    panel.className = "warranty-detail-section";
    panel.innerHTML = renderMyWarrantyDetail(response.data);
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    panel.className = "warranty-detail-section";
    panel.innerHTML = renderError(error.message);
  }
}

function renderMyWarrantyDetail(ticket) {
  const coverageStatus = getWarrantyCoverageLabel(ticket.warranty_status);

  return `
    <div class="section-heading compact-heading">
      <div>
        <p class="eyebrow">Chi tiết phiếu</p>
        <h2>${escapeHtml(ticket.ticket_code)}</h2>
      </div>
      <span class="status-badge ${escapeAttribute(ticket.status)}">${escapeHtml(getWarrantyTicketStatusLabel(ticket.status))}</span>
    </div>
    <div class="detail-info-grid warranty-detail-grid">
      <section>
        <h3>Sản phẩm</h3>
        <p><strong>${escapeHtml(ticket.product_name)}</strong></p>
        <p>SKU: ${escapeHtml(ticket.sku)}</p>
        <p>Serial: ${escapeHtml(ticket.serial_code)}</p>
        <p>Đơn hàng: ${escapeHtml(ticket.order_code || "")}</p>
      </section>
      <section>
        <h3>Thời hạn bảo hành</h3>
        <p>Bắt đầu: ${escapeHtml(formatDateOnly(ticket.warranty_start_date))}</p>
        <p>Kết thúc: ${escapeHtml(formatDateOnly(ticket.warranty_end_date))}</p>
        <p>Tổng thời hạn: ${escapeHtml(ticket.warranty_months || 0)} tháng</p>
        ${coverageStatus ? `<p>Trạng thái: ${escapeHtml(coverageStatus)}</p>` : ""}
        ${ticket.warranty_package_title ? `<p>Gói mở rộng: ${escapeHtml(ticket.warranty_package_title)}</p>` : ""}
      </section>
    </div>
    <section class="warranty-ticket-note-box">
      <h3>Lỗi đã báo cáo</h3>
      <p>${escapeHtml(ticket.issue_description || "")}</p>
    </section>
    <section class="warranty-ticket-note-box">
      <h3>Ghi chú kỹ thuật</h3>
      <p>${ticket.technician_note ? escapeHtml(ticket.technician_note) : "AeroTech chưa có ghi chú kỹ thuật cho phiếu này."}</p>
    </section>
  `;
}

function getSerialStatusLabel(status) {
  const labels = {
    in_stock: "Trong kho",
    sold: "Đã bán",
    warranty: "Đang bảo hành",
    returned: "Hàng trả về shop"
  };

  return labels[status] || status || "";
}

function getWarrantyTicketStatusLabel(status) {
  const labels = {
    received: "Đã tiếp nhận",
    repairing: "Đang sửa",
    waiting_parts: "Chờ linh kiện",
    done: "Hoàn tất sửa chữa",
    returned: "Đã trả khách",
    rejected: "Từ chối bảo hành"
  };

  return labels[status] || status || "";
}

function getWarrantyCoverageLabel(status) {
  const labels = {
    valid: "Còn bảo hành",
    expired: "Hết hạn",
    inactive: "Không hợp lệ",
    in_warranty: "Đang xử lý bảo hành"
  };

  return labels[status] || status || "";
}
