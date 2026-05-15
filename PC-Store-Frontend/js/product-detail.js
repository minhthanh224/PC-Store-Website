// ==========================================
// PRODUCT DETAIL PAGE
// ==========================================
(function() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    const detailContent = document.getElementById('detailContent');
    const detailLoading = document.getElementById('detailLoading');
    const breadcrumbName = document.getElementById('breadcrumbName');

    if (!productId) {
        if (detailContent) {
            detailContent.innerHTML = `
                <div class="product-empty" style="grid-column:1/-1">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:2.5rem;color:#ff6b6b"></i>
                    <p>Không tìm thấy sản phẩm. <a href="products.html" style="color:var(--primary)">Quay lại danh sách</a></p>
                </div>`;
        }
        return;
    }

    async function loadDetail() {
        try {
            const res = await fetch(`${API_BASE}/api/products`);
            if (!res.ok) throw new Error('API error');
            const products = await res.json();
            const product = products.find(p => p.id == productId);

            if (!product) {
                detailContent.innerHTML = `
                    <div class="product-empty" style="grid-column:1/-1">
                        <i class="fa-solid fa-box-open" style="font-size:2.5rem"></i>
                        <p>Sản phẩm không tồn tại. <a href="products.html" style="color:var(--primary)">Quay lại</a></p>
                    </div>`;
                return;
            }

            // Update page title & breadcrumb
            document.title = `${product.name} | AeroTech`;
            if (breadcrumbName) breadcrumbName.textContent = product.name;

            const price = parseInt(product.price);
            const formattedPrice = price.toLocaleString('vi-VN') + 'd';
            const imgSrc = product.image_url || 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1000&auto=format&fit=crop';
            // Mock stock for demo purposes if 0
            const stockCount = product.stock_count > 0 ? product.stock_count : 10;
            const stockText = `<span class="detail-stock in-stock"><i class="fa-solid fa-circle-check"></i> Còn hàng (${stockCount} máy)</span>`;

            // Build specs list
            const specs = [];
            if (product.cpu) specs.push({ label: 'CPU', value: product.cpu });
            if (product.ram_storage) specs.push({ label: 'RAM / Lưu trữ', value: product.ram_storage });
            if (product.display) specs.push({ label: 'Màn hình', value: product.display });
            if (product.brand_name) specs.push({ label: 'Thương hiệu', value: product.brand_name });
            if (product.category_name) specs.push({ label: 'Danh mục', value: product.category_name });

            const specsHTML = specs.length > 0 ? `
                <div class="detail-specs">
                    <h3><i class="fa-solid fa-microchip"></i> Thông số kỹ thuật</h3>
                    <table class="specs-table">
                        ${specs.map(s => `<tr><td class="spec-label">${s.label}</td><td class="spec-value">${s.value}</td></tr>`).join('')}
                    </table>
                </div>
            ` : '';

            const desc = product.description || [product.cpu, product.ram_storage, product.display].filter(Boolean).join(' | ') || 'Chưa có mô tả chi tiết.';

            detailContent.innerHTML = `
                <div class="detail-image">
                    <div class="detail-img-wrapper">
                        <img src="${imgSrc}" alt="${product.name}" id="mainProductImg"
                             onerror="this.src='https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1000&auto=format&fit=crop'">
                    </div>
                </div>
                <div class="detail-info">
                    <p class="detail-brand">${product.brand_name || ''}</p>
                    <h1 class="detail-name">${product.name}</h1>
                    ${stockText}
                    <p class="detail-desc">${desc}</p>
                    <div class="detail-price-block">
                        <span class="detail-price">${formattedPrice}</span>
                    </div>
                    <div class="detail-actions">
                        <button class="btn btn-primary detail-add-cart" data-id="${product.id}">
                            <i class="fa-solid fa-cart-plus"></i> Thêm vào giỏ hàng
                        </button>
                        <button class="btn btn-outline" onclick="window.location.href='products.html'">
                            <i class="fa-solid fa-arrow-left"></i> Tiếp tục mua sắm
                        </button>
                    </div>
                    ${specsHTML}
                </div>
            `;

            // Add to cart handler
            const addBtn = detailContent.querySelector('.detail-add-cart');
            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    // Use global cart logic from main.js
                    const cart = getCart();
                    const existing = cart.find(item => item.id == product.id);
                    if (existing) {
                        existing.qty++;
                    } else {
                        cart.push({ id: product.id, name: product.name, price: price, image: imgSrc, qty: 1 });
                    }
                    saveCart(cart);
                    updateCartBadge();
                    
                    document.querySelectorAll('.cart-count').forEach(el => {
                        el.style.transform = 'scale(1.5)';
                        setTimeout(() => el.style.transform = 'scale(1)', 200);
                    });

                    showToast('Đã thêm vào giỏ hàng!');

                    // Button feedback
                    addBtn.innerHTML = '<i class="fa-solid fa-check"></i> Đã thêm!';
                    setTimeout(() => {
                        addBtn.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Thêm vào giỏ hàng';
                    }, 2000);
                });
            }

        } catch (err) {
            console.error('Detail load error:', err);
            detailContent.innerHTML = `
                <div class="product-error" style="grid-column:1/-1">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:2.5rem;color:#ff6b6b"></i>
                    <p>Không thể tải sản phẩm. Hãy kiểm tra Backend.</p>
                    <button class="btn btn-outline" onclick="location.reload()">
                        <i class="fa-solid fa-rotate-right"></i> Thử lại
                    </button>
                </div>`;
        }
    }

    loadDetail();
})();
