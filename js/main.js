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

// Cart counter and Toast Notification
let cartCount = 0;
const cartCountElements = document.querySelectorAll('.cart-count');
const addButtons = document.querySelectorAll('.add-to-cart');
const toast = document.getElementById('toast');

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

// Simple Filter Interaction (Visual only)
const filterLabels = document.querySelectorAll('.filter-label input[type="checkbox"]');
filterLabels.forEach(filter => {
    filter.addEventListener('change', () => {
        const productGrid = document.querySelector('.product-grid');
        if(productGrid) {
            productGrid.style.opacity = '0.3';
            setTimeout(() => {
                productGrid.style.opacity = '1';
            }, 300);
        }
    });
});
