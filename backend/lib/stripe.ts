/**
 * LaunchPulse Stripe Wrapper for Backend
 *
 * This wrapper provides a Stripe-compatible API that routes all calls through
 * the LaunchPulse platform proxy. This allows generated apps to accept payments
 * without needing to manage their own Stripe API keys.
 *
 * Environment Variables (auto-injected by LaunchPulse):
 * - LAUNCHPULSE_API_KEY: API token for authentication
 * - LAUNCHPULSE_PROJECT_ID: Project identifier
 * - LAUNCHPULSE_API_URL: Platform API URL (default: https://launchpulse.ai)
 */

// Check if LaunchPulse env vars are set
const env = {
  LAUNCHPULSE_API_KEY: process.env.LAUNCHPULSE_API_KEY,
  LAUNCHPULSE_PROJECT_ID: process.env.LAUNCHPULSE_PROJECT_ID,
  LAUNCHPULSE_API_URL: process.env.LAUNCHPULSE_API_URL || 'https://launchpulse.ai',
};

const hasLaunchPulseEnv =
  env.LAUNCHPULSE_API_KEY &&
  env.LAUNCHPULSE_PROJECT_ID &&
  env.LAUNCHPULSE_API_URL;

// Stripe error class
class StripeError extends Error {
  type: string;
  param?: string;
  code?: string;

  constructor(message: string, type: string, param?: string, code?: string) {
    super(message);
    this.name = 'StripeError';
    this.type = type;
    this.param = param;
    this.code = code;
  }
}

// Types for Stripe API params
interface CheckoutSessionCreateParams {
  line_items: Array<{
    price?: string;
    price_data?: {
      currency: string;
      product_data: { name: string; description?: string };
      unit_amount: number;
      recurring?: { interval: 'day' | 'week' | 'month' | 'year' };
    };
    quantity: number;
  }>;
  mode: 'payment' | 'subscription' | 'setup';
  success_url: string;
  cancel_url: string;
  customer?: string;
  customer_email?: string;
  metadata?: Record<string, string>;
}

interface ProductCreateParams {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
}

interface PriceCreateParams {
  product: string;
  unit_amount: number;
  currency: string;
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count?: number;
  };
  metadata?: Record<string, string>;
}

interface CustomerCreateParams {
  email?: string;
  name?: string;
  metadata?: Record<string, string>;
}

interface SubscriptionStatusParams {
  customerId: string;
}

interface ListParams {
  limit?: number;
  starting_after?: string;
  ending_before?: string;
}

// Check if Stripe is configured
export function isStripeConfigured(): boolean {
  return hasLaunchPulseEnv;
}

