// ==========================================
// API BASE URL
// ==========================================
const API_BASE = 'http://localhost:5000';

// ==========================================
// NAVBAR SCROLL EFFECT
// ==========================================
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.style.background = 'rgba(11, 15, 25, 0.95)';
        header.style.boxShadow = '0 5px 20px rgba(0,0,0,0.5)';
    } else {
        header.style.background = 'rgba(11, 15, 25, 0.8)';
        header.style.boxShadow = 'none';
    }
});

// ==========================================
// AUTHENTICATION
// ==========================================
const authOverlay = document.getElementById('authOverlay');
const loginForm = document.getElementById('loginForm');
const skipBrowseBtn = document.getElementById('skipBrowseBtn');
const authError = document.getElementById('authError');

function getAuthState() {
    try {
        return JSON.parse(localStorage.getItem('aeroTechAuth')) || null;
    } catch (error) {
        return null;
    }
}

function setAuthState(state) {
    localStorage.setItem('aeroTechAuth', JSON.stringify(state));
}

function updateAuthUI() {
    const state = getAuthState();
    if (!authOverlay) return;

    // Reset userStatusBtn click listener logic
    const oldUserStatusBtn = document.getElementById('userStatusBtn');
    const newUserStatusBtn = oldUserStatusBtn ? oldUserStatusBtn.cloneNode(true) : null;
    if (oldUserStatusBtn && newUserStatusBtn) {
        oldUserStatusBtn.parentNode.replaceChild(newUserStatusBtn, oldUserStatusBtn);
    }
    const userStatusBtn = document.getElementById('userStatusBtn');

    // Remove existing admin link if any
    const existingAdminLink = document.getElementById('adminDashboardLink');
    if (existingAdminLink) existingAdminLink.remove();

    if (state?.loggedIn) {
        authOverlay.style.display = 'none';
        if (userStatusBtn) {
            userStatusBtn.classList.add('logged-in');
            const name = state.full_name || state.email.split('@')[0];
            
            if (state.role === 'admin') {
                userStatusBtn.innerHTML = `<i class="fa-solid fa-user-shield"></i><span>Admin: ${name} (Đăng xuất)</span>`;
                
                // Add Admin Dashboard link to nav
                const navLeft = document.querySelector('.nav-left');
                if (navLeft && !document.getElementById('adminDashboardLink')) {
                    const adminLink = document.createElement('a');
                    adminLink.href = 'admin.html';
                    adminLink.id = 'adminDashboardLink';
                    adminLink.className = 'admin-badge';
                    adminLink.innerHTML = '<i class="fa-solid fa-gauge-high"></i> Admin';
                    navLeft.appendChild(adminLink);
                }
            } else {
                userStatusBtn.innerHTML = `<i class="fa-regular fa-user"></i><span>Xin chào ${name} (Đăng xuất)</span>`;
            }

            // Logout listener
            userStatusBtn.addEventListener('click', (e) => {
                e.preventDefault();
                setAuthState(null);
                updateAuthUI();
                location.reload(); 
            });
        }
        setCartActionsEnabled(true);
    } else {
        // MẶC ĐỊNH ẨN POPUP KHI MỞ WEB (Yêu cầu của người dùng)
        authOverlay.style.display = 'none';
        
        if (userStatusBtn) {
            userStatusBtn.classList.remove('logged-in');
            userStatusBtn.innerHTML = `<i class="fa-regular fa-user"></i><span>Đăng nhập</span>`;
            
            // Hiện popup khi người dùng chủ động nhấn vào nút Đăng nhập
            userStatusBtn.addEventListener('click', (e) => {
                e.preventDefault();
                authOverlay.style.display = 'flex';
                showView('login');
            });
        }
        setCartActionsEnabled(false);
    }
}

function showView(view) {
    const loginView = document.getElementById('loginView');
    const registerView = document.getElementById('registerView');
    const authError = document.getElementById('authError');
    
    if (authError) authError.textContent = '';
    
    if (view === 'login') {
        loginView.style.display = 'block';
        registerView.style.display = 'none';
    } else {
        loginView.style.display = 'none';
        registerView.style.display = 'block';
    }
}


