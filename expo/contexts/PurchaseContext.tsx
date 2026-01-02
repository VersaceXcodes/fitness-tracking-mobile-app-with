/**
 * PurchaseContext - React Context for in-app purchase state
 *
 * Provides purchase state and actions throughout the app.
 * Handles initialization, entitlement checking, and purchase flow.
 *
 * Usage:
 * 1. Wrap app with PurchaseProvider
 * 2. Use usePurchases() hook to access state and actions
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';
import {
  initializePurchases,
  getOfferings,
  getCustomerInfo,
  purchasePackage as doPurchase,
  restorePurchases as doRestore,
  identifyUser,
  logOutUser,
} from '../services/purchases';

interface PurchaseContextType {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  offerings: PurchasesOfferings | null;
  customerInfo: CustomerInfo | null;
  isPremium: boolean;
  error: string | null;

  // Actions
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshCustomerInfo: () => Promise<void>;
  login: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  checkEntitlement: (entitlementId: string) => boolean;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

interface PurchaseProviderProps {
  children: ReactNode;
  premiumEntitlementId?: string;
}

/**
 * Provider component for purchase context
 */
export function PurchaseProvider({
  children,
  premiumEntitlementId = 'premium',
}: PurchaseProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user has premium entitlement
  const isPremium = customerInfo?.entitlements.active[premiumEntitlementId] !== undefined;

  // Initialize RevenueCat and fetch initial data
  useEffect(() => {
    const init = async () => {
      try {
        await initializePurchases();
        setIsInitialized(true);

        // Fetch offerings and customer info in parallel
        const [offeringsData, customerData] = await Promise.all([
          getOfferings().catch(() => null),
          getCustomerInfo().catch(() => null),
        ]);

        setOfferings(offeringsData);
        setCustomerInfo(customerData);
      } catch (err) {
        console.error('[PurchaseContext] Initialization failed:', err);
        setError('Failed to initialize purchases');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Purchase a package
  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const info = await doPurchase(pkg);
      setCustomerInfo(info);
      return true;
    } catch (err: any) {
      if (!err.userCancelled) {
        setError(err.message || 'Purchase failed');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Restore purchases
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const info = await doRestore();
      setCustomerInfo(info);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to restore purchases');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh customer info
  const refreshCustomerInfo = useCallback(async (): Promise<void> => {
    try {
      const info = await getCustomerInfo();
      setCustomerInfo(info);
    } catch (err) {
      console.error('[PurchaseContext] Failed to refresh customer info:', err);
    }
  }, []);

  // Login user
  const login = useCallback(async (userId: string): Promise<void> => {
    try {
      const info = await identifyUser(userId);
      setCustomerInfo(info);
    } catch (err) {
      console.error('[PurchaseContext] Login failed:', err);
    }
  }, []);

  // Logout user
  const logout = useCallback(async (): Promise<void> => {
    try {
      const info = await logOutUser();
      setCustomerInfo(info);
    } catch (err) {
      console.error('[PurchaseContext] Logout failed:', err);
    }
  }, []);

  // Check if user has specific entitlement
  const checkEntitlement = useCallback((entitlementId: string): boolean => {
    return customerInfo?.entitlements.active[entitlementId] !== undefined;
  }, [customerInfo]);

  const value: PurchaseContextType = {
    isInitialized,
    isLoading,
    offerings,
    customerInfo,
    isPremium,
    error,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo,
    login,
    logout,
    checkEntitlement,
  };

  return (
    <PurchaseContext.Provider value={value}>
      {children}
    </PurchaseContext.Provider>
  );
}

/**
 * Hook to access purchase context
 */
export function usePurchases(): PurchaseContextType {
  const context = useContext(PurchaseContext);
  if (!context) {
    throw new Error('usePurchases must be used within a PurchaseProvider');
  }
  return context;
}

export default PurchaseProvider;
