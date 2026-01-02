/**
 * Payment Routes for Backend
 *
 * These routes provide payment functionality using the LaunchPulse Stripe proxy.
 * Import and use with: app.use('/api/payments', paymentRoutes);
 */

import { Router, Request, Response } from 'express';
import stripe, { isStripeConfigured, StripeError } from '../lib/stripe';

const router = Router();

// Middleware to check if Stripe is configured
const requireStripe = (req: Request, res: Response, next: Function) => {
  if (!isStripeConfigured()) {
    return res.status(503).json({
      error: 'Payment system not configured',
      message: 'Please connect Stripe in your LaunchPulse dashboard.',
      code: 'STRIPE_NOT_CONFIGURED'
    });
  }
  next();
};

// Error handler for Stripe errors
const handleStripeError = (error: any, res: Response) => {
  console.error('[Payments] Error:', error);

  if (error instanceof StripeError) {
    return res.status(400).json({
      error: error.message,
      type: error.type,
      code: error.code,
      param: error.param
    });
  }

  return res.status(500).json({
    error: 'Payment processing error',
    message: error.message || 'An unexpected error occurred'
  });
};

/**
 * POST /api/payments/checkout
 * Create a Stripe Checkout session
 */
router.post('/checkout', requireStripe, async (req: Request, res: Response) => {
  try {
    const { priceId, quantity = 1, mode = 'payment', successUrl, cancelUrl, customerEmail, metadata } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'priceId is required' });
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity }],
      mode,
      success_url: successUrl || `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/payment/cancel`,
      customer_email: customerEmail,
      metadata
    });

    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    handleStripeError(error, res);
  }
});

/**
 * GET /api/payments/checkout/:sessionId
 * Retrieve a checkout session
 */
router.get('/checkout/:sessionId', requireStripe, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json(session);
  } catch (error) {
    handleStripeError(error, res);
  }
});

/**
 * POST /api/payments/subscription
 * Create a subscription for a customer
 */
router.post('/subscription', requireStripe, async (req: Request, res: Response) => {
  try {
    const { customerId, priceId, metadata } = req.body;

    if (!customerId || !priceId) {
      return res.status(400).json({ error: 'customerId and priceId are required' });
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata
    });

    res.json(subscription);
  } catch (error) {
    handleStripeError(error, res);
  }
});

/**
 * GET /api/payments/subscription/status
 * Check subscription status for a customer
 */
router.get('/subscription/status', requireStripe, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.query;

    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({ error: 'customerId query parameter is required' });
    }

    const status = await stripe.subscriptions.status({ customerId });
    res.json(status);
  } catch (error) {
    handleStripeError(error, res);
  }
});

/**
 * DELETE /api/payments/subscription/:subscriptionId
 * Cancel a subscription
 */
router.delete('/subscription/:subscriptionId', requireStripe, async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    res.json(subscription);
  } catch (error) {
    handleStripeError(error, res);
  }
});

/**
 * POST /api/payments/customer
 * Create a customer
 */
router.post('/customer', requireStripe, async (req: Request, res: Response) => {
  try {
    const { email, name, metadata } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const customer = await stripe.customers.create({ email, name, metadata });
    res.json(customer);
  } catch (error) {
    handleStripeError(error, res);
  }
});

/**
 * GET /api/payments/customer
 * Find a customer by email
 */
router.get('/customer', requireStripe, async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'email query parameter is required' });
    }

    const customers = await stripe.customers.list({ email, limit: 1 });

    if (customers.data.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customers.data[0]);
  } catch (error) {
    handleStripeError(error, res);
  }
});

/**
 * GET /api/payments/products
 * List available products
 */
router.get('/products', requireStripe, async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const products = await stripe.products.list({ limit: Number(limit) });
    res.json(products);
  } catch (error) {
    handleStripeError(error, res);
  }
});

/**
 * GET /api/payments/prices
 * List prices for a product
 */
router.get('/prices', requireStripe, async (req: Request, res: Response) => {
  try {
    const { productId, limit = 10 } = req.query;
    const prices = await stripe.prices.list({
      product: productId as string,
      limit: Number(limit)
    });
    res.json(prices);
  } catch (error) {
    handleStripeError(error, res);
  }
});

/**
 * POST /api/payments/refund
 * Create a refund
 */
router.post('/refund', requireStripe, async (req: Request, res: Response) => {
  try {
    const { paymentIntentId, amount, reason } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'paymentIntentId is required' });
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount, // Optional: partial refund amount in cents
      reason  // Optional: 'duplicate', 'fraudulent', or 'requested_by_customer'
    });

    res.json(refund);
  } catch (error) {
    handleStripeError(error, res);
  }
});

/**
 * GET /api/payments/invoices
 * List invoices for a customer
 */
router.get('/invoices', requireStripe, async (req: Request, res: Response) => {
  try {
    const { customerId, limit = 10 } = req.query;
    const invoices = await stripe.invoices.list({
      customer: customerId as string,
      limit: Number(limit)
    });
    res.json(invoices);
  } catch (error) {
    handleStripeError(error, res);
  }
});

/**
 * GET /api/payments/config
 * Check if payments are configured (no auth required)
 */
router.get('/config', (req: Request, res: Response) => {
  res.json({
    configured: isStripeConfigured(),
    message: isStripeConfigured()
      ? 'Payment system is configured and ready'
      : 'Payment system not configured. Please connect Stripe in LaunchPulse.'
  });
});

export default router;
