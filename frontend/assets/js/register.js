document.addEventListener("DOMContentLoaded", function () {
  initRegisterPage();
});

async function initRegisterPage() {
  await loadSiteLayout();

  if (isLoggedIn()) {
    window.location.href = "account.html";
    return;
  }

  document.getElementById("registerForm").addEventListener("submit", handleRegister);
}

async function handleRegister(event) {
  event.preventDefault();

  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById("registerConfirmPassword").value;
  const message = document.getElementById("authMessage");

  if (password !== confirmPassword) {
    message.innerHTML = renderError("Mật khẩu xác nhận không khớp.");
    return;
  }

  message.innerHTML = renderLoading("Đang tạo tài khoản...");

  try {
    const response = await apiPost("/auth/register", {
      full_name: document.getElementById("registerFullName").value.trim(),
      email: document.getElementById("registerEmail").value.trim(),
      phone: document.getElementById("registerPhone").value.trim(),
      password
    });

    setAuthSession(response.data);
    window.location.href = "account.html";
  } catch (error) {
    message.innerHTML = renderError(error.message);
  }
}


