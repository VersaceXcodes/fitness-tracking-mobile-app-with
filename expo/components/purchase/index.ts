/**
 * Purchase Components - RevenueCat integration for in-app purchases
 *
 * Usage:
 * 1. Initialize purchases in App.tsx: initializePurchases()
 * 2. Wrap app with PurchaseProvider
 * 3. Use usePurchases() hook to access state and actions
 * 4. Use PaywallScreen for subscription prompts
 * 5. Use RestorePurchasesButton for restore functionality
 * 6. Use SubscriptionBadge to show subscription status
 *
 * Environment Variables Required:
 * - EXPO_PUBLIC_REVENUECAT_IOS_KEY: RevenueCat iOS API key
 * - EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: RevenueCat Android API key
 *
 * IMPORTANT: Real purchases require EAS development build.
 * Expo Go only supports RevenueCat "Preview API Mode" (mock data).
 *
 * Reference: https://www.revenuecat.com/docs/getting-started/installation/expo
 */

export { PaywallScreen } from './PaywallScreen';
export { RestorePurchasesButton } from './RestorePurchasesButton';
export { SubscriptionBadge } from './SubscriptionBadge';
