document.addEventListener("DOMContentLoaded", function () {
  initLoginPage();
});

async function initLoginPage() {
  await loadSiteLayout();

  if (isLoggedIn()) {
    window.location.href = getRedirectTarget("account.html");
    return;
  }

  document.getElementById("loginForm").addEventListener("submit", handleLogin);
}

async function handleLogin(event) {
  event.preventDefault();

  const message = document.getElementById("authMessage");
  message.innerHTML = renderLoading("Đang đăng nhập...");

  try {
    const response = await apiPost("/auth/login", {
      email: document.getElementById("loginEmail").value.trim(),
      password: document.getElementById("loginPassword").value
    });

    setAuthSession(response.data);
    window.location.href = getRedirectTarget("account.html");
  } catch (error) {
    message.innerHTML = renderError(error.message);
  }
}


