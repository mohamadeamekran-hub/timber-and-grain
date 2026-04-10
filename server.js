/**
 * Bois Créations - Stripe Checkout Server
 *
 * This Express server handles:
 * 1. Serving static files (HTML, CSS, JS)
 * 2. Creating Stripe Checkout Sessions (server-side)
 * 3. Redirecting to Stripe's hosted checkout page
 *
 * Setup:
 * 1. Run: npm install
 * 2. Set your Stripe secret key: export STRIPE_SECRET_KEY=sk_test_...
 * 3. Run: npm start
 * 4. Open: http://localhost:3000
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Stripe setup - uses environment variable for the secret key
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_REPLACE_WITH_YOUR_KEY';
const stripe = require('stripe')(STRIPE_SECRET_KEY);

// Your domain - update this for production
const DOMAIN = process.env.DOMAIN || `http://localhost:${PORT}`;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Product catalog with prices in MAD (centimes for Stripe)
const PRODUCTS = {
  'clock-classic':  { name: 'Solid Oak Wall Clock — Classic',     price: 105000 },
  'clock-minimal':  { name: 'Solid Oak Wall Clock — Minimalist',  price: 112000 },
  'atomizer':       { name: 'Wooden Perfume Atomizer',            price: 38000  },
  'corkscrew':      { name: 'Artisan Cork & Corkscrew',           price: 42000  },
  'earrings':       { name: 'Wooden Drop Earrings',               price: 22000  },
  'pen':            { name: 'Handturned Wooden Pen',              price: 35000  },
  'phone-stand':    { name: 'Wooden Phone & Tablet Stand',        price: 28000  },
  'coasters':       { name: 'Oak Coaster Set (4 Pieces)',         price: 32000  }
};

/**
 * POST /create-checkout-session
 *
 * Creates a Stripe Checkout Session and returns the redirect URL.
 * The client redirects to Stripe's hosted checkout page.
 * Stripe handles all PCI compliance - we never touch card data.
 */
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    // Build line items from our server-side product catalog (never trust client prices)
    const lineItems = items.map(item => {
      const product = PRODUCTS[item.id];
      if (!product) {
        throw new Error(`Unknown product: ${item.id}`);
      }
      return {
        price_data: {
          currency: 'mad',
          product_data: {
            name: product.name,
          },
          unit_amount: product.price, // in centimes
        },
        quantity: Math.min(Math.max(1, parseInt(item.qty) || 1), 10),
      };
    });

    // Calculate if free shipping applies (over 1000 MAD = 100000 centimes)
    const subtotal = lineItems.reduce((sum, li) => sum + li.price_data.unit_amount * li.quantity, 0);
    const shippingCost = subtotal >= 100000 ? 0 : 5000; // 50 MAD shipping

    // Add shipping as a line item if not free
    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'mad',
          product_data: { name: 'Standard Shipping' },
          unit_amount: shippingCost,
        },
        quantity: 1,
      });
    }

    const orderId = 'BC-' + Date.now().toString(36).toUpperCase();

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${DOMAIN}/confirmation.html?order=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/checkout.html`,
      metadata: {
        order_id: orderId,
      },
    });

    res.json({ url: session.url, orderId: orderId });
  } catch (error) {
    console.error('Stripe session error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Fallback: serve index.html for any unmatched route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Bois Créations server running at http://localhost:${PORT}`);
  if (STRIPE_SECRET_KEY === 'sk_test_REPLACE_WITH_YOUR_KEY') {
    console.log('\n⚠ WARNING: No Stripe secret key set.');
    console.log('  Set it with: export STRIPE_SECRET_KEY=sk_test_...');
    console.log('  The checkout will run in demo mode without a real key.\n');
  }
});
