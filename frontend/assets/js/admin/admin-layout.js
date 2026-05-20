function renderAdminLayout(activeKey, user) {
  const sidebar = document.getElementById("adminSidebar");
  const topbar = document.getElementById("adminTopbar");
  const displayName = getAdminDisplayName(user);
  const roleLabel = getAdminRoleLabel(user.role);

  if (sidebar) {
    sidebar.innerHTML = `
      <a class="admin-logo" href="dashboard.html">
        <span class="logo-mark" aria-hidden="true"></span>
        <span class="admin-logo-copy">
          <strong>Aero <em>Admin</em></strong>
          <small>Operations Console</small>
        </span>
      </a>
      <nav class="admin-nav">
        ${renderAdminNavLink("dashboard", "B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n", "dashboard.html", activeKey, "\u2302")}
        ${user.role === "admin" ? renderAdminNavLink("products", "S\u1ea3n ph\u1ea9m", "products.html", activeKey, "\u25a6") : ""}
        ${user.role === "admin" ? renderAdminNavLink("brands", "Th\u01b0\u01a1ng hi\u1ec7u", "brands.html", activeKey, "\u25c6") : ""}
        ${user.role === "admin" ? renderAdminNavLink("categories", "Danh m\u1ee5c", "categories.html", activeKey, "\u2630") : ""}
        ${["admin", "technician"].includes(user.role) ? renderAdminNavLink("inventory", "Kho Serial", "inventory.html", activeKey, "\u25ce") : ""}
        ${["admin", "sales", "technician"].includes(user.role) ? renderAdminNavLink("orders", "\u0110\u01a1n h\u00e0ng", "orders.html", activeKey, "\u25c7") : ""}
        ${["admin", "technician"].includes(user.role) ? renderAdminNavLink("warranty", "B\u1ea3o h\u00e0nh", "warranty.html", activeKey, "\u271a") : ""}
        ${["admin", "sales"].includes(user.role) ? renderAdminNavLink("reports", "B\u00e1o c\u00e1o", "reports.html", activeKey, "\u25a4") : ""}
        <a class="admin-nav-home" href="../index.html"><span>${escapeHtml("\u2197")}</span>V\u1ec1 trang ch\u1ee7</a>
        <button id="adminLogoutBtn" class="admin-nav-logout" type="button"><span>${escapeHtml("\u00d7")}</span>\u0110\u0103ng xu\u1ea5t</button>
      </nav>
    `;
  }

  if (topbar) {
    topbar.innerHTML = `
      <div class="admin-topbar-user">
        <span class="admin-user-avatar" aria-hidden="true">${escapeHtml(getAdminAvatarInitial(displayName))}</span>
        <div>
          <strong>${escapeHtml(displayName)}</strong>
          <span>${escapeHtml(roleLabel)}</span>
        </div>
      </div>
      <a class="admin-btn admin-btn-outline" href="../index.html">V\u1ec1 c\u1eeda h\u00e0ng</a>
    `;
  }

  const logoutBtn = document.getElementById("adminLogoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      clearAuthSession();
      window.location.href = "../index.html";
    });
  }
}

function renderAdminNavLink(key, label, href, activeKey, icon) {
  return `<a class="${key === activeKey ? "active" : ""}" href="${href}"><span>${escapeHtml(icon || "\u2022")}</span>${escapeHtml(label)}</a>`;
}

function getAdminRoleLabel(role) {
  const labels = {
    admin: "Qu\u1ea3n tr\u1ecb vi\u00ean",
    sales: "Nh\u00e2n vi\u00ean b\u00e1n h\u00e0ng",
    technician: "K\u1ef9 thu\u1eadt vi\u00ean",
    customer: "Kh\u00e1ch h\u00e0ng"
  };

  return labels[role] || role || "Nh\u00e2n s\u1ef1";
}

function getAdminDisplayName(user) {
  const rawName = String((user && user.full_name) || "").trim();
  const normalized = rawName.toLowerCase();

  if (!rawName || normalized.includes(["de", "mo"].join(""))) {
    return getAdminRoleLabel(user && user.role);
  }

  return rawName;
}

function getAdminAvatarInitial(name) {
  const cleanName = String(name || "").trim();
  return cleanName ? cleanName.charAt(0).toUpperCase() : "A";
}

function getAdminPersonDisplayName(value, fallback) {
  const rawValue = String(value || "").trim();
  const normalized = rawValue.toLowerCase();

  if (!rawValue || normalized.includes(["de", "mo"].join(""))) {
    return fallback || "Kh\u00e1ch h\u00e0ng";
  }

  return rawValue;
}

function getAdminRecordDisplayText(value, fallback) {
  const rawValue = String(value || "").trim();
  const normalized = rawValue.toLowerCase();
  const blockedWords = [
    ["ph", "ase"].join(""),
    ["se", "104"].join(""),
    ["sam", "ple"].join(""),
    "k\u1ebft n\u1ed1i mysql",
    "s\u1ea3n ph\u1ea9m m\u1eabu",
    "\u0111\u1ed3 \u00e1n"
  ];

  if (!rawValue || blockedWords.some(function (word) {
    return normalized.includes(word);
  })) {
    return fallback || "AeroTech";
  }

  return rawValue;
}