// Make request to LaunchPulse proxy
async function makeStripeRequest<T>(path: string, params: any = {}): Promise<T> {
  if (!hasLaunchPulseEnv) {
    throw new StripeError(
      'LaunchPulse Stripe integration not configured. Please connect Stripe in your LaunchPulse dashboard.',
      'configuration_error',
      undefined,
      'STRIPE_NOT_CONFIGURED'
    );
  }

  const response = await fetch(`${env.LAUNCHPULSE_API_URL}/api/stripe/proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId: env.LAUNCHPULSE_PROJECT_ID,
      token: env.LAUNCHPULSE_API_KEY,
      path,
      params,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const error = data.error || { message: 'An error occurred', type: 'api_error' };
    throw new StripeError(error.message, error.type, error.param, error.code);
  }

  return data;
}

// Stripe-compatible client class
class StripeClient {
  checkout = {
    sessions: {
      create: (params: CheckoutSessionCreateParams) =>
        makeStripeRequest<{ id: string; url: string }>('checkout', params),
      list: (params: ListParams = {}) =>
        makeStripeRequest<{ data: any[]; has_more: boolean }>('checkout/list', params),
      retrieve: (id: string) =>
        makeStripeRequest<any>('checkout/get', { id }),
      expire: (id: string) =>
        makeStripeRequest<any>('checkout/expire', { id }),
    },
  };

  products = {
    create: (params: ProductCreateParams) =>
      makeStripeRequest<{ id: string; name: string }>('products', params),
    list: (params: ListParams = {}) =>
      makeStripeRequest<{ data: any[]; has_more: boolean }>('products/list', params),
    retrieve: (id: string) =>
      makeStripeRequest<any>('products/get', { id }),
    update: (id: string, params: Partial<ProductCreateParams>) =>
      makeStripeRequest<any>('products/update', { id, ...params }),
    del: (id: string) =>
      makeStripeRequest<{ id: string; deleted: boolean }>('products/delete', { id }),
  };

  prices = {
    create: (params: PriceCreateParams) =>
      makeStripeRequest<{ id: string }>('prices', params),
    list: (params: ListParams & { product?: string } = {}) =>
      makeStripeRequest<{ data: any[]; has_more: boolean }>('prices/list', params),
    retrieve: (id: string) =>
      makeStripeRequest<any>('prices/get', { id }),
    update: (id: string, params: { active?: boolean; metadata?: Record<string, string> }) =>
      makeStripeRequest<any>('prices/update', { id, ...params }),
  };

  customers = {
    create: (params: CustomerCreateParams) =>
      makeStripeRequest<{ id: string; email: string }>('customers', params),
    list: (params: ListParams & { email?: string } = {}) =>
      makeStripeRequest<{ data: any[]; has_more: boolean }>('customers/list', params),
    retrieve: (id: string) =>
      makeStripeRequest<any>('customers/get', { id }),
    update: (id: string, params: Partial<CustomerCreateParams>) =>
      makeStripeRequest<any>('customers/update', { id, ...params }),
  };

  paymentIntents = {
    create: (params: { amount: number; currency: string; customer?: string; metadata?: Record<string, string> }) =>
      makeStripeRequest<{ id: string; client_secret: string }>('payment-intents', params),
    list: (params: ListParams & { customer?: string } = {}) =>
      makeStripeRequest<{ data: any[]; has_more: boolean }>('payment-intents/list', params),
    retrieve: (id: string) =>
      makeStripeRequest<any>('payment-intents/get', { id }),
    update: (id: string, params: { metadata?: Record<string, string> }) =>
      makeStripeRequest<any>('payment-intents/update', { id, ...params }),
    confirm: (id: string, params: { payment_method?: string } = {}) =>
      makeStripeRequest<any>('payment-intents/confirm', { id, ...params }),
    cancel: (id: string) =>
      makeStripeRequest<any>('payment-intents/cancel', { id }),
  };

  subscriptions = {
    create: (params: { customer: string; items: Array<{ price: string }>; metadata?: Record<string, string> }) =>
      makeStripeRequest<{ id: string; status: string }>('subscriptions', params),
    list: (params: ListParams & { customer?: string; status?: string } = {}) =>
      makeStripeRequest<{ data: any[]; has_more: boolean }>('subscriptions/list', params),
    retrieve: (id: string) =>
      makeStripeRequest<any>('subscriptions/get', { id }),
    update: (id: string, params: { items?: Array<{ id?: string; price: string }>; cancel_at_period_end?: boolean }) =>
      makeStripeRequest<any>('subscriptions/update', { id, ...params }),
    cancel: (id: string) =>
      makeStripeRequest<any>('subscriptions/cancel', { id }),
    status: (params: SubscriptionStatusParams) =>
      makeStripeRequest<{
        isSubscribed: boolean;
        plan: string;
        expiresAt: string | null;
        subscription: any | null;
      }>('subscriptions/status', params),
  };

  invoices = {
    create: (params: { customer: string; auto_advance?: boolean; metadata?: Record<string, string> }) =>
      makeStripeRequest<{ id: string }>('invoices', params),
    list: (params: ListParams & { customer?: string } = {}) =>
      makeStripeRequest<{ data: any[]; has_more: boolean }>('invoices/list', params),
    retrieve: (id: string) =>
      makeStripeRequest<any>('invoices/get', { id }),
    finalizeInvoice: (id: string) =>
      makeStripeRequest<any>('invoices/finalize', { id }),
    pay: (id: string) =>
      makeStripeRequest<any>('invoices/pay', { id }),
    voidInvoice: (id: string) =>
      makeStripeRequest<any>('invoices/void', { id }),
  };

  refunds = {
    create: (params: { payment_intent?: string; charge?: string; amount?: number; reason?: string }) =>
      makeStripeRequest<{ id: string; status: string }>('refunds', params),
    list: (params: ListParams = {}) =>
      makeStripeRequest<{ data: any[]; has_more: boolean }>('refunds/list', params),
    retrieve: (id: string) =>
      makeStripeRequest<any>('refunds/get', { id }),
  };
}

// Export the client
const stripe = new StripeClient();

export default stripe;
export { stripe, StripeClient, StripeError };
export type {
  CheckoutSessionCreateParams,
  ProductCreateParams,
  PriceCreateParams,
  CustomerCreateParams,
  SubscriptionStatusParams,
  ListParams,
};
