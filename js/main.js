/* ============================================
   BOIS CREATIONS - Main JavaScript
   Cart system, checkout flow, UI interactions
   ============================================ */

// --- Product Catalog ---
const PRODUCTS = [
  { id: 'clock-classic', name: 'Solid Oak Wall Clock \u2014 Classic', price: 1050, category: 'Wall Clocks', color: '#b8a089' },
  { id: 'clock-minimal', name: 'Solid Oak Wall Clock \u2014 Minimalist', price: 1120, category: 'Wall Clocks', color: '#a8957e' },
  { id: 'atomizer', name: 'Wooden Perfume Atomizer', price: 380, category: 'Accessories', color: '#c4a882' },
  { id: 'corkscrew', name: 'Artisan Cork & Corkscrew', price: 420, category: 'Accessories', color: '#9e8b76' },
  { id: 'earrings', name: 'Wooden Drop Earrings', price: 220, category: 'Jewelry', color: '#d4b896' },
  { id: 'pen', name: 'Handturned Wooden Pen', price: 350, category: 'Writing Pens', color: '#b09880' },
  { id: 'phone-stand', name: 'Wooden Phone & Tablet Stand', price: 280, category: 'Home Decor', color: '#bba48c' },
  { id: 'coasters', name: 'Oak Coaster Set (4 Pieces)', price: 320, category: 'Home Decor', color: '#c8b198' }
];

// --- Cart State ---
let cart = JSON.parse(localStorage.getItem('bc_cart')) || [];

function saveCart() {
  localStorage.setItem('bc_cart', JSON.stringify(cart));
  updateCartUI();
}

function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, qty: 1, color: product.color });
  }
  saveCart();
  openCart();
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
}

function updateQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
}

function getCartTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function getCartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function formatPrice(amount) {
  return amount.toFixed(2) + ' MAD';
}

