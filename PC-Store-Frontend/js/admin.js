document.addEventListener('DOMContentLoaded', () => {
    // 1. Authentication Check
    const auth = JSON.parse(localStorage.getItem('aeroTechAuth')) || null;
    if (!auth || auth.role !== 'admin') {
        alert('Bạn không có quyền truy cập trang này!');
        window.location.href = 'products.html';
        return;
    }

    document.getElementById('adminGreeting').textContent = `Xin chào, ${auth.email}`;

    // Logout
    document.getElementById('adminLogoutBtn').addEventListener('click', () => {
        localStorage.removeItem('aeroTechAuth');
        window.location.href = 'products.html';
    });

    // Navigation Tabs Logic
    const navLinks = document.querySelectorAll('.admin-nav a');
    const sections = document.querySelectorAll('.admin-section');
    const adminTitle = document.getElementById('adminTitle');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-section');
            if (!targetId) return;

            // Update active link
            navLinks.forEach(n => n.classList.remove('active'));
            link.classList.add('active');

            // Update active section
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            // Update title
            adminTitle.textContent = link.textContent.trim();
        });
    });

    // ==========================================
    // 2. DASHBOARD STATS
    // ==========================================
    function loadDashboard() {
        fetch('http://localhost:5000/api/dashboard/stats')
            .then(res => res.json())
            .then(data => {
                document.getElementById('statRevenue').textContent = parseInt(data.total_revenue).toLocaleString('vi-VN') + 'đ';
                document.getElementById('statPending').textContent = data.pending_orders;
                document.getElementById('statOrders').textContent = data.total_orders;
                document.getElementById('statCustomers').textContent = data.customers;
                document.getElementById('statProducts').textContent = data.total_products;
                document.getElementById('statStock').textContent = data.stock_count;

                // Recent orders
                const tbody = document.getElementById('recentOrdersBody');
                if (data.recent_orders.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Chưa có đơn hàng nào</td></tr>';
                } else {
                    tbody.innerHTML = data.recent_orders.map(o => {
                        const statusColors = { 'ChoDuyet': '#f0ad4e', 'DangGiao': '#5bc0de', 'HoanThanh': '#4ecdc4', 'DaHuy': '#ff6b6b' };
                        const statusLabels = { 'ChoDuyet': 'Chờ duyệt', 'DangGiao': 'Đang giao', 'HoanThanh': 'Hoàn thành', 'DaHuy': 'Đã hủy' };
                        return `<tr>
                            <td style="font-family:monospace;font-size:0.85rem">${o.id}</td>
                            <td>${o.customer_name}</td>
                            <td style="color:var(--primary);font-weight:600">${parseInt(o.total_amount).toLocaleString('vi-VN')}đ</td>
                            <td><span style="color:${statusColors[o.status]}">${statusLabels[o.status] || o.status}</span></td>
                            <td>${new Date(o.created_at).toLocaleDateString('vi-VN')}</td>
                        </tr>`;
                    }).join('');
                }
            })
            .catch(err => console.error('Dashboard error:', err));
    }
    loadDashboard();

    // 3. Fetch & Display Products
    window.allProducts = []; // Save globally to access from edit function
    function loadProducts() {
        fetch('http://localhost:5000/api/products')
            .then(res => res.json())
            .then(products => {
                window.allProducts = products;
                const tbody = document.querySelector('#productsTable tbody');
                tbody.innerHTML = '';
                products.forEach(p => {
                    const tr = document.createElement('tr');
                    const imgHtml = p.image_url ? `<img src="${p.image_url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">` : '<span style="color:var(--text-muted)">No img</span>';
                    tr.innerHTML = `
                        <td>${p.id}</td>
                        <td>${imgHtml}</td>
                        <td>${p.name}</td>
                        <td>${p.cpu || '-'}</td>
                        <td>${p.ram_storage || '-'}</td>
                        <td>${p.display || '-'}</td>
                        <td>${parseInt(p.price).toLocaleString('vi-VN')}đ</td>
                        <td>${p.warranty_months}T</td>
                        <td><button class="btn btn-outline" style="padding: 5px 10px; font-size: 0.8rem;" onclick="editProduct(${p.id})"><i class="fa-solid fa-pen"></i></button></td>
                    `;
                    tbody.appendChild(tr);

                });
            })
            .catch(err => console.error('Lỗi tải sản phẩm:', err));
    }

    loadProducts(); // Init load

    // 3. Handle Add Product (UC-13)
    document.getElementById('addProductForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('name', document.getElementById('pName').value);
        formData.append('brand_id', document.getElementById('pBrand').value || '');
        formData.append('cpu', document.getElementById('pCpu').value);
        formData.append('ram_storage', document.getElementById('pRam').value);
        formData.append('display', document.getElementById('pDisplay').value);
        formData.append('price', document.getElementById('pPrice').value);
        formData.append('warranty_months', document.getElementById('pWarranty').value);
        
        const imageFile = document.getElementById('pImage').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }

        fetch('http://localhost:5000/api/products', {
            method: 'POST',
            body: formData // Khi gửi FormData, không cần set Content-Type header
        })

        .then(res => res.json())
        .then(data => {
            document.getElementById('productMsg').textContent = data.message;
            if (data.productId) {
                document.getElementById('addProductForm').reset();
                loadProducts(); // Reload table
            }
        })
        .catch(err => console.error(err));
    });

    // 3.1 Handle Edit Product Modal
    window.editProduct = function(id) {
        const p = window.allProducts.find(prod => prod.id === id);
        if (!p) return;
        
        document.getElementById('eProductId').value = p.id;
        document.getElementById('eName').value = p.name;
        document.getElementById('eBrand').value = p.brand_id || '';
        document.getElementById('eCpu').value = p.cpu || '';
        document.getElementById('eRam').value = p.ram_storage || '';
        document.getElementById('eDisplay').value = p.display || '';
        document.getElementById('ePrice').value = p.price;
        document.getElementById('eWarranty').value = p.warranty_months;
        document.getElementById('eImage').value = ''; // Reset file input
        
        document.getElementById('editProductModal').style.display = 'flex';
    };

    document.getElementById('editProductForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = document.getElementById('eProductId').value;
        const formData = new FormData();
        formData.append('name', document.getElementById('eName').value);
        formData.append('brand_id', document.getElementById('eBrand').value || '');
        formData.append('cpu', document.getElementById('eCpu').value);
        formData.append('ram_storage', document.getElementById('eRam').value);
        formData.append('display', document.getElementById('eDisplay').value);
        formData.append('price', document.getElementById('ePrice').value);
        formData.append('warranty_months', document.getElementById('eWarranty').value);
        
        const imageFile = document.getElementById('eImage').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }

        const btn = document.getElementById('btnSaveProduct');
        btn.disabled = true;
        btn.textContent = 'Đang lưu...';

        fetch(`http://localhost:5000/api/products/${id}`, {
            method: 'PUT',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            document.getElementById('editProductModal').style.display = 'none';
            loadProducts(); // Reload table
        })
        .catch(err => {
            console.error(err);
            alert('Lỗi khi cập nhật sản phẩm');
        })
        .finally(() => {
            btn.disabled = false;
            btn.textContent = 'Lưu Thay Đổi';
        });
    });

    // 4. Handle Import Serials (UC-15)
    document.getElementById('importSerialForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const productId = document.getElementById('sProductId').value;
        const serialsRaw = document.getElementById('sSerials').value;
        
        // Convert comma-separated string to array, remove whitespace
        const serials = serialsRaw.split(',').map(s => s.trim()).filter(s => s.length > 0);

        fetch(`http://localhost:5000/api/products/${productId}/serials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serials })
        })
        .then(res => res.json().then(data => ({ status: res.status, body: data })))
        .then(({ status, body }) => {
            const msgEl = document.getElementById('serialMsg');
            msgEl.textContent = body.message;
            msgEl.style.color = status === 201 ? 'var(--primary)' : '#ff6b6b';
            
            if (status === 201) {
                document.getElementById('importSerialForm').reset();
            }
        })
        .catch(err => console.error(err));
    });

    // ==========================================
    // 5. ORDER MANAGEMENT (UC-18 ~ UC-20)
    // ==========================================
    const API = 'http://localhost:5000';

    const statusLabels = {
        'ChoDuyet': '⏳ Chờ duyệt',
        'DangGiao': '🚚 Đang giao',
        'HoanThanh': '✅ Hoàn thành',
        'DaHuy': '❌ Đã hủy'
    };
    const statusColors = {
        'ChoDuyet': '#f0ad4e',
        'DangGiao': '#5bc0de',
        'HoanThanh': '#4ecdc4',
        'DaHuy': '#ff6b6b'
    };

    function loadOrders() {
        fetch(`${API}/api/orders`)
            .then(res => res.json())
            .then(orders => {
                const tbody = document.getElementById('ordersBody');
                const emptyMsg = document.getElementById('ordersEmpty');
                tbody.innerHTML = '';

                if (orders.length === 0) {
                    emptyMsg.style.display = 'block';
                    return;
                }
                emptyMsg.style.display = 'none';

                orders.forEach(o => {
                    const date = new Date(o.created_at).toLocaleDateString('vi-VN');
                    const payLabel = o.payment_method === 'COD' ? '💵 COD' : '🏦 CK';
                    const statusBadge = `<span style="color:${statusColors[o.status]};font-weight:600">${statusLabels[o.status] || o.status}</span>`;

                    // Build action buttons based on current status
                    let actions = `<button class="btn btn-outline" style="padding:5px 10px;font-size:0.8rem" onclick="viewOrderDetail('${o.id}')"><i class="fa-solid fa-eye"></i></button> `;
                    if (o.status === 'ChoDuyet') {
                        actions += `<button class="btn btn-outline" style="padding:5px 10px;font-size:0.8rem;border-color:#5bc0de;color:#5bc0de" onclick="updateOrderStatus('${o.id}','DangGiao')"><i class="fa-solid fa-truck"></i> Duyệt</button> `;
                        actions += `<button class="btn btn-outline" style="padding:5px 10px;font-size:0.8rem;border-color:#ff6b6b;color:#ff6b6b" onclick="updateOrderStatus('${o.id}','DaHuy')"><i class="fa-solid fa-ban"></i></button>`;
                    } else if (o.status === 'DangGiao') {
                        actions += `<button class="btn btn-outline" style="padding:5px 10px;font-size:0.8rem;border-color:#4ecdc4;color:#4ecdc4" onclick="updateOrderStatus('${o.id}','HoanThanh')"><i class="fa-solid fa-check"></i> Xong</button>`;
                    }

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-family:monospace;font-size:0.85rem">${o.id}</td>
                        <td>${o.customer_name}</td>
                        <td>${o.customer_phone}</td>
                        <td style="color:var(--primary);font-weight:600">${parseInt(o.total_amount).toLocaleString('vi-VN')}đ</td>
                        <td>${payLabel}</td>
                        <td>${statusBadge}</td>
                        <td>${date}</td>
                        <td style="white-space:nowrap">${actions}</td>
                    `;
                    tbody.appendChild(tr);
                });
            })
            .catch(err => console.error('Load orders error:', err));
    }

    // Make functions globally accessible for onclick handlers
    window.viewOrderDetail = function(orderId) {
        fetch(`${API}/api/orders/${orderId}`)
            .then(res => res.json())
            .then(data => {
                const { order, details } = data;
                const modal = document.getElementById('orderDetailModal');
                document.getElementById('modalOrderId').textContent = `Đơn hàng: ${order.id}`;

                const itemsHtml = details.map(d => `
                    <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-color);align-items:center">
                        <img src="${d.image_url || ''}" style="width:50px;height:50px;object-fit:cover;border-radius:6px;background:#1a1a2e">
                        <div style="flex:1">
                            <div style="font-weight:600">${d.product_name}</div>
                            <div style="color:var(--text-muted);font-size:0.85rem">SL: ${d.quantity} × ${parseInt(d.unit_price).toLocaleString('vi-VN')}đ</div>
                        </div>
                        <div style="color:var(--primary);font-weight:600">${(d.quantity * parseInt(d.unit_price)).toLocaleString('vi-VN')}đ</div>
                    </div>
                `).join('');

                document.getElementById('modalOrderContent').innerHTML = `
                    <div style="margin-bottom:20px">
                        <p><strong>Khách hàng:</strong> ${order.customer_name}</p>
                        <p><strong>SĐT:</strong> ${order.customer_phone}</p>
                        <p><strong>Địa chỉ:</strong> ${order.customer_address}</p>
                        <p><strong>Thanh toán:</strong> ${order.payment_method === 'COD' ? 'COD (Thanh toán khi nhận)' : 'Chuyển khoản ngân hàng'}</p>
                        <p><strong>Trạng thái:</strong> <span style="color:${statusColors[order.status]}">${statusLabels[order.status]}</span></p>
                    </div>
                    <h4 style="margin-bottom:10px">Sản phẩm đã đặt</h4>
                    ${itemsHtml}
                    <div style="text-align:right;margin-top:15px;font-size:1.2rem;color:var(--primary);font-weight:700">
                        Tổng: ${parseInt(order.total_amount).toLocaleString('vi-VN')}đ
                    </div>
                `;
                modal.style.display = 'flex';

                // Close on backdrop click
                modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
            })
            .catch(err => console.error('View detail error:', err));
    };

    window.updateOrderStatus = function(orderId, newStatus) {
        const labels = { 'DangGiao': 'DUYỆT và chuyển sang Đang giao', 'HoanThanh': 'đánh dấu HOÀN THÀNH', 'DaHuy': 'HỦY' };
        if (!confirm(`Bạn có chắc muốn ${labels[newStatus]} đơn hàng ${orderId}?`)) return;

        fetch(`${API}/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            loadOrders(); // Refresh table
        })
        .catch(err => console.error('Update status error:', err));
    };

    loadOrders(); // Init load orders
});
