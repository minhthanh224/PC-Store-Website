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

    // 2. Fetch & Display Products
    function loadProducts() {
        fetch('http://localhost:5000/api/products')
            .then(res => res.json())
            .then(products => {
                const tbody = document.querySelector('#productsTable tbody');
                tbody.innerHTML = '';
                products.forEach(p => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${p.id}</td>
                        <td>${p.name}</td>
                        <td>${p.cpu || '-'}</td>
                        <td>${p.ram_storage || '-'}</td>
                        <td>${parseInt(p.price).toLocaleString('vi-VN')}đ</td>
                        <td>${p.warranty_months}T</td>
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
        
        const payload = {
            name: document.getElementById('pName').value,
            brand_id: document.getElementById('pBrand').value || null,
            cpu: document.getElementById('pCpu').value,
            ram_storage: document.getElementById('pRam').value,
            price: document.getElementById('pPrice').value,
            warranty_months: document.getElementById('pWarranty').value,
        };

        fetch('http://localhost:5000/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
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
});
