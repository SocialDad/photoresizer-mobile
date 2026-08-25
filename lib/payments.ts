import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage, type CustomerInfo } from 'react-native-purchases';
import { useStore } from '@/lib/store';

export const getApiKey = (): string | undefined => {
  if (__DEV__ && process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY) {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
  }
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    default: undefined,
  });
};

let paymentsInitPromise: Promise<boolean> | null = null;

export const initializePayments = (): Promise<boolean> => {
  if (paymentsInitPromise) return paymentsInitPromise;

  paymentsInitPromise = (async () => {
    if (Platform.OS === 'web') {
      console.log('[RevenueCat] Skipping - not supported on web');
      return false;
    }
    const apiKey = getApiKey();
    if (!apiKey || apiKey.length === 0) {
      console.warn('[RevenueCat] No API key found');
      return false;
    }
    try {
      await Purchases.configure({ apiKey });
      console.log('[RevenueCat] Configured', __DEV__ ? '(Test Store)' : `(${Platform.OS})`);
      return true;
    } catch (error) {
      console.error('[RevenueCat] Configuration error:', error);
      return false;
    }
  })();

  return paymentsInitPromise;
};

export const usePackages = () => {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsLoading(false);
      return;
    }
    const fetchPackages = async () => {
      try {
        if (!(await initializePayments())) return;
        const offerings = await Purchases.getOfferings();
        setPackages(offerings.current?.availablePackages ?? []);
      } catch (error) {
        console.error('[RevenueCat] Error fetching packages:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    if (!(await initializePayments())) throw new Error('Subscriptions are not available on this platform.');
    return Purchases.purchasePackage(pkg);
  }, []);

  const purchaseCreditPack = useCallback(async () => {
    if (!(await initializePayments())) throw new Error('AI credit purchases are not available on this platform.');
    const creditPackage = packages.find((pkg) => pkg.identifier === 'ai_credit_pack' || pkg.product.identifier === 'ai_credit_pack');
    if (!creditPackage) {
      throw new Error('AI credit pack is not available right now.');
    }
    return Purchases.purchasePackage(creditPackage);
  }, [packages]);

  const restorePurchases = useCallback(async () => {
    if (!(await initializePayments())) throw new Error('Restore purchases is only available in the mobile app.');
    return Purchases.restorePurchases();
  }, []);

  return { packages, isLoading, purchasePackage, purchaseCreditPack, restorePurchases };
};

export const useCustomerInfo = () => {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setIsLoading(false);
      return;
    }
    let listener: ((info: CustomerInfo) => void) | null = null;

    const setup = async () => {
      try {
        if (!(await initializePayments())) return;
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        // Sync pro status to Zustand store
        const isPro = info.entitlements.active['PhotoResizer Pro'] !== undefined;
        useStore.getState().setIsPro(isPro);
      } catch (error) {
        console.error('[RevenueCat] Error fetching customer info:', error);
      } finally {
        setIsLoading(false);
      }
      listener = (info: CustomerInfo) => {
        setCustomerInfo(info);
        const isPro = info.entitlements.active['PhotoResizer Pro'] !== undefined;
        useStore.getState().setIsPro(isPro);
      };
      Purchases.addCustomerInfoUpdateListener(listener);
    };
    setup();
    return () => {
      if (listener) Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  const hasEntitlement = useCallback(
    (id: string) => !!customerInfo?.entitlements.active[id],
    [customerInfo],
  );

  return { customerInfo, isLoading, hasEntitlement };
};
