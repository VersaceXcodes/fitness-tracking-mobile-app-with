/**
 * PaywallScreen - Subscription paywall UI
 *
 * Displays available subscription options and handles purchase flow.
 * Use this as a modal or full screen when prompting users to subscribe.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { usePurchases } from '../../contexts/PurchaseContext';

interface PaywallScreenProps {
  onPurchaseSuccess?: () => void;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  features?: string[];
}

export function PaywallScreen({
  onPurchaseSuccess,
  onClose,
  title = 'Unlock Premium',
  subtitle = 'Get access to all features',
  features = [
    'Unlimited access',
    'Ad-free experience',
    'Priority support',
    'Exclusive content',
  ],
}: PaywallScreenProps) {
  const { offerings, isLoading, purchasePackage, restorePurchases, error } = usePurchases();
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const packages = offerings?.current?.availablePackages || [];

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setIsPurchasing(true);
    const success = await purchasePackage(selectedPackage);
    setIsPurchasing(false);

    if (success) {
      onPurchaseSuccess?.();
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    await restorePurchases();
    setIsPurchasing(false);
  };

  const formatPrice = (pkg: PurchasesPackage) => {
    const price = pkg.product.priceString;
    const period = pkg.packageType;

    switch (period) {
      case 'ANNUAL':
        return `${price}/year`;
      case 'MONTHLY':
        return `${price}/month`;
      case 'WEEKLY':
        return `${price}/week`;
      case 'LIFETIME':
        return `${price} one-time`;
      default:
        return price;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#635BFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Close Button */}
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* Features List */}
        <View style={styles.features}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Package Options */}
        <View style={styles.packages}>
          {packages.map((pkg) => (
            <TouchableOpacity
              key={pkg.identifier}
              style={[
                styles.packageCard,
                selectedPackage?.identifier === pkg.identifier && styles.packageCardSelected,
              ]}
              onPress={() => setSelectedPackage(pkg)}
            >
              <View style={styles.packageInfo}>
                <Text style={styles.packageTitle}>
                  {pkg.packageType === 'ANNUAL' ? 'Annual' :
                   pkg.packageType === 'MONTHLY' ? 'Monthly' :
                   pkg.product.title}
                </Text>
                <Text style={styles.packagePrice}>{formatPrice(pkg)}</Text>
              </View>
              {pkg.packageType === 'ANNUAL' && (
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>Best Value</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Error Message */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Purchase Button */}
        <TouchableOpacity
          style={[
            styles.purchaseButton,
            (!selectedPackage || isPurchasing) && styles.purchaseButtonDisabled,
          ]}
          onPress={handlePurchase}
          disabled={!selectedPackage || isPurchasing}
        >
          {isPurchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              {selectedPackage ? `Subscribe ${formatPrice(selectedPackage)}` : 'Select a plan'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore Button */}
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.terms}>
          Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    paddingTop: 48,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
    lineHeight: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  features: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureCheck: {
    fontSize: 16,
    color: '#22c55e',
    marginRight: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 16,
    color: '#333',
  },
  packages: {
    marginBottom: 24,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginBottom: 12,
  },
  packageCardSelected: {
    borderColor: '#635BFF',
    backgroundColor: '#f8f7ff',
  },
  packageInfo: {
    flex: 1,
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 14,
    color: '#666',
  },
  saveBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  saveBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  purchaseButton: {
    backgroundColor: '#635BFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#a5a3ff',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  restoreButtonText: {
    color: '#635BFF',
    fontSize: 14,
  },
  terms: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});

export default PaywallScreen;
