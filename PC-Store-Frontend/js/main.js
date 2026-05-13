// Navbar scroll effect
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

const authOverlay = document.getElementById('authOverlay');
const loginForm = document.getElementById('loginForm');
const skipBrowseBtn = document.getElementById('skipBrowseBtn');
const authError = document.getElementById('authError');
const userStatusBtn = document.getElementById('userStatusBtn');

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
    addButtons.forEach(button => {
        if (enabled) {
            button.classList.remove('action-disabled');
            button.disabled = false;
        } else {
            button.classList.add('action-disabled');
            button.disabled = true;
        }
    });
    const cartIcons = document.querySelectorAll('.cart-icon');
    cartIcons.forEach(icon => {
        icon.style.pointerEvents = enabled ? 'auto' : 'none';
        icon.style.opacity = enabled ? '1' : '0.5';
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

        fetch('http://localhost:5000/api/auth/login', {
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

        fetch('http://localhost:5000/api/auth/register', {
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


// Removed redundant userStatusBtn listener

// Cart counter and Toast Notification
let cartCount = 0;
const cartCountElements = document.querySelectorAll('.cart-count');
const addButtons = document.querySelectorAll('.add-to-cart');
const toast = document.getElementById('toast');

updateAuthUI();

addButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Add animation to button
        button.innerHTML = '<i class="fa-solid fa-check"></i>';
        button.style.background = 'var(--primary)';
        button.style.color = '#000';
        
        setTimeout(() => {
            button.innerHTML = '<i class="fa-solid fa-plus"></i>';
            button.style.background = 'rgba(255,255,255,0.05)';
            button.style.color = 'var(--text-main)';
        }, 1500);

        // Update count
        cartCount++;
        cartCountElements.forEach(el => {
            el.textContent = cartCount;
            // Pop animation
            el.style.transform = 'scale(1.5)';
            setTimeout(() => el.style.transform = 'scale(1)', 200);
        });

        // Show toast
        showToast();
    });
});

let toastTimeout;
function showToast() {
    clearTimeout(toastTimeout);
    toast.classList.add('show');
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Actual Filtering Logic
const categoryFilters = document.querySelectorAll('.category-filter');
const brandFilters = document.querySelectorAll('.brand-filter');
const priceFilters = document.querySelectorAll('.price-filter');
const productCards = document.querySelectorAll('.product-card');

function filterProducts() {
    const productGrid = document.querySelector('.product-grid');
    if(productGrid) {
        productGrid.style.opacity = '0.3';
    }

    // Get selected categories
    const selectedCategories = Array.from(categoryFilters)
        .filter(cb => cb.checked && cb.value !== 'all')
        .map(cb => cb.value);
    
    // Check if 'all' is selected for categories
    const isAllCategories = document.querySelector('.category-filter[value="all"]').checked || selectedCategories.length === 0;

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

        if(productGrid) {
            productGrid.style.opacity = '1';
        }
    }, 300);
}

// Add event listeners
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

// Category Drawer Toggle
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
