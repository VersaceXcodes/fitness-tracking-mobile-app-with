/**
 * RevenueCat Purchases Service
 *
 * Handles in-app purchases for iOS and Android using RevenueCat SDK.
 * Abstracts platform-specific purchase logic into a unified API.
 *
 * IMPORTANT: Expo Go only supports "Preview API Mode" (mock data).
 * Real purchases require EAS development build.
 *
 * Setup:
 * 1. Install: npx expo install react-native-purchases
 * 2. Add to app.json plugins: ["react-native-purchases", { "ios": { "usesStoreKit2": true } }]
 * 3. Set environment variables: EXPO_PUBLIC_REVENUECAT_IOS_KEY, EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
 * 4. Build with EAS: eas build --platform ios --profile development
 *
 * Reference: https://www.revenuecat.com/docs/getting-started/installation/expo
 */

import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PurchasesPackage,
  CustomerInfo,
  PurchasesOfferings,
  PurchasesError,
} from 'react-native-purchases';

// API Keys from environment
const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts (e.g., in App.tsx or _layout.tsx)
 */
export async function initializePurchases(): Promise<void> {
  // Enable debug logs in development
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  } else {
    Purchases.setLogLevel(LOG_LEVEL.INFO);
  }

  const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;

  if (!apiKey) {
    console.warn(
      '[Purchases] RevenueCat API key not configured. ' +
      'Set EXPO_PUBLIC_REVENUECAT_IOS_KEY or EXPO_PUBLIC_REVENUECAT_ANDROID_KEY'
    );
    return;
  }

  try {
    await Purchases.configure({ apiKey });
    console.log('[Purchases] RevenueCat initialized successfully');
  } catch (error) {
    console.error('[Purchases] Failed to initialize:', error);
  }
}

/**
 * Get available product offerings
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (error) {
    console.error('[Purchases] Failed to get offerings:', error);
    throw error;
  }
}

/**
 * Purchase a package (subscription or one-time)
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<CustomerInfo> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (error) {
    const purchaseError = error as PurchasesError;
    if (purchaseError.userCancelled) {
      console.log('[Purchases] User cancelled purchase');
    } else {
      console.error('[Purchases] Purchase failed:', error);
    }
    throw error;
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error('[Purchases] Failed to restore purchases:', error);
    throw error;
  }
}

/**
 * Get current customer info (entitlements, subscriptions, etc.)
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('[Purchases] Failed to get customer info:', error);
    throw error;
  }
}

/**
 * Check if user has a specific entitlement (premium access)
 */
export async function hasEntitlement(
  entitlementId: string
): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return !!customerInfo.entitlements.active[entitlementId];
  } catch (error) {
    console.error('[Purchases] Failed to check entitlement:', error);
    return false;
  }
}

/**
 * Identify user (for linking purchases to your user system)
 */
export async function identifyUser(userId: string): Promise<CustomerInfo> {
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo;
  } catch (error) {
    console.error('[Purchases] Failed to identify user:', error);
    throw error;
  }
}

/**
 * Log out current user (switch to anonymous)
 */
export async function logOutUser(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.logOut();
    return customerInfo;
  } catch (error) {
    console.error('[Purchases] Failed to log out:', error);
    throw error;
  }
}

/**
 * Set user email for customer support
 */
export function setUserEmail(email: string): void {
  Purchases.setEmail(email);
}

/**
 * Set user attributes for analytics
 */
export function setUserAttributes(attributes: Record<string, string>): void {
  Purchases.setAttributes(attributes);
}