function setCartActionsEnabled(enabled) {
    // Cart is always enabled - login only required at checkout
    const addButtons = document.querySelectorAll('.add-to-cart');
    addButtons.forEach(button => {
        button.classList.remove('action-disabled');
        button.disabled = false;
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('authEmail').value.trim();
        const password = document.getElementById('authPassword').value.trim();
        authError.textContent = '';

        if (!email || !password) {
            authError.textContent = 'Vui lòng nhập email và mật khẩu để tiếp tục.';
            return;
        }

        if (password.length < 8) {
            authError.textContent = 'Mật khẩu phải có độ dài tối thiểu 8 ký tự (theo QD 1.1).';
            return;
        }

        const btn = loginForm.querySelector('button[type="submit"]');
        const oldText = btn.textContent;
        btn.textContent = 'Đang xử lý...';
        btn.disabled = true;

        fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        })
        .then(res => res.json().then(data => ({ status: res.status, body: data })))
        .then(({ status, body }) => {
            btn.textContent = oldText;
            btn.disabled = false;

            if (status === 200) {
                setAuthState({ 
                    loggedIn: true, 
                    email: body.user.email, 
                    role: body.user.role,
                    full_name: body.user.full_name,
                    token: body.token 
                });

                updateAuthUI();
            } else {
                authError.textContent = body.message || 'Đăng nhập thất bại.';
            }
        })
        .catch(err => {
            btn.textContent = oldText;
            btn.disabled = false;
            authError.textContent = 'Lỗi kết nối Server! Vui lòng bật Backend ở port 5000.';
            console.error(err);
        });
    });
}

if (skipBrowseBtn) {
    skipBrowseBtn.addEventListener('click', () => {
        authOverlay.style.display = 'none';
    });
}

// Chuyển đổi giữa Đăng nhập và Đăng ký
const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn = document.getElementById('showLoginBtn');

if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showView('register');
    });
}

if (showLoginBtn) {
    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showView('login');
    });
}

// Xử lý Đăng ký
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const full_name = document.getElementById('regName').value;
        const phone = document.getElementById('regPhone').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        
        if (password.length < 8) {
            authError.textContent = 'Mật khẩu phải có ít nhất 8 ký tự.';
            return;
        }

        const btn = registerForm.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Đang xử lý...';

        fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, phone, email, password })
        })
        .then(res => res.json().then(data => ({ status: res.status, body: data })))
        .then(({ status, body }) => {
            btn.disabled = false;
            btn.textContent = 'Tạo tài khoản';
            if (status === 201) {
                alert('Đăng ký thành công! Hãy đăng nhập.');
                showView('login');
            } else {
                authError.textContent = body.message;
            }
        })
        .catch(err => {
            btn.disabled = false;
            btn.textContent = 'Tạo tài khoản';
            authError.textContent = 'Lỗi kết nối server.';
        });
    });
}

// Đóng popup khi click ra ngoài
if (authOverlay) {
    authOverlay.addEventListener('click', (e) => {
        if (e.target === authOverlay) {
            authOverlay.style.display = 'none';
        }
    });
}


// ==========================================
// CART & TOAST (localStorage-based)
// ==========================================
function getCart() {
    try { return JSON.parse(localStorage.getItem('aeroTechCart') || '[]'); } catch { return []; }
}
function saveCart(cart) { localStorage.setItem('aeroTechCart', JSON.stringify(cart)); }
function getCartCount() { return getCart().reduce((sum, item) => sum + item.qty, 0); }

function updateCartBadge() {
    const count = getCartCount();
    document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
}
updateCartBadge(); // Init on load

const toast = document.getElementById('toast');
let toastTimeout;
function showToast(msg) {
    if (!toast) return;
    if (msg) toast.querySelector('span').textContent = msg;
    clearTimeout(toastTimeout);
    toast.classList.add('show');
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// Delegate click for dynamically created view-detail buttons on product cards
document.addEventListener('click', (e) => {
    const button = e.target.closest('.view-detail-btn');
    if (!button) return;
    e.preventDefault();
    e.stopPropagation(); // Prevent card onclick from firing twice
    const card = button.closest('.product-card');
    const productId = card?.dataset.id;
    if (productId) window.location.href = `product-detail.html?id=${productId}`;
});

// Cart icon click -> show cart drawer
document.querySelectorAll('.cart-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
        e.preventDefault();
        showCartDrawer();
    });
});

