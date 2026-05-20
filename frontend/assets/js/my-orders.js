document.addEventListener("DOMContentLoaded", function () {
  initMyOrdersPage();
});

async function initMyOrdersPage() {
  if (!requireLogin("my-orders.html")) {
    return;
  }

  await loadSiteLayout();
  bindOrderTabs();
  await loadOrders();
}

function bindOrderTabs() {
  document.querySelectorAll("#orderTabs button").forEach(function (button) {
    button.addEventListener("click", function () {
      document.querySelectorAll("#orderTabs button").forEach(function (item) {
        item.classList.remove("active");
      });
      button.classList.add("active");
      loadOrders(button.dataset.status);
    });
  });
}

async function loadOrders(status) {
  const container = document.getElementById("orderList");
  container.className = "order-list loading-box";
  container.innerHTML = "Đang tải đơn hàng...";

  try {
    const endpoint = status ? `/orders/my?status=${encodeURIComponent(status)}` : "/orders/my";
    const response = await authGet(endpoint);
    const orders = response.data || [];
    container.className = "order-list";

    if (!orders.length) {
      container.innerHTML = renderEmpty("Không có đơn hàng trong nhóm này.");
      return;
    }

    container.innerHTML = orders.map(renderOrderCard).join("");
  } catch (error) {
    container.innerHTML = renderError(error.message);
  }
}


