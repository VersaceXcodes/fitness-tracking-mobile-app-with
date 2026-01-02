# Backend Boilerplate

Express.js backend with PostgreSQL, JWT authentication, and payment integration.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Start development server
npm run dev
```

## Features

- **Express.js** server with TypeScript
- **PostgreSQL** database with connection pooling
- **JWT Authentication** (register, login, token verification)
- **Payment Integration** via LaunchPulse Stripe proxy

---

## Payment Integration

This backend includes a LaunchPulse Stripe wrapper that allows you to accept payments without managing Stripe API keys directly.

### Setup

1. **Connect Stripe** in your LaunchPulse dashboard
2. **Environment variables** are auto-injected:
   ```env
   LAUNCHPULSE_API_KEY=lp_xxx...
   LAUNCHPULSE_PROJECT_ID=your-project-id
   LAUNCHPULSE_API_URL=https://launchpulse.ai
   ```

### Using Payment Routes

Add payment routes to your server:

```typescript
// In server.ts
import paymentRoutes from './routes/payments';

// Add after other middleware
app.use('/api/payments', paymentRoutes);
```

### Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payments/config` | GET | Check if payments are configured |
| `/api/payments/checkout` | POST | Create Stripe Checkout session |
| `/api/payments/checkout/:sessionId` | GET | Retrieve checkout session |
| `/api/payments/subscription` | POST | Create subscription |
| `/api/payments/subscription/status` | GET | Check subscription status |
| `/api/payments/subscription/:id` | DELETE | Cancel subscription |
| `/api/payments/customer` | POST | Create customer |
| `/api/payments/customer` | GET | Find customer by email |
| `/api/payments/products` | GET | List products |
| `/api/payments/prices` | GET | List prices |
| `/api/payments/invoices` | GET | List invoices |
| `/api/payments/refund` | POST | Create refund |

### Example: Create Checkout Session

```typescript
// POST /api/payments/checkout
{
  "priceId": "price_xxx",
  "quantity": 1,
  "mode": "subscription",  // or "payment"
  "successUrl": "https://yourapp.com/success",
  "cancelUrl": "https://yourapp.com/cancel",
  "customerEmail": "customer@example.com"
}

// Response
{
  "sessionId": "cs_xxx",
  "url": "https://checkout.stripe.com/..."
}
```

### Using the Stripe Client Directly

```typescript
import stripe from './lib/stripe';

// Create a checkout session
const session = await stripe.checkout.sessions.create({
  line_items: [{ price: 'price_xxx', quantity: 1 }],
  mode: 'subscription',
  success_url: 'https://yourapp.com/success',
  cancel_url: 'https://yourapp.com/cancel',
});

// Check subscription status
const status = await stripe.subscriptions.status({
  customerId: 'cus_xxx'
});

// List products
const products = await stripe.products.list({ limit: 10 });
```

### Protected Payment Routes

Combine with auth middleware for protected payments:

```typescript
import { authenticate_token } from './server';
import paymentRoutes from './routes/payments';

// All payment routes require authentication
app.use('/api/payments', authenticate_token, paymentRoutes);
```

---

## Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login user |
| `/api/auth/verify` | GET | Verify token (protected) |
| `/api/auth/me` | GET | Get current user (protected) |
| `/api/auth/profile` | PUT | Update profile (protected) |

---

## Environment Variables

```env
# Database
DATABASE_URL=postgres://...
# Or individual values:
PGHOST=localhost
PGDATABASE=mydb
PGUSER=postgres
PGPASSWORD=password
PGPORT=5432

# Auth
JWT_SECRET=your-secret-key

# Frontend URL (for CORS and redirects)
FRONTEND_URL=http://localhost:5173

# Payment (auto-injected by LaunchPulse)
LAUNCHPULSE_API_KEY=lp_xxx...
LAUNCHPULSE_PROJECT_ID=your-project-id
LAUNCHPULSE_API_URL=https://launchpulse.ai
```

---

## Project Structure

```
backend-boilerplate/
├── lib/
│   └── stripe.ts       # LaunchPulse Stripe wrapper
├── routes/
│   └── payments.ts     # Payment API routes
├── server.ts           # Main Express server
├── schema.ts           # Database schema
├── initdb.js           # Database initialization
├── package.json
└── README.md
```

---

## Direct Stripe Integration (Alternative)

If you prefer direct Stripe integration instead of using the LaunchPulse proxy:

1. Install Stripe: `npm install stripe`
2. Add your Stripe secret key to `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_xxx
   ```
3. Create a Stripe client:
   ```typescript
   import Stripe from 'stripe';
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
   ```

Note: The LaunchPulse proxy approach is recommended as it handles connected accounts automatically.