function showCartDrawer() {
    let drawer = document.getElementById('cartDrawer');
    if (!drawer) {
        drawer = document.createElement('div');
        drawer.id = 'cartDrawer';
        drawer.className = 'cart-drawer-overlay';
        document.body.appendChild(drawer);
    }
    const cart = getCart();
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    drawer.innerHTML = `
        <div class="cart-drawer">
            <div class="cart-drawer-header">
                <h3><i class="fa-solid fa-cart-shopping"></i> Giỏ Hàng (${cart.reduce((s,i)=>s+i.qty,0)} SP)</h3>
                <button class="close-drawer-btn" id="closeCartDrawer"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="cart-drawer-body">
                ${cart.length === 0 ? '<p class="cart-empty-msg"><i class="fa-solid fa-box-open"></i><br>Giỏ hàng trống</p>' :
                    cart.map(item => `
                        <div class="cart-item" data-id="${item.id}">
                            <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                            <div class="cart-item-info">
                                <p class="cart-item-name">${item.name}</p>
                                <p class="cart-item-price">${item.price.toLocaleString('vi-VN')}đ</p>
                                <div class="cart-qty-controls">
                                    <button class="cart-qty-btn cart-qty-minus" data-id="${item.id}"><i class="fa-solid fa-minus"></i></button>
                                    <span class="cart-qty-value">${item.qty}</span>
                                    <button class="cart-qty-btn cart-qty-plus" data-id="${item.id}"><i class="fa-solid fa-plus"></i></button>
                                </div>
                            </div>
                            <button class="cart-item-remove" data-id="${item.id}"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    `).join('')}
            </div>
            <div class="cart-drawer-footer">
                <div class="cart-total"><span>Tổng cộng:</span><strong>${total.toLocaleString('vi-VN')}đ</strong></div>
                ${cart.length > 0 ? '<a href="checkout.html" class="btn btn-primary" style="width:100%;text-align:center;margin-top:12px;padding:12px"><i class="fa-solid fa-credit-card"></i> Thanh toán</a>' : ''}
            </div>
        </div>
    `;
    drawer.style.display = 'flex';
    setTimeout(() => drawer.classList.add('open'), 10);

    // Close
    drawer.querySelector('#closeCartDrawer').addEventListener('click', () => closeCartDrawer());
    drawer.addEventListener('click', (e) => { if (e.target === drawer) closeCartDrawer(); });

    // Quantity +/- controls
    drawer.querySelectorAll('.cart-qty-plus').forEach(btn => {
        btn.addEventListener('click', () => {
            const cart = getCart();
            const item = cart.find(i => i.id == btn.dataset.id);
            if (item) { item.qty++; saveCart(cart); updateCartBadge(); showCartDrawer(); }
        });
    });
    drawer.querySelectorAll('.cart-qty-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            const cart = getCart();
            const item = cart.find(i => i.id == btn.dataset.id);
            if (item) {
                item.qty--;
                if (item.qty <= 0) {
                    const filtered = cart.filter(i => i.id != btn.dataset.id);
                    saveCart(filtered);
                } else { saveCart(cart); }
                updateCartBadge(); showCartDrawer();
            }
        });
    });

    // Remove items
    drawer.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const cart = getCart().filter(item => item.id != id);
            saveCart(cart);
            updateCartBadge();
            showCartDrawer();
        });
    });
}
function closeCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    if (drawer) { drawer.classList.remove('open'); setTimeout(() => drawer.style.display = 'none', 300); }
}


// ==========================================
// DYNAMIC PRODUCT LOADING FROM API
// ==========================================
let allProducts = []; // Store products fetched from API

const productGrid = document.getElementById('productGrid');

/**
 * Convert a Vietnamese category/brand name to a URL-friendly slug
 * e.g. "Laptop Gaming" -> "laptop-gaming", "PC Lắp Ráp" -> "pc-lap-rap"
 */
