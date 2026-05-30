async function adminRequest(endpoint, options) {
  const token = getAuthToken();

  if (!token) {
    window.location.href = `../login.html?redirect=${encodeURIComponent(getAdminRedirectPath())}`;
    return null;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...(options || {}),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...((options && options.headers) || {})
    }
  });
  const data = await response.json();

  if (response.status === 401) {
    clearAuthSession();
    window.location.href = `../login.html?redirect=${encodeURIComponent(getAdminRedirectPath())}`;
    return null;
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Yêu cầu không thành công.");
  }

  return data;
}

function adminGet(endpoint) {
  return adminRequest(endpoint, {
    method: "GET"
  });
}

function adminPost(endpoint, body) {
  return adminRequest(endpoint, {
    method: "POST",
    body: JSON.stringify(body || {})
  });
}

function adminPut(endpoint, body) {
  return adminRequest(endpoint, {
    method: "PUT",
    body: JSON.stringify(body || {})
  });
}

function adminPatch(endpoint, body) {
  return adminRequest(endpoint, {
    method: "PATCH",
    body: JSON.stringify(body || {})
  });
}

async function adminPostFormData(endpoint, formData) {
  const token = getAuthToken();

  if (!token) {
    window.location.href = `../login.html?redirect=${encodeURIComponent(getAdminRedirectPath())}`;
    return null;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });
  const data = await response.json();

  if (response.status === 401) {
    clearAuthSession();
    window.location.href = `../login.html?redirect=${encodeURIComponent(getAdminRedirectPath())}`;
    return null;
  }

  if (!response.ok || data.success === false) {
    const error = new Error(data.message || "Yêu cầu không thành công.");
    error.data = data.data || null;
    throw error;
  }

  return data;
}

function getAdminRedirectPath() {
  return `admin/${window.location.pathname.split("/admin/")[1] || "dashboard.html"}${window.location.search}`;
}

async function requireAdminRole(allowedRoles) {
  const token = getAuthToken();

  if (!token) {
    window.location.href = `../login.html?redirect=${encodeURIComponent(getAdminRedirectPath())}`;
    return null;
  }

  try {
    const response = await adminGet("/auth/me");
    const user = normalizeUserRole(response.data.user);

    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

    if (!allowedRoles.map(function (role) { return String(role).toLowerCase(); }).includes(user.role)) {
      document.body.innerHTML = `
        <main class="admin-access-denied">
          <section class="access-card">
            <img class="access-illustration" src="${ACCESS_DENIED_IMAGE}" alt="" aria-hidden="true">
            <h1>Không có quyền truy cập</h1>
            <p>Tài khoản hiện tại không có quyền sử dụng khu vực này.</p>
            <div class="access-actions">
              <a class="btn btn-primary" href="../index.html">Về trang chủ</a>
              <button id="switchAccountBtn" class="btn btn-outline" type="button">Đăng nhập tài khoản khác</button>
            </div>
          </section>
        </main>
      `;
      document.getElementById("switchAccountBtn").addEventListener("click", function () {
        clearAuthSession();
        window.location.href = `../login.html?redirect=${encodeURIComponent(getAdminRedirectPath())}`;
      });
      return null;
    }

    return user;
  } catch (error) {
    document.body.innerHTML = `
      <main class="admin-access-denied">
        <section class="access-card">
          <img class="access-illustration" src="${ACCESS_DENIED_IMAGE}" alt="" aria-hidden="true">
          <h1>Không thể xác thực</h1>
          <p>${escapeHtml(error.message)}</p>
          <a class="btn btn-primary" href="../login.html">Đăng nhập</a>
        </section>
      </main>
    `;
    return null;
  }
}

function showAdminMessage(elementId, type, message) {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  element.innerHTML = type === "error" ? renderError(message) : `<div class="state-box state-success">${escapeHtml(message)}</div>`;
}



async function adminDownloadFile(endpoint, fallbackFilename) {
  const token = getAuthToken();

  if (!token) {
    window.location.href = `../login.html?redirect=${encodeURIComponent(getAdminRedirectPath())}`;
    return;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (response.status === 401) {
    clearAuthSession();
    window.location.href = `../login.html?redirect=${encodeURIComponent(getAdminRedirectPath())}`;
    return;
  }

  if (!response.ok) {
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      throw new Error(data.message || "Không thể tải file.");
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(text || "Không thể tải file.");
      }
      throw error;
    }
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
  const filename = filenameMatch ? filenameMatch[1] : fallbackFilename;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename || "aerotech-export.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
