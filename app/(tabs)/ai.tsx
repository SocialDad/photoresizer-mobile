import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  YStack, XStack, ScrollView, Card, Button, H4, SizableText,
  Separator, Spinner, toast, BlinkDialog,
} from '@blinkdotnew/mobile-ui';
import {
  Wand2, Scissors, Maximize2, Crosshair, Upload,
} from '@tamagui/lucide-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useStore } from '@/lib/store';
import { usePackages } from '@/lib/payments';
import t from '@/constants/translations';

const ACCENT = '#0EA5E9';

type AiTool = 'bg-remove' | 'expand' | 'upscale' | 'focal';
type UpscaleFactor = '2x' | '4x';
type ExpandRatio = '9:16' | '16:9' | '1:1' | '4:5';

export default function AiScreen() {
  const { isPro, aiCredits, addAiCredits } = useStore();
  const { purchaseCreditPack } = usePackages();

  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [activeTool, setActiveTool] = useState<AiTool | null>(null);
  const [isProcessing] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [upscaleFactor, setUpscaleFactor] = useState<UpscaleFactor>('2x');
  const [expandRatio, setExpandRatio] = useState<ExpandRatio>('16:9');
  const [showSetup, setShowSetup] = useState(false);

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (!result.canceled && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
      }
    } catch (e: any) {
      toast('Error', { message: e.message, variant: 'error' });
    }
  }, []);

  const openTool = useCallback((tool: AiTool) => {
    if (!selectedImage) {
      toast('Select an image', { message: 'Pick an image first.', variant: 'error' });
      return;
    }
    setActiveTool(tool);
    setShowConsent(true);
  }, [selectedImage]);

  const handleBuyCredits = useCallback(async () => {
    if (Platform.OS === 'web') {
      toast('Available in the mobile app', { message: 'AI credit purchases are available on iOS and Android.', variant: 'error' });
      return;
    }
    try {
      await purchaseCreditPack();
      addAiCredits(10);
      toast('Credits added', { message: '10 AI credits are ready to use.', variant: 'success' });
    } catch (e: any) {
      if (e?.userCancelled) return;
      toast('Purchase failed', { message: e?.message || 'Unable to purchase credits.', variant: 'error' });
    }
  }, [purchaseCreditPack, addAiCredits]);

  const handleConsentConfirm = useCallback(async () => {
    setShowConsent(false);

    if (!isPro && aiCredits.remaining <= 0) {
      toast('No credits', { message: 'You have no AI credits. Purchase a credit pack or upgrade to Pro.', variant: 'error' });
      return;
    }

    // Do not consume credits until a real AI operation succeeds.
    // The current screen only validates consent and provider setup.
    setShowSetup(true);
  }, [isPro, aiCredits]);

  const TOOLS: { key: AiTool; icon: any; label: string; desc: string }[] = [
    { key: 'bg-remove', icon: Scissors, label: t.ai.backgroundRemoval, desc: 'Remove background, produce transparent PNG' },
    { key: 'expand', icon: Maximize2, label: t.ai.aiExpand, desc: 'Expand image to fill a larger aspect ratio' },
    { key: 'upscale', icon: Wand2, label: t.ai.upscale, desc: 'Enhance resolution 2x or 4x with AI' },
    { key: 'focal', icon: Crosshair, label: t.ai.focalPoint, desc: 'Auto-detect subject and position within crop' },
  ];

  return (
    <YStack flex={1} backgroundColor="$color1">
      <ScrollView flex={1} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <XStack paddingHorizontal="$5" paddingTop="$4" paddingBottom="$2" justifyContent="space-between" alignItems="center">
          <H4 color="$color12" fontWeight="700">{t.ai.title}</H4>
          <XStack gap="$2" alignItems="center">
            <Card paddingHorizontal="$3" paddingVertical="$1" backgroundColor="$color3" borderRadius="$2">
              <SizableText size="$2" color="$color10">
                {isPro ? 'Pro' : `${aiCredits.remaining} credits`}
              </SizableText>
            </Card>
            {!isPro && (
              <Button size="$2" theme="active" borderRadius="$3" onPress={handleBuyCredits}>
                Buy 10
              </Button>
            )}
          </XStack>
        </XStack>

        <Separator marginHorizontal="$5" marginVertical="$3" />

        {/* Image picker */}
        <YStack paddingHorizontal="$5" gap="$3">
          <Button
            variant="outlined"
            size="$4"
            onPress={pickImage}
            icon={<Upload size={18} color="$color11" />}
            borderRadius="$4"
            borderColor="$color5"
          >
            {selectedImage ? 'Change image' : 'Select an image'}
          </Button>

          {selectedImage && (
            <Card borderRadius="$4" overflow="hidden" bordered borderColor="$color4">
              <Image
                source={{ uri: selectedImage.uri }}
                style={{ width: '100%', height: 200 }}
                contentFit="cover"
              />
              <XStack padding="$3" gap="$2" alignItems="center">
                <SizableText size="$2" color="$color10">
                  {selectedImage.width} x {selectedImage.height}
                </SizableText>
              </XStack>
            </Card>
          )}
        </YStack>

        {/* Tools grid */}
        <YStack paddingHorizontal="$5" paddingTop="$5" gap="$3">
          <H4 color="$color12" fontWeight="700">Available tools</H4>
          <XStack flexWrap="wrap" gap="$3">
            {TOOLS.map((tool) => (
              <Card
                key={tool.key}
                flex={1}
                minWidth="44%"
                maxWidth="48%"
                bordered
                backgroundColor="$color2"
                borderColor="$color4"
                padding="$4"
                gap="$3"
                pressStyle={{ scale: 0.97, opacity: 0.85 }}
                onPress={() => openTool(tool.key)}
              >
                <YStack
                  width={40}
                  height={40}
                  borderRadius="$3"
                  backgroundColor="$color3"
                  alignItems="center"
                  justifyContent="center"
                >
                  <tool.icon size={20} color={ACCENT} />
                </YStack>
                <YStack gap="$1">
                  <SizableText size="$3" fontWeight="700" color="$color12">{tool.label}</SizableText>
                  <SizableText size="$1" color="$color10">{tool.desc}</SizableText>
                </YStack>
              </Card>
            ))}
          </XStack>
        </YStack>

        {/* Tool-specific options (shown before consent) */}
        {activeTool === 'upscale' && (
          <YStack paddingHorizontal="$5" paddingTop="$4" gap="$3">
            <H4 color="$color12" fontWeight="700">Upscale factor</H4>
            <XStack gap="$2">
              {(['2x', '4x'] as UpscaleFactor[]).map((f) => (
                <Button
                  key={f}
                  chromeless
                  size="$4"
                  onPress={() => setUpscaleFactor(f)}
                  backgroundColor={upscaleFactor === f ? '$color4' : '$color3'}
                  paddingHorizontal="$6"
                  borderRadius="$4"
                >
                  <SizableText color={upscaleFactor === f ? ACCENT : '$color12'} fontWeight="600">{f}</SizableText>
                </Button>
              ))}
            </XStack>
            {selectedImage && (
              <SizableText size="$2" color="$color10">
                Output: {selectedImage.width * (upscaleFactor === '4x' ? 4 : 2)} x {selectedImage.height * (upscaleFactor === '4x' ? 4 : 2)}
              </SizableText>
            )}
          </YStack>
        )}

        {activeTool === 'expand' && (
          <YStack paddingHorizontal="$5" paddingTop="$4" gap="$3">
            <H4 color="$color12" fontWeight="700">Target ratio</H4>
            <XStack gap="$2">
              {(['9:16', '16:9', '1:1', '4:5'] as ExpandRatio[]).map((r) => (
                <Button
                  key={r}
                  chromeless
                  size="$3"
                  onPress={() => setExpandRatio(r)}
                  backgroundColor={expandRatio === r ? '$color4' : '$color3'}
                  paddingHorizontal="$4"
                  borderRadius="$4"
                >
                  <SizableText color={expandRatio === r ? ACCENT : '$color12'} fontWeight="600">{r}</SizableText>
                </Button>
              ))}
            </XStack>
          </YStack>
        )}
      </ScrollView>

      {/* Processing overlay */}
      {isProcessing && (
        <YStack position="absolute" top={0} left={0} right={0} bottom={0} backgroundColor="rgba(0,0,0,0.6)" alignItems="center" justifyContent="center">
          <Card padding="$6" alignItems="center" gap="$4" backgroundColor="$color2">
            <Spinner size="large" color={ACCENT} />
            <SizableText color="$color12">Processing with AI...</SizableText>
          </Card>
        </YStack>
      )}

      {/* Consent dialog */}
      <BlinkDialog
        open={showConsent}
        title={t.ai.consentTitle}
        description={t.ai.consentMessage}
        onConfirm={handleConsentConfirm}
        onCancel={() => setShowConsent(false)}
      />

      {/* Setup required dialog */}
      <BlinkDialog
        open={showSetup}
        title={t.ai.setupRequired}
        description={t.ai.setupMessage}
        onConfirm={() => setShowSetup(false)}
        onCancel={() => setShowSetup(false)}
      />
    </YStack>
  );
}