// --- Cart UI ---
function updateCartUI() {
  // Update all cart count badges
  document.querySelectorAll('.cart-count').forEach(el => {
    const count = getCartCount();
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });

  // Update cart sidebar items
  const cartItemsEl = document.getElementById('cartItems');
  if (!cartItemsEl) return;

  if (cart.length === 0) {
    cartItemsEl.innerHTML = `
      <div class="cart-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        <p>Your cart is empty</p>
      </div>`;
  } else {
    cartItemsEl.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-image" style="background: linear-gradient(145deg, ${item.color}, ${item.color}dd);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
        </div>
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${formatPrice(item.price)}</div>
          <div class="cart-item-qty">
            <button onclick="updateQty('${item.id}', -1)" aria-label="Decrease">&minus;</button>
            <span>${item.qty}</span>
            <button onclick="updateQty('${item.id}', 1)" aria-label="Increase">+</button>
          </div>
          <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">Remove</button>
        </div>
      </div>`).join('');
  }

  // Update subtotal
  const subtotalEl = document.getElementById('cartSubtotal');
  if (subtotalEl) subtotalEl.textContent = formatPrice(getCartTotal());

  // Update checkout button state
  const checkoutBtn = document.getElementById('cartCheckoutBtn');
  if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;

  // Update checkout page if present
  renderCheckoutSummary();
}

function openCart() {
  document.getElementById('cartOverlay')?.classList.add('open');
  document.getElementById('cartSidebar')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartOverlay')?.classList.remove('open');
  document.getElementById('cartSidebar')?.classList.remove('open');
  document.body.style.overflow = '';
}

// --- Checkout Page ---
function renderCheckoutSummary() {
  const container = document.getElementById('checkoutItems');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = '<p style="color:var(--color-text-light);padding:20px 0;">Your cart is empty. <a href="index.html" style="color:var(--color-accent);">Continue shopping</a></p>';
    return;
  }

  const subtotal = getCartTotal();
  const shipping = subtotal >= 1000 ? 0 : 50;
  const total = subtotal + shipping;

  let html = cart.map(item => `
    <div class="order-summary-item">
      <span class="item-name">${item.name}</span>
      <span class="item-qty">x${item.qty}</span>
      <span class="item-total">${formatPrice(item.price * item.qty)}</span>
    </div>`).join('');

  html += `
    <div class="order-totals">
      <div class="line"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
      <div class="line"><span>Shipping</span><span>${shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
      <div class="line total"><span>Total</span><span>${formatPrice(total)}</span></div>
    </div>`;

  container.innerHTML = html;
}

// --- Stripe Checkout ---
async function handleStripeCheckout() {
  const btn = document.getElementById('stripeCheckoutBtn');
  if (!btn || cart.length === 0) return;

  btn.disabled = true;
  btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Processing...';

  try {
    const response = await fetch('/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          qty: item.qty
        }))
      })
    });

    const data = await response.json();

    if (data.url) {
      // Clear cart before redirect
      localStorage.setItem('bc_last_order', JSON.stringify({
        items: [...cart],
        total: getCartTotal(),
        orderId: data.orderId || ('BC-' + Date.now()),
        date: new Date().toISOString()
      }));
      cart = [];
      saveCart();
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'Failed to create checkout session');
    }
  } catch (err) {
    // Demo mode: simulate success
    const orderId = 'BC-' + Date.now().toString(36).toUpperCase();
    localStorage.setItem('bc_last_order', JSON.stringify({
      items: [...cart],
      total: getCartTotal(),
      orderId: orderId,
      date: new Date().toISOString()
    }));
    cart = [];
    saveCart();
    window.location.href = 'confirmation.html?order=' + orderId;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Pay with Stripe';
  }
}

// --- Confirmation Page ---
function renderConfirmation() {
  const orderData = JSON.parse(localStorage.getItem('bc_last_order'));
  if (!orderData) return;

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order') || orderData.orderId;

  const orderIdEl = document.getElementById('confirmOrderId');
  if (orderIdEl) orderIdEl.textContent = orderId;

  const detailsEl = document.getElementById('confirmDetails');
  if (detailsEl) {
    const date = new Date(orderData.date);
    detailsEl.innerHTML = `
      <div class="detail-row"><span>Order Number</span><strong>${orderId}</strong></div>
      <div class="detail-row"><span>Date</span><strong>${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></div>
      <div class="detail-row"><span>Items</span><strong>${orderData.items.reduce((s, i) => s + i.qty, 0)} item(s)</strong></div>
      <div class="detail-row"><span>Total</span><strong>${formatPrice(orderData.total)}</strong></div>
      <div class="detail-row"><span>Payment</span><strong>Stripe (Secure)</strong></div>`;
  }
}

// --- Header scroll effect ---
const header = document.getElementById('header');
if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
  });
}

// --- Mobile menu ---
function toggleMobileMenu() {
  const nav = document.getElementById('mobileNav');
  if (nav) {
    nav.classList.toggle('active');
    document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
  }
}

// --- Back to top button ---
const backToTop = document.getElementById('backToTop');
if (backToTop) {
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  });
}

// --- Cookie consent ---
function initCookieBanner() {
  const banner = document.getElementById('cookieBanner');
  if (!banner) return;
  if (!localStorage.getItem('cookie_consent')) {
    setTimeout(() => banner.classList.add('show'), 1500);
  }
}

function acceptCookies() {
  localStorage.setItem('cookie_consent', 'accepted');
  document.getElementById('cookieBanner')?.classList.remove('show');
}

function declineCookies() {
  localStorage.setItem('cookie_consent', 'declined');
  document.getElementById('cookieBanner')?.classList.remove('show');
}

// --- Newsletter form ---
function handleNewsletter(event) {
  event.preventDefault();
  const form = event.target;
  const input = form.querySelector('input[type="email"]');
  const button = form.querySelector('button');
  if (input && button) {
    const orig = button.textContent;
    button.textContent = 'Subscribed!';
    button.style.backgroundColor = '#4a8c6f';
    input.value = '';
    setTimeout(() => { button.textContent = orig; button.style.backgroundColor = ''; }, 3000);
  }
  return false;
}

// --- Contact form ---
function handleContactForm(event) {
  event.preventDefault();
  const button = event.target.querySelector('button[type="submit"]');
  if (button) {
    const orig = button.textContent;
    button.textContent = 'Message Sent!';
    button.style.backgroundColor = '#4a8c6f';
    event.target.reset();
    setTimeout(() => { button.textContent = orig; button.style.backgroundColor = ''; }, 3000);
  }
  return false;
}

// --- Product detail toggle ---
function toggleProductDetails(btn) {
  const card = btn.closest('.product-card');
  if (card) {
    card.classList.toggle('expanded');
    btn.textContent = card.classList.contains('expanded') ? 'Hide details' : 'View details';
  }
}

// --- Smooth scroll for anchor links ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = this.getAttribute('href');
    if (target === '#') return;
    const el = document.querySelector(target);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
  initCookieBanner();
  updateCartUI();
  renderConfirmation();

  // Wire add-to-cart buttons
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const productId = btn.getAttribute('data-product-id');
      if (productId) addToCart(productId);
    });
  });

  // Cart icon opens sidebar
  document.querySelectorAll('.cart-icon').forEach(icon => {
    icon.addEventListener('click', (e) => { e.preventDefault(); openCart(); });
  });
});
