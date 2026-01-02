/**
 * LaunchPulse Stripe Wrapper for Expo/React Native
 *
 * This wrapper provides a Stripe-compatible API that routes all calls through
 * the LaunchPulse platform proxy. This allows generated apps to accept payments
 * without needing to manage their own Stripe API keys.
 *
 * For mobile apps on iOS/Android that need native IAP, use RevenueCat instead
 * (see services/purchases.ts). This Stripe wrapper is for web/Android APK
 * payments using Stripe Checkout.
 *
 * Environment Variables (auto-injected by LaunchPulse):
 * - EXPO_PUBLIC_LAUNCHPULSE_API_KEY: API token for authentication
 * - EXPO_PUBLIC_LAUNCHPULSE_PROJECT_ID: Project identifier
 * - EXPO_PUBLIC_LAUNCHPULSE_API_URL: Platform API URL
 */

import Constants from 'expo-constants';

// Get environment variables from Expo
const getEnvVar = (key: string): string | undefined => {
  // Try expo-constants first (works in most Expo environments)
  const extra = Constants.expoConfig?.extra?.[key];
  if (extra) return extra;

  // Fallback to process.env for web builds
  if (typeof process !== 'undefined' && process.env) {
    return (process.env as any)[key];
  }

  return undefined;
};

const env = {
  LAUNCHPULSE_API_KEY: getEnvVar('EXPO_PUBLIC_LAUNCHPULSE_API_KEY'),
  LAUNCHPULSE_PROJECT_ID: getEnvVar('EXPO_PUBLIC_LAUNCHPULSE_PROJECT_ID'),
  LAUNCHPULSE_API_URL: getEnvVar('EXPO_PUBLIC_LAUNCHPULSE_API_URL') || 'https://launchpulse.ai',
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

// Types
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
    },
  };

  products = {
    create: (params: ProductCreateParams) =>
      makeStripeRequest<{ id: string; name: string }>('products', params),
    list: (params: ListParams = {}) =>
      makeStripeRequest<{ data: any[]; has_more: boolean }>('products/list', params),
    retrieve: (id: string) =>
      makeStripeRequest<any>('products/get', { id }),
  };

  prices = {
    create: (params: PriceCreateParams) =>
      makeStripeRequest<{ id: string }>('prices', params),
    list: (params: ListParams & { product?: string } = {}) =>
      makeStripeRequest<{ data: any[]; has_more: boolean }>('prices/list', params),
    retrieve: (id: string) =>
      makeStripeRequest<any>('prices/get', { id }),
  };

  customers = {
    create: (params: CustomerCreateParams) =>
      makeStripeRequest<{ id: string; email: string }>('customers', params),
    list: (params: ListParams & { email?: string } = {}) =>
      makeStripeRequest<{ data: any[]; has_more: boolean }>('customers/list', params),
    retrieve: (id: string) =>
      makeStripeRequest<any>('customers/get', { id }),
  };

  subscriptions = {
    create: (params: { customer: string; items: Array<{ price: string }>; metadata?: Record<string, string> }) =>
      makeStripeRequest<{ id: string; status: string }>('subscriptions', params),
    list: (params: ListParams & { customer?: string; status?: string } = {}) =>
      makeStripeRequest<{ data: any[]; has_more: boolean }>('subscriptions/list', params),
    retrieve: (id: string) =>
      makeStripeRequest<any>('subscriptions/get', { id }),
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

  paymentIntents = {
    create: (params: { amount: number; currency: string; customer?: string }) =>
      makeStripeRequest<{ id: string; client_secret: string }>('payment-intents', params),
    retrieve: (id: string) =>
      makeStripeRequest<any>('payment-intents/get', { id }),
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
