import { router } from 'expo-router';
import {
  YStack,
  ScrollView,
  Card,
  H3,
  H4,
  Paragraph,
  SizableText,
  XStack,
  Button,
} from '@blinkdotnew/mobile-ui';
import { X } from '@tamagui/lucide-icons';

export default function PrivacyScreen() {
  return (
    <YStack flex={1} backgroundColor="$color1">
      {/* ── Header ── */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderBottomColor="$color4"
      >
        <H3 color="$color12" fontWeight="700">
          Privacy
        </H3>
        <Button
          chromeless
          onPress={() => router.back()}
          icon={<X size={22} color="$color11" />}
          minWidth={40}
          minHeight={40}
          aria-label="Close"
        />
      </XStack>

      {/* ── Content ── */}
      <ScrollView flex={1} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
        {/* Section 1: How PhotoResizer Handles Your Photos */}
        <Card backgroundColor="$color2" borderColor="$color4" bordered padding="$5" gap="$4">
          <H3 color="$color12" fontWeight="700">
            How PhotoResizer Handles Your Photos
          </H3>

          <YStack gap="$2">
            <H4 color="$color12" fontWeight="600">
              Local Processing
            </H4>
            <Paragraph color="$color11" size="$3">
              All resizing, cropping, compression, and format conversion happens entirely on your
              device. Your photos never leave your phone.
            </Paragraph>
          </YStack>

          <YStack gap="$2">
            <H4 color="$color12" fontWeight="600">
              AI Tools
            </H4>
            <Paragraph color="$color11" size="$3">
              When you use AI features (background removal, AI expand, upscale), the selected image
              is securely uploaded for processing. Uploaded images and generated results are
              automatically deleted within 24 hours.
            </Paragraph>
          </YStack>

          <YStack gap="$2">
            <H4 color="$color12" fontWeight="600">
              Metadata
            </H4>
            <Paragraph color="$color11" size="$3">
              GPS location and camera metadata are stripped by default. You can choose to keep
              metadata in export settings.
            </Paragraph>
          </YStack>
        </Card>

        {/* Section 2: Data We Collect */}
        <Card backgroundColor="$color2" borderColor="$color4" bordered padding="$5" gap="$4">
          <H3 color="$color12" fontWeight="700">
            Data We Collect
          </H3>

          <YStack gap="$2">
            <H4 color="$color12" fontWeight="600">
              Account Data
            </H4>
            <Paragraph color="$color11" size="$3">
              If you create an account, we store your email and subscription status. Account creation
              is optional.
            </Paragraph>
          </YStack>

          <YStack gap="$2">
            <H4 color="$color12" fontWeight="600">
              Usage Analytics
            </H4>
            <Paragraph color="$color11" size="$3">
              We collect anonymous usage data (app opens, feature usage, export counts) to improve
              the app. No image content or filenames are included.
            </Paragraph>
          </YStack>

          <YStack gap="$2">
            <H4 color="$color12" fontWeight="600">
              No Advertising
            </H4>
            <Paragraph color="$color11" size="$3">
              PhotoResizer contains no third-party advertising SDKs or cross-app tracking.
            </Paragraph>
          </YStack>
        </Card>

        {/* Section 3: Your Controls */}
        <Card backgroundColor="$color2" borderColor="$color4" bordered padding="$5" gap="$4">
          <H3 color="$color12" fontWeight="700">
            Your Controls
          </H3>

          <YStack gap="$2" paddingLeft="$1">
            <XStack gap="$2" alignItems="flex-start">
              <SizableText color="true" size="$4">
                •
              </SizableText>
              <Paragraph color="$color11" size="$3" flex={1}>
                Delete account
              </Paragraph>
            </XStack>
            <XStack gap="$2" alignItems="flex-start">
              <SizableText color="true" size="$4">
                •
              </SizableText>
              <Paragraph color="$color11" size="$3" flex={1}>
                Clear temporary files
              </Paragraph>
            </XStack>
            <XStack gap="$2" alignItems="flex-start">
              <SizableText color="true" size="$4">
                •
              </SizableText>
              <Paragraph color="$color11" size="$3" flex={1}>
                Analytics opt-out in Settings
              </Paragraph>
            </XStack>
            <XStack gap="$2" alignItems="flex-start">
              <SizableText color="true" size="$4">
                •
              </SizableText>
              <Paragraph color="$color11" size="$3" flex={1}>
                Manage subscription
              </Paragraph>
            </XStack>
          </YStack>
        </Card>

        {/* Section 4: Contact */}
        <Card backgroundColor="$color2" borderColor="$color4" bordered padding="$5" gap="$3">
          <H3 color="$color12" fontWeight="700">
            Contact
          </H3>
          <Paragraph color="#0EA5E9" size="$3" fontWeight="500">
            support@photoresizer.ca
          </Paragraph>
        </Card>

        {/* Footer */}
        <YStack alignItems="center" paddingTop="$2">
          <SizableText color="$color9" size="$1">
            Last updated: July 2026
          </SizableText>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
