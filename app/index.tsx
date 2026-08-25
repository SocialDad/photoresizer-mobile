import { useCallback } from 'react';
import { Redirect, router } from 'expo-router';
import {
  YStack,
  ScrollView,
  Card,
  Button,
  H2,
  Paragraph,
  SizableText,
} from '@blinkdotnew/mobile-ui';
import { Camera, Shield } from '@tamagui/lucide-icons';
import { useStore } from '@/lib/store';
import t from '@/constants/translations';

export default function OnboardingScreen() {
  const { hasCompletedOnboarding, setHasCompletedOnboarding, pickImage } = useStore();

  const markDoneAndNavigate = useCallback(
    (path: string) => {
      setHasCompletedOnboarding(true);
      router.push(path as any);
    },
    [setHasCompletedOnboarding],
  );

  const handleChoosePhoto = useCallback(async () => {
    await pickImage();
    markDoneAndNavigate('/editor');
  }, [pickImage, markDoneAndNavigate]);

  const handleContinue = useCallback(() => {
    setHasCompletedOnboarding(true);
    router.push('/(tabs)' as any);
  }, [setHasCompletedOnboarding]);

  // Redirect after hooks are declared
  if (hasCompletedOnboarding) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <YStack flex={1} backgroundColor="$color1">
      <ScrollView
        flex={1}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          gap: 16,
        }}
      >
        {/* ── Logo ── */}
        <YStack
          width={80}
          height={80}
          borderRadius="$4"
          backgroundColor="$color2"
          alignItems="center"
          justifyContent="center"
          marginBottom="$2"
        >
          <Shield size={36} color="#0EA5E9" />
        </YStack>

        {/* ── Title & Tagline ── */}
        <YStack gap="$1" alignItems="center">
          <H2 color="$color12" fontWeight="800" letterSpacing={-0.5}>
            {t.home.title}
          </H2>
          <Paragraph color="$color10" size="$3" textAlign="center">
            {t.app.tagline}
          </Paragraph>
        </YStack>

        {/* ── Description Card ── */}
        <Card
          backgroundColor="$color2"
          borderColor="$color4"
          bordered
          padding="$4"
          borderRadius="$4"
          maxWidth={360}
        >
          <Paragraph color="$color11" size="$2" textAlign="center">
            {t.app.privacyNotice}
          </Paragraph>
        </Card>

        {/* ── Buttons ── */}
        <YStack gap="$3" width="100%" maxWidth={360} paddingTop="$2">
          <Button
            theme="active"
            size="$5"
            onPress={handleChoosePhoto}
            icon={<Camera size={20} color="white" />}
            fontWeight="700"
            height={52}
            borderRadius="$4"
            pressStyle={{ scale: 0.97 }}
          >
            {t.home.choosePhoto}
          </Button>

          <Button
            variant="outlined"
            size="$5"
            onPress={() => markDoneAndNavigate('/privacy')}
            icon={<Shield size={20} color="$color11" />}
            fontWeight="600"
            height={52}
            borderRadius="$4"
            borderColor="$color5"
          >
            {t.app.seePrivacy}
          </Button>
        </YStack>

        {/* ── Continue without an account ── */}
        <YStack paddingTop="$4">
          <Button chromeless onPress={handleContinue} pressStyle={{ opacity: 0.6 }}>
            <SizableText color="$color9" size="$2" fontWeight="500">
              {t.app.continueWithoutAccount}
            </SizableText>
          </Button>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
