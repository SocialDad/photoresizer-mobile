import { useCallback, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import {
  YStack, XStack, ScrollView, Card, Button, H2, H4,
  SizableText, Paragraph, Separator, toast, SafeArea, Spinner,
} from '@blinkdotnew/mobile-ui';
import {
  ArrowLeft, Check, Star, Shield,
} from '@tamagui/lucide-icons';
import { usePackages, useCustomerInfo } from '@/lib/payments';
import { useStore } from '@/lib/store';
import t from '@/constants/translations';

const ACCENT = '#0EA5E9';

type BillingPeriod = 'monthly' | 'annual';

type WebsitePlan = {
  id: string;
  name: string;
  description: string;
  monthly: string;
  annual: string;
  period: string;
  originalAnnual?: string;
  features: string[];
  popular?: boolean;
};

const WEBSITE_PLANS: WebsitePlan[] = [
  { id: 'free', name: 'Free', description: 'Essential tools for casual creators.', monthly: '$0', annual: '$0', period: 'forever', features: ['1 slow generation at a time', 'All AI image models'] },
  { id: 'beginner', name: 'Beginner', description: 'Affordable entry for new creators.', monthly: '$7', annual: '$4.99', period: 'mo', features: ['2 generations at a time', 'All AI image models', 'Priority processing'] },
  { id: 'pro', name: 'Pro', description: 'Essential AI tools for creators.', monthly: '$34', annual: '$25', period: 'mo', originalAnnual: '$40', features: ['2 generations at a time', 'All AI image models', 'All AI video models'] },
  { id: 'ultimate', name: 'Ultimate', description: 'Advanced features for professionals.', monthly: '$59', annual: '$42', period: 'mo', originalAnnual: '$59', features: ['4 generations at a time', 'All AI image models', 'All AI video models'], popular: true },
  { id: 'max', name: 'Max', description: 'Maximum power and speed.', monthly: '$259', annual: '$183', period: 'mo', originalAnnual: '$259', features: ['8 generations at a time', 'All AI image models', 'All AI video models'] },
];

export default function PricingScreen() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual');
  const { packages, isLoading, purchasePackage, restorePurchases } = usePackages();
  const { hasEntitlement } = useCustomerInfo();

  const isPro = hasEntitlement('PhotoResizer Pro');

  // Sort packages: monthly → annual → lifetime
  const sorted = useMemo(() => {
    const order: Record<string, number> = { '$rc_monthly': 0, '$rc_annual': 1, '$rc_lifetime': 2 };
    return [...packages].sort((a, b) => (order[a.identifier] ?? 99) - (order[b.identifier] ?? 99));
  }, [packages]);

  const handlePurchase = useCallback(async (pkg: any) => {
    if (Platform.OS === 'web') {
      toast('Available in the mobile app', { message: 'Use the iOS or Android app to complete your subscription.', variant: 'error' });
      return;
    }
    try {
      await purchasePackage(pkg);
      useStore.getState().setIsPro(true);
      toast('Thank you!', { message: 'Welcome to Pro.', variant: 'success' });
    } catch (e: any) {
      if (e?.userCancelled) return;
      toast('Purchase failed', { message: e.message || 'Please try again.', variant: 'error' });
    }
  }, [purchasePackage]);

  const handleRestore = useCallback(async () => {
    if (Platform.OS === 'web') {
      toast('Available in the mobile app', { message: 'Restore purchases from iOS or Android.', variant: 'error' });
      return;
    }
    try {
      const info = await restorePurchases();
      if (info.entitlements.active['PhotoResizer Pro']) {
        toast('Restored', { message: 'Your Pro access has been restored.', variant: 'success' });
      } else {
        toast('Nothing found', { message: 'No active subscription to restore.', variant: 'error' });
      }
    } catch (e: any) {
      toast('Error', { message: e.message, variant: 'error' });
    }
  }, [restorePurchases]);

  const nativePackagesAvailable = Platform.OS !== 'web' && packages.length > 0;

  // ── Loading ──
  if (isLoading && Platform.OS !== 'web') {
    return (
      <SafeArea>
        <YStack flex={1} backgroundColor="$color1">
          <XStack height={48} paddingHorizontal="$3" alignItems="center" backgroundColor="$color2" borderBottomWidth={1} borderBottomColor="$color4">
            <Button chromeless size="$3" onPress={() => router.back()} icon={<ArrowLeft size={20} color="$color12" />} />
            <SizableText size="$4" color="$color12" fontWeight="700" marginLeft="$2">Pricing</SizableText>
          </XStack>
          <YStack flex={1} alignItems="center" justifyContent="center" gap="$4">
            <Spinner size="large" color={ACCENT} />
            <SizableText color="$color10">Loading plans&hellip;</SizableText>
          </YStack>
        </YStack>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <YStack flex={1} backgroundColor="$color1">
      <ScrollView flex={1} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <XStack height={48} paddingHorizontal="$3" alignItems="center" backgroundColor="$color2" borderBottomWidth={1} borderBottomColor="$color4">
          <Button chromeless size="$3" onPress={() => router.back()} icon={<ArrowLeft size={20} color="$color12" />} />
          <SizableText size="$4" color="$color12" fontWeight="700" marginLeft="$2">Pricing</SizableText>
        </XStack>

        {/* Hero */}
        <YStack padding="$5" paddingTop="$6" alignItems="center" gap="$3">
          <YStack width={72} height={72} borderRadius="$4" backgroundColor="$color2" alignItems="center" justifyContent="center" borderWidth={2} borderColor={ACCENT}>
            <Star size={32} color={ACCENT} />
          </YStack>
          <H2 color="$color12" fontWeight="800" textAlign="center">
            {isPro ? 'You are Pro' : 'Choose your plan'}
          </H2>
          <Paragraph color="$color10" size="$3" textAlign="center">
            {isPro ? 'Enjoy unlimited access to all features.' : 'Start free. Upgrade when you need more power.'}
          </Paragraph>
        </YStack>

        <XStack paddingHorizontal="$5" alignItems="center" gap="$2" marginBottom="$4">
          <XStack backgroundColor="$color3" padding="$1" borderRadius="$4" flex={1}>
            {(['monthly', 'annual'] as BillingPeriod[]).map((period) => (
              <Button key={period} flex={1} chromeless size="$3" onPress={() => setBillingPeriod(period)} backgroundColor={billingPeriod === period ? '$color2' : 'transparent'} borderRadius="$4">
                <SizableText size="$2" color={billingPeriod === period ? '$color12' : '$color9'} fontWeight="600">{period === 'monthly' ? 'Monthly' : 'Annual'}</SizableText>
              </Button>
            ))}
          </XStack>
          {billingPeriod === 'annual' && <SizableText size="$1" color="$color1" backgroundColor="$color12" paddingHorizontal="$2" paddingVertical="$1" borderRadius="$3" fontWeight="700">SAVE UP TO 37%</SizableText>}
        </XStack>

        {!nativePackagesAvailable && Platform.OS === 'web' && (
          <Card marginHorizontal="$5" marginBottom="$4" padding="$3" backgroundColor="$color3" borderColor="$color4" bordered borderRadius="$3">
            <SizableText size="$2" color="$color10" textAlign="center">Pricing preview. Subscriptions are completed in the iOS or Android app.</SizableText>
          </Card>
        )}

        {/* Plans */}
        <YStack paddingHorizontal="$5" gap="$4">
          {WEBSITE_PLANS.map((plan) => {
            const isFree = plan.id === 'free';
            const nativePackage = sorted.find((pkg) => pkg.identifier === (billingPeriod === 'annual' ? '$rc_annual' : '$rc_monthly'));
            const isHighlighted = plan.popular === true || plan.id === 'pro';
            const packageLabel = billingPeriod === 'annual' ? 'Annual' : 'Monthly';
            return (
              <Card key={plan.id} bordered backgroundColor={isHighlighted ? ACCENT + '14' : '$color2'} borderColor={isHighlighted ? ACCENT + '44' : '$color4'} padding="$5" borderRadius="$4" gap="$4" borderWidth={isHighlighted ? 2 : 1}>
                <YStack gap="$2">
                  <XStack justifyContent="space-between" alignItems="center">
                    <H4 color={isHighlighted ? ACCENT : '$color12'} fontWeight="700">{plan.name}</H4>
                    {(plan.popular || (!isPro && isFree)) && <XStack backgroundColor={isHighlighted ? ACCENT + '22' : '$color3'} paddingHorizontal="$2" paddingVertical="$1" borderRadius="$2"><SizableText size="$1" color={isHighlighted ? ACCENT : '$color11'} fontWeight="600">{plan.popular ? 'POPULAR' : 'CURRENT'}</SizableText></XStack>}
                  </XStack>
                  <Paragraph size="$2" color="$color10">{plan.description}</Paragraph>
                  <XStack alignItems="baseline" gap="$1">
                    {plan.originalAnnual && billingPeriod === 'annual' && <SizableText size="$3" color="$color9" textDecorationLine="line-through">{plan.originalAnnual}</SizableText>}
                    <SizableText size="$8" color={isHighlighted ? ACCENT : '$color12'} fontWeight="800">{billingPeriod === 'annual' ? plan.annual : plan.monthly}</SizableText>
                    <SizableText size="$3" color="$color10">/ {plan.period}</SizableText>
                  </XStack>
                  {billingPeriod === 'annual' && !isFree && <SizableText size="$1" color="$color9">Billed annually</SizableText>}
                </YStack>
                <Separator />
                <YStack gap="$3">
                  {plan.features.map((feature) => <XStack key={feature} gap="$3" alignItems="flex-start"><Check size={16} color={isHighlighted ? ACCENT : '$green10'} style={{ marginTop: 2 }} /><SizableText size="$3" color="$color11">{feature}</SizableText></XStack>)}
                </YStack>
                {!isFree && <Button theme={isHighlighted ? 'active' : undefined} onPress={() => nativePackage && handlePurchase(nativePackage)} size="$5" borderRadius="$4" fontWeight="700" disabled={isPro || !nativePackagesAvailable}>{isPro ? 'Current Plan' : `Get ${plan.name} · ${packageLabel}`}</Button>}
              </Card>
            );
          })}
        </YStack>

        {/* Restore + Footer */}
        <YStack padding="$5" paddingTop="$6" alignItems="center" gap="$4">
          <Button chromeless onPress={handleRestore} size="$2">
            <SizableText color="$color9" size="$2">Restore Purchases</SizableText>
          </Button>
          <XStack gap="$2" alignItems="center" opacity={0.6}>
            <Shield size={13} color="$color10" />
            <SizableText size="$1" color="$color10" textAlign="center">
              {t.app.localToolsNotice}
            </SizableText>
          </XStack>
          <Button chromeless onPress={() => router.back()} size="$2">
            <SizableText color="$color9" size="$2">Maybe later</SizableText>
          </Button>
        </YStack>
      </ScrollView>
      </YStack>
    </SafeArea>
  );
}
