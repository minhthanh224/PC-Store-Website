const AUTH_TOKEN_KEY = "se104_auth_token";
const AUTH_USER_KEY = "se104_auth_user";
const STAFF_ROLES = ["admin", "sales", "technician"];

function normalizeUserRole(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,
    role: String(user.role || "").toLowerCase()
  };
}

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getCurrentUser() {
  const rawUser = localStorage.getItem(AUTH_USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return normalizeUserRole(JSON.parse(rawUser));
  } catch (error) {
    return null;
  }
}

function setAuthSession(authData) {
  const user = normalizeUserRole(authData.user);

  localStorage.setItem(AUTH_TOKEN_KEY, authData.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

function getAuthHeaders() {
  const token = getAuthToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}

function isLoggedIn() {
  return Boolean(getAuthToken());
}

function isStaffUser(user) {
  const normalizedUser = normalizeUserRole(user);
  return Boolean(normalizedUser && STAFF_ROLES.includes(normalizedUser.role));
}

function getAdminHomeUrl(user) {
  return "/admin/dashboard.html";
}

function requireLogin(redirectUrl) {
  if (isLoggedIn()) {
    return true;
  }

  const target = redirectUrl || `${window.location.pathname.split("/").pop()}${window.location.search}`;
  window.location.href = `login.html?redirect=${encodeURIComponent(target)}`;
  return false;
}

async function authGet(endpoint) {
  return apiGet(endpoint, {
    headers: getAuthHeaders()
  });
}

async function authPost(endpoint, body) {
  return apiPost(endpoint, body, {
    headers: getAuthHeaders()
  });
}

async function authPut(endpoint, body) {
  return apiPut(endpoint, body, {
    headers: getAuthHeaders()
  });
}

async function authDelete(endpoint) {
  return apiDelete(endpoint, {
    headers: getAuthHeaders()
  });
}

function getRedirectTarget(defaultTarget) {
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  return redirect || defaultTarget || "account.html";
}

