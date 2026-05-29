function renderAdminLayout(activeKey, user) {
  document.body.classList.add("admin-page");

  const sidebar = document.getElementById("adminSidebar");
  const topbar = document.getElementById("adminTopbar");
  const displayName = getAdminDisplayName(user);
  const roleLabel = getAdminRoleLabel(user.role);
  const roleMeta = getAdminRoleMeta(user.role);

  if (sidebar) {
    sidebar.innerHTML = `
      <a class="admin-logo" href="dashboard.html">
        <span class="logo-mark" aria-hidden="true"></span>
        <span class="admin-logo-copy">
          <strong>Aero <em>Admin</em></strong>
          <small>Operations Console</small>
        </span>
      </a>
      <button id="adminDrawerCloseBtn" class="admin-drawer-close" type="button" aria-label="\u0110\u00f3ng menu">\u00d7</button>
      <nav class="admin-nav">
        ${renderAdminNavLink("dashboard", "B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n", "dashboard.html", activeKey, "\u2302")}
        ${user.role === "admin" ? renderAdminNavLink("products", "S\u1ea3n ph\u1ea9m", "products.html", activeKey, "\u25a6") : ""}
        ${user.role === "admin" ? renderAdminNavLink("brands", "Th\u01b0\u01a1ng hi\u1ec7u", "brands.html", activeKey, "\u25c6") : ""}
        ${user.role === "admin" ? renderAdminNavLink("categories", "Danh m\u1ee5c", "categories.html", activeKey, "\u2630") : ""}
        ${["admin", "technician"].includes(user.role) ? renderAdminNavLink("inventory", "Kho Serial", "inventory.html", activeKey, "\u25ce") : ""}
        ${["admin", "sales", "technician"].includes(user.role) ? renderAdminNavLink("orders", "\u0110\u01a1n h\u00e0ng", "orders.html", activeKey, "\u25c7") : ""}
        ${["admin", "technician"].includes(user.role) ? renderAdminNavLink("warranty", "B\u1ea3o h\u00e0nh", "warranty.html", activeKey, "\u271a") : ""}
        ${user.role === "admin" ? renderAdminNavLink("reports", "B\u00e1o c\u00e1o", "reports.html", activeKey, "\u25a4") : ""}
        <a class="admin-nav-home" href="../index.html"><span>${escapeHtml("\u2197")}</span>V\u1ec1 trang ch\u1ee7</a>
        <button id="adminLogoutBtn" class="admin-nav-logout" type="button"><span>${escapeHtml("\u00d7")}</span>\u0110\u0103ng xu\u1ea5t</button>
      </nav>
    `;
  }

  if (topbar) {
    topbar.innerHTML = `
      <div class="admin-topbar-role" aria-label="Vai tr\u00f2 hi\u1ec7n t\u1ea1i">
        <span class="admin-role-badge">${escapeHtml(roleLabel)}</span>
        <small>${escapeHtml(displayName !== roleLabel ? displayName : roleMeta)}</small>
      </div>
      <button id="adminMobileMenuBtn" class="admin-mobile-menu-btn" type="button" aria-controls="adminSidebar" aria-expanded="false">
        <span aria-hidden="true">\u2630</span>
        <span>Aero Admin Panel</span>
      </button>
      <div id="adminDrawerBackdrop" class="admin-drawer-backdrop" hidden></div>
    `;
  }

  bindAdminMobileDrawer();
  setupAdminTableEnhancer();

  const logoutBtn = document.getElementById("adminLogoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      clearAuthSession();
      window.location.href = "../index.html";
    });
  }
}

function bindAdminMobileDrawer() {
  const sidebar = document.getElementById("adminSidebar");
  const toggle = document.getElementById("adminMobileMenuBtn");
  const backdrop = document.getElementById("adminDrawerBackdrop");
  const closeBtn = document.getElementById("adminDrawerCloseBtn");

  if (!sidebar || !toggle || !backdrop) {
    return;
  }

  function closeDrawer() {
    sidebar.classList.remove("is-open");
    document.body.classList.remove("admin-drawer-open");
    backdrop.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }

  function openDrawer() {
    sidebar.classList.add("is-open");
    document.body.classList.add("admin-drawer-open");
    backdrop.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
  }

  toggle.addEventListener("click", function () {
    if (sidebar.classList.contains("is-open")) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  backdrop.addEventListener("click", closeDrawer);

  if (closeBtn) {
    closeBtn.addEventListener("click", closeDrawer);
  }

  sidebar.addEventListener("click", function (event) {
    if (event.target.closest("a")) {
      closeDrawer();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeDrawer();
    }
  });
}

function setupAdminTableEnhancer() {
  enhanceAdminTablesForMobile();

  if (window.__adminTableEnhancerBound) {
    return;
  }

  window.__adminTableEnhancerBound = true;
  const target = document.querySelector(".admin-main") || document.body;
  const observer = new MutationObserver(function () {
    enhanceAdminTablesForMobile();
  });

  observer.observe(target, {
    childList: true,
    subtree: true
  });
}

function enhanceAdminTablesForMobile(root) {
  const scope = root || document;

  scope.querySelectorAll("table.admin-table").forEach(function (table) {
    const headers = Array.from(table.querySelectorAll("thead th")).map(function (header) {
      return header.textContent.trim();
    });

    table.querySelectorAll("tbody tr").forEach(function (row) {
      Array.from(row.children).forEach(function (cell, index) {
        if (!cell.dataset.label && headers[index]) {
          cell.dataset.label = headers[index];
        }
      });
    });
  });
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

function getAdminRoleMeta(role) {
  const labels = {
    admin: "Admin",
    sales: "Sales",
    technician: "Technician",
    customer: "Customer"
  };

  return labels[role] || "AeroTech";
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
    ["k\u1ebft n\u1ed1i ", "mysql"].join(""),
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
