/**
 * SubscriptionBadge - Visual indicator of subscription status
 *
 * Shows the user's current subscription status.
 * Can be used in headers, profiles, or settings screens.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { usePurchases } from '../../contexts/PurchaseContext';

interface SubscriptionBadgeProps {
  style?: ViewStyle;
  premiumLabel?: string;
  freeLabel?: string;
  showExpiry?: boolean;
}

export function SubscriptionBadge({
  style,
  premiumLabel = 'Premium',
  freeLabel = 'Free',
  showExpiry = false,
}: SubscriptionBadgeProps) {
  const { isPremium, customerInfo, isLoading } = usePurchases();

  if (isLoading) {
    return (
      <View style={[styles.badge, styles.loadingBadge, style]}>
        <Text style={styles.loadingText}>...</Text>
      </View>
    );
  }

  // Get expiration date if available
  const activeEntitlement = customerInfo?.entitlements.active?.premium;
  const expirationDate = activeEntitlement?.expirationDate;
  const formattedExpiry = expirationDate
    ? new Date(expirationDate).toLocaleDateString()
    : null;

  if (isPremium) {
    return (
      <View style={[styles.badge, styles.premiumBadge, style]}>
        <Text style={styles.premiumText}>{premiumLabel}</Text>
        {showExpiry && formattedExpiry && (
          <Text style={styles.expiryText}>Renews {formattedExpiry}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.freeBadge, style]}>
      <Text style={styles.freeText}>{freeLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadge: {
    backgroundColor: '#635BFF',
  },
  freeBadge: {
    backgroundColor: '#f0f0f0',
  },
  loadingBadge: {
    backgroundColor: '#f0f0f0',
    minWidth: 60,
  },
  premiumText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  freeText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingText: {
    color: '#999',
    fontSize: 12,
  },
  expiryText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    marginTop: 2,
  },
});

export default SubscriptionBadge;