function toSlug(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

/**
 * Parse spec tags from product fields
 */
function buildSpecTags(product) {
    const tags = [];
    const ramStorageParts = product.ram_storage ? product.ram_storage.split(',').map(s => s.trim()) : [];

    // Parse ram_storage parts into categories
    ramStorageParts.forEach(part => {
        const p = part.toLowerCase();
        if (p.includes('rtx') || p.includes('gtx') || p.includes('radeon') || p.includes('card đồ họa') || p.includes('vga') || p.includes('gddr')) {
            tags.push({ icon: 'fa-solid fa-gamepad', text: part, order: 1 });
        } else if (p.includes('ram') || p.includes('ddr') || p.includes('unified')) {
            tags.push({ icon: 'fa-solid fa-memory', text: part, order: 2 });
        } else if (p.includes('ssd') || p.includes('nvme') || p.includes('hdd') || p.includes('gen3') || p.includes('gen4') || p.includes('gen5') || p.includes('đọc') || p.includes('ghi') || p.includes('mb/s')) {
            tags.push({ icon: 'fa-solid fa-hard-drive', text: part, order: 3 });
        } else if (part.trim()) {
            tags.push({ icon: 'fa-solid fa-microchip', text: part, order: 5 });
        }
    });

    // Display tag from dedicated field
    if (product.display) {
        tags.push({ icon: 'fa-solid fa-display', text: product.display, order: 4 });
    }

    // CPU tag
    if (product.cpu) {
        tags.unshift({ icon: 'fa-solid fa-microchip', text: product.cpu, order: 0 });
    }

    // Sort by order then limit
    tags.sort((a, b) => a.order - b.order);
    return tags.slice(0, 4);
}

/**
 * Render one product card HTML from a product object
 */
function createProductCardHTML(product) {
    const price = parseInt(product.price);
    const formattedPrice = price.toLocaleString('vi-VN') + 'đ';

    // Image: use product image or a placeholder
    const imgSrc = product.image_url || 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1000&auto=format&fit=crop';

    // Derive slugs from API response names
    const categorySlug = toSlug(product.category_name);
    const brandSlug = product.brand_name ? product.brand_name.toLowerCase() : '';

    // Stock badge
    const stockCount = product.stock_count || 0;
    const stockBadge = stockCount > 0 
        ? `<span class="product-tag" style="background: rgba(0,200,83,0.2); color: #00c853; border-color: rgba(0,200,83,0.3);">Còn ${stockCount} máy</span>` 
        : '';

    // Build spec tags
    const specTags = buildSpecTags(product);
    const tagsHTML = specTags.length > 0
        ? `<div class="spec-tags">${specTags.map(t => `<span class="spec-tag"><i class="${t.icon}"></i>${t.text}</span>`).join('')}</div>`
        : '';

    return `
        <div class="product-card" 
             data-id="${product.id}"
             data-category="${categorySlug}" 
             data-brand="${brandSlug}" 
             data-price="${price}"
             style="animation-delay: ${product._delay || 0}ms"
             onclick="window.location.href='product-detail.html?id=${product.id}'">
            <div class="img-wrapper">
                ${stockBadge}
                <img src="${imgSrc}" alt="${product.name}" class="product-img" 
                     onerror="this.src='https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1000&auto=format&fit=crop'">
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                ${tagsHTML}
                <div class="product-footer">
                    <span class="price">${formattedPrice}</span>
                    <button class="btn-icon view-detail-btn" title="Xem chi tiết"><i class="fa-solid fa-eye"></i></button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render all product cards into the grid
 */
function renderProducts(products) {
    if (!productGrid) return;

    if (products.length === 0) {
        productGrid.innerHTML = `
            <div class="product-empty">
                <i class="fa-solid fa-box-open"></i>
                <p>Chưa có sản phẩm nào. Hãy thêm sản phẩm từ trang Admin.</p>
            </div>
        `;
        return;
    }

    // Add staggered animation delay
    const cardsHTML = products.map((p, i) => {
        p._delay = i * 80;
        return createProductCardHTML(p);
    }).join('');

    productGrid.innerHTML = cardsHTML;

    // Re-apply auth state to new buttons
    const state = getAuthState();
    setCartActionsEnabled(!!state?.loggedIn);
}

/**
 * Fetch products from API and render them
 */
async function loadProductsFromAPI() {
    if (!productGrid) return; // Not on products page

    try {
        const res = await fetch(`${API_BASE}/api/products`);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        allProducts = await res.json();
        renderProducts(allProducts);

        // After rendering, apply URL filters if present
        applyURLFilters();

    } catch (err) {
        console.error('Lỗi tải sản phẩm:', err);
        productGrid.innerHTML = `
            <div class="product-error">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; color: #ff6b6b;"></i>
                <p>Không thể tải sản phẩm. Hãy kiểm tra Backend đang chạy ở port 5000.</p>
                <button class="btn btn-outline" onclick="loadProductsFromAPI()">
                    <i class="fa-solid fa-rotate-right"></i> Thử lại
                </button>
            </div>
        `;
    }
}


// ==========================================
// FILTERING LOGIC (works with dynamic cards)
// ==========================================
const categoryFilters = document.querySelectorAll('.category-filter');
const brandFilters = document.querySelectorAll('.brand-filter');
const priceFilters = document.querySelectorAll('.price-filter');

function filterProducts() {
    const productCards = document.querySelectorAll('.product-card');
    
    if (productGrid) {
        productGrid.style.opacity = '0.3';
    }

    // Get selected categories
    const selectedCategories = Array.from(categoryFilters)
        .filter(cb => cb.checked && cb.value !== 'all')
        .map(cb => cb.value);
    
    // Check if 'all' is selected for categories
    const allCategoryCheckbox = document.querySelector('.category-filter[value="all"]');
    const isAllCategories = (allCategoryCheckbox && allCategoryCheckbox.checked) || selectedCategories.length === 0;

    // Get selected brands
    const selectedBrands = Array.from(brandFilters)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    // Get selected price
    const selectedPriceNode = document.querySelector('.price-filter:checked');
    const selectedPrice = selectedPriceNode ? selectedPriceNode.value : 'all';

    setTimeout(() => {
        productCards.forEach(card => {
            const category = card.dataset.category;
            const brand = card.dataset.brand;
            const price = parseInt(card.dataset.price);

            let categoryMatch = isAllCategories || selectedCategories.includes(category);
            let brandMatch = selectedBrands.length === 0 || selectedBrands.includes(brand);
            
            let priceMatch = true;
            if (selectedPrice === 'under-15') {
                priceMatch = price < 15000000;
            } else if (selectedPrice === '15-25') {
                priceMatch = price >= 15000000 && price <= 25000000;
            } else if (selectedPrice === '25-40') {
                priceMatch = price > 25000000 && price <= 40000000;
            } else if (selectedPrice === 'over-40') {
                priceMatch = price > 40000000;
            }

            if (categoryMatch && brandMatch && priceMatch) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });

        if (productGrid) {
            productGrid.style.opacity = '1';
        }
    }, 300);
}

// Add event listeners for filters
[...categoryFilters, ...brandFilters, ...priceFilters].forEach(filter => {
    filter.addEventListener('change', (e) => {
        // Special handling for 'All' category
        if (e.target.classList.contains('category-filter')) {
            if (e.target.value === 'all' && e.target.checked) {
                // Uncheck others
                categoryFilters.forEach(cb => {
                    if (cb.value !== 'all') cb.checked = false;
                });
            } else if (e.target.value !== 'all' && e.target.checked) {
                // Uncheck 'all'
                const allCheckbox = document.querySelector('.category-filter[value="all"]');
                if (allCheckbox) allCheckbox.checked = false;
            }
        }
        filterProducts();
    });
});

// ==========================================
// CATEGORY DRAWER TOGGLE
// ==========================================
const menuBtn = document.getElementById('menuBtn');
const closeDrawerBtn = document.getElementById('closeDrawerBtn');
const categoryDrawer = document.getElementById('categoryDrawer');

if (menuBtn && closeDrawerBtn && categoryDrawer) {
    menuBtn.addEventListener('click', () => {
        categoryDrawer.classList.add('open');
    });

    closeDrawerBtn.addEventListener('click', () => {
        categoryDrawer.classList.remove('open');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!categoryDrawer.contains(e.target) && !menuBtn.contains(e.target) && categoryDrawer.classList.contains('open')) {
            categoryDrawer.classList.remove('open');
        }
    });
}

// ==========================================
// THANH TÌM KIẾM
// ==========================================
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

function doSearch() {
    const keyword = searchInput ? searchInput.value.trim() : '';
    if (keyword) {
        window.location.href = `products.html?search=${encodeURIComponent(keyword)}`;
    }
}

if (searchBtn) {
    searchBtn.addEventListener('click', doSearch);
}
if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') doSearch();
    });
}

// ==========================================
// ĐỌC URL PARAMS & LỌC SẢN PHẨM TỪ URL
// ==========================================
function applyURLFilters() {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    const searchParam = params.get('search');

    const productCards = document.querySelectorAll('.product-card');

    // Tự động tick checkbox danh mục nếu có ?category= trên URL
    if (categoryParam && categoryFilters.length > 0) {
        // Bỏ tick "Tất cả"
        const allCheckbox = document.querySelector('.category-filter[value="all"]');
        if (allCheckbox) allCheckbox.checked = false;

        // Tick đúng danh mục
        const targetCheckbox = document.querySelector(`.category-filter[value="${categoryParam}"]`);
        if (targetCheckbox) {
            targetCheckbox.checked = true;
            filterProducts();
        }
    }

    // Tìm kiếm theo tên sản phẩm nếu có ?search= trên URL
    if (searchParam && productCards.length > 0) {
        const keyword = searchParam.toLowerCase();
        productCards.forEach(card => {
            const name = card.querySelector('h3')?.textContent.toLowerCase() || '';
            const desc = card.querySelector('.product-desc')?.textContent.toLowerCase() || '';
            if (name.includes(keyword) || desc.includes(keyword)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });

        // Hiện từ khóa trên page header
        const pageHeaderP = document.querySelector('.page-header p');
        if (pageHeaderP) {
            pageHeaderP.textContent = `Kết quả tìm kiếm cho: "${searchParam}"`;
        }
    }
}


// ==========================================
// SCROLL TO TOP BUTTON
// ==========================================
const scrollTopBtn = document.getElementById('scrollTopBtn');
if (scrollTopBtn) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
    });
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ==========================================
// SCROLL REVEAL ANIMATIONS
// ==========================================
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.classList.add('visible');
            }, index * 100);
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('[data-animate]').forEach(el => {
    revealObserver.observe(el);
});

// ==========================================
// HOMEPAGE CATEGORY SECTIONS (from API)
// ==========================================
async function loadHomeCategorySections() {
    const container = document.getElementById('homeCategorySections');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE}/api/products`);
        if (!res.ok) throw new Error('API error');
        const products = await res.json();

        // Group by category
        const categories = {};
        products.forEach(p => {
            const cat = p.category_name || 'Khác';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(p);
        });

        // Remove loading
        container.innerHTML = '';

        // Create a section for each category
        Object.entries(categories).forEach(([catName, catProducts]) => {
            const catSlug = toSlug(catName);
            const brands = [...new Set(catProducts.map(p => p.brand_name).filter(Boolean))];
            const section = document.createElement('div');
            section.className = 'category-row';
            section.innerHTML = `
                <div class="category-row-header">
                    <div class="category-row-title">
                        <h3>${catName}</h3>
                        <span class="category-row-divider"></span>
                        <div class="category-row-brands">
                            ${brands.slice(0, 5).map(b => `<a href="products.html?category=${catSlug}" class="brand-tab">${b}</a>`).join('')}
                        </div>
                    </div>
                    <a href="products.html?category=${catSlug}" class="category-view-all">Xem tất cả <i class="fa-solid fa-chevron-right"></i></a>
                </div>
                <div class="category-row-scroll">
                    <button class="scroll-arrow scroll-left" aria-label="Scroll left"><i class="fa-solid fa-chevron-left"></i></button>
                    <div class="category-row-track">
                        ${catProducts.map((p, i) => { p._delay = i * 60; return createProductCardHTML(p); }).join('')}
                    </div>
                    <button class="scroll-arrow scroll-right" aria-label="Scroll right"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
            `;
            container.appendChild(section);

            // Scroll arrows
            const track = section.querySelector('.category-row-track');
            const leftBtn = section.querySelector('.scroll-left');
            const rightBtn = section.querySelector('.scroll-right');
            if (leftBtn && rightBtn && track) {
                leftBtn.addEventListener('click', () => track.scrollBy({ left: -300, behavior: 'smooth' }));
                rightBtn.addEventListener('click', () => track.scrollBy({ left: 300, behavior: 'smooth' }));
            }
        });

    } catch (err) {
        console.error('Home categories error:', err);
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px">Không thể tải danh mục sản phẩm.</p>';
    }
}


// ==========================================
// INITIALIZATION
// ==========================================
updateAuthUI();
loadProductsFromAPI();
loadHomeCategorySections();
