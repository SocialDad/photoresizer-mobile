import { useState, useCallback, useEffect, useRef } from 'react';
import {
  YStack,
  XStack,
  ScrollView,
  Card,
  Button,
  H2,
  H4,
  SizableText,
  Paragraph,
  Separator,
  toast,
} from '@blinkdotnew/mobile-ui';
import {
  Image as ImageIcon,
  Camera,
  Layers,
  Shield,
  Settings,
  ChevronRight,
  Star,
  Zap,
} from '@tamagui/lucide-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { PLATFORM_PRESETS, type PlatformPreset } from '@/constants/presets';
import { useStore } from '@/lib/store';
import t from '@/constants/translations';

// ── Quick size chips — 6 key presets for the horizontal scroll ──
const ACCENT = '#0EA5E9';
const QUICK_SIZE_INDICES = [1, 3, 8, 11, 9, 17]; // Instagram Portrait, Story/Reel, TikTok, LinkedIn, YouTube, Pinterest
const QUICK_SIZES: PlatformPreset[] = QUICK_SIZE_INDICES.map((i) => PLATFORM_PRESETS[i]);

export default function HomeScreen() {
  const {
    image, pickImage, applyPreset, error, resetImage,
    isPro, projects,
  } = useStore();

  const [pendingPreset, setPendingPreset] = useState<PlatformPreset | null>(null);
  const [shouldNavToEditor, setShouldNavToEditor] = useState(false);
  const navigateAttempted = useRef(false);

  // ── "Choose a photo" → pick image → navigate to editor ──
  const handleChoosePhoto = useCallback(async () => {
    navigateAttempted.current = false;
    await pickImage();
    // Only navigate if an image was actually picked
    if (useStore.getState().image) {
      setShouldNavToEditor(true);
    }
  }, [pickImage]);

  useEffect(() => {
    if (shouldNavToEditor && image && !navigateAttempted.current) {
      navigateAttempted.current = true;
      setShouldNavToEditor(false);
      router.push('/editor');
    }
  }, [shouldNavToEditor, image]);

  // ── "Take a photo" → launch camera → navigate to editor ──
  const handleTakePhoto = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        toast(t.common.cancel, { message: 'Camera not available on web', variant: 'error' });
        return;
      }
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        toast('Permission needed', { message: 'Camera access is required', variant: 'error' });
        return;
      }
      navigateAttempted.current = false;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        // Convert blob: to data: URI for web compatibility
        let uri = asset.uri;
        if (uri.startsWith('blob:')) {
          try {
            const response = await fetch(uri);
            const blob = await response.blob();
            uri = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch { /* keep original */ }
        }
        useStore.getState().resetImage();
        useStore.setState({ image: { ...asset, uri }, result: null });
        setShouldNavToEditor(true);
      }
    } catch (e: any) {
      toast('Error', { message: e.message || 'Failed to open camera', variant: 'error' });
    }
  }, []);

  // ── Quick size chip tap → pick image → apply preset ──
  const handleQuickSize = useCallback(
    async (preset: PlatformPreset) => {
      navigateAttempted.current = false;
      setPendingPreset(preset);
      await pickImage();
    },
    [pickImage],
  );

  useEffect(() => {
    if (image && pendingPreset) {
      const preset = pendingPreset;
      setPendingPreset(null);
      applyPreset(preset as any);
      router.push('/editor');
    }
  }, [image, pendingPreset, applyPreset]);

  // ── "Resize Once" → pick image then navigate to editor ──
  const handleResizeOnce = useCallback(async () => {
    navigateAttempted.current = false;
    await pickImage();
    setShouldNavToEditor(true);
  }, [pickImage]);

  // ── Navigate helpers ──
  const goToBatch = useCallback(() => router.push('/(tabs)/batch'), []);
  const goToProjects = useCallback(() => router.push('/(tabs)/projects'), []);

  // ── Dismiss error ──
  useEffect(() => {
    if (error) {
      toast('Error', { message: error, variant: 'error' });
      resetImage();
    }
  }, [error, resetImage]);

  // ── Recent projects (most recent 3) ──
  const recentProjects = projects.slice(0, 3);

  return (
    <YStack flex={1} backgroundColor="$color1">
      <ScrollView flex={1} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ═══════════════ HEADER ═══════════════ */}
        <XStack
          paddingHorizontal="$5"
          paddingTop="$4"
          paddingBottom="$2"
          justifyContent="space-between"
          alignItems="center"
        >
          <YStack gap="$1">
            <XStack gap="$2" alignItems="center">
              <ImageIcon size={22} color="#0EA5E9" />
              <H2 color="$color12" fontWeight="800" letterSpacing={-0.5}>
                {t.home.title}
              </H2>
            </XStack>
            <Paragraph color="$color10" size="$2">
              {t.app.tagline}
            </Paragraph>
          </YStack>
          <Button
            chromeless
            onPress={goToProjects}
            icon={<Settings size={20} color="$color10" />}
            minWidth={48}
            minHeight={48}
            aria-label="Settings"
          />
        </XStack>

        <Separator marginHorizontal="$5" marginVertical="$3" />

        {/* ═══════════════ PRIMARY ACTION ═══════════════ */}
        <YStack paddingHorizontal="$5" gap="$4">
          <Button
            theme="active"
            size="$5"
            onPress={handleChoosePhoto}
            icon={<Camera size={20} color="white" />}
            fontWeight="700"
            height={56}
            borderRadius="$4"
            pressStyle={{ scale: 0.97 }}
          >
            {t.home.choosePhoto}
          </Button>

          {/* ── Secondary actions row ── */}
          <XStack gap="$3">
            <Button
              variant="outlined"
              flex={1}
              size="$4"
              onPress={handleTakePhoto}
              icon={<Camera size={18} color="$color11" />}
              height={48}
              borderRadius="$4"
              borderColor="$color5"
            >
              {t.home.takePhoto}
            </Button>
            <Button
              variant="outlined"
              flex={1}
              size="$4"
              onPress={goToBatch}
              icon={<Layers size={18} color="$color11" />}
              height={48}
              borderRadius="$4"
              borderColor="$color5"
            >
              {t.home.resizeSeveral}
            </Button>
          </XStack>
        </YStack>

        {/* ═══════════════ QUICK SIZES ═══════════════ */}
        <YStack paddingTop="$6" gap="$3">
          <XStack paddingHorizontal="$5" justifyContent="space-between" alignItems="center">
            <H4 color="$color12" fontWeight="700">
              {t.home.quickSizes}
            </H4>
            {!isPro && (
              <Button chromeless size="$2" onPress={() => router.push('/pricing')}>
                <XStack
                  backgroundColor="$color3"
                  paddingHorizontal="$3"
                  paddingVertical="$1"
                  borderRadius="$2"
                  gap="$1"
                  alignItems="center"
                >
                  <Zap size={12} color="#0EA5E9" />
                  <SizableText size="$1" color="$color11">
                    Free
                  </SizableText>
                </XStack>
              </Button>
            )}
          </XStack>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          >
            {QUICK_SIZES.map((preset) => {
              const label = preset.platform === 'Instagram' && preset.placementName.includes('Portrait')
                ? 'IG Portrait'
                : preset.platform === 'Instagram' && preset.placementName.includes('Story')
                  ? 'Story / Reel'
                  : preset.platform === 'Twitter / X'
                    ? 'X'
                    : preset.platform;
              return (
                <Card
                  key={`${preset.platform}-${preset.placementName}`}
                  bordered
                  width={92}
                  minHeight={88}
                  animation="bouncy"
                  pressStyle={{ scale: 0.95, opacity: 0.85 }}
                  onPress={() => handleQuickSize(preset)}
                  paddingHorizontal="$2"
                  paddingVertical="$3"
                  backgroundColor="$color2"
                  borderColor="$color4"
                  alignItems="center"
                  justifyContent="center"
                  gap="$1"
                  hoverStyle={{ borderColor: '#0EA5E9' }}
                >
                  <SizableText size="$1" fontWeight="700" color="$color12" textAlign="center" numberOfLines={1} width="100%">
                    {label}
                  </SizableText>
                  <SizableText size="$1" color="#0EA5E9" fontWeight="600" textAlign="center" numberOfLines={1} width="100%" letterSpacing={-0.3}>
                    {preset.width}×{preset.height}
                  </SizableText>
                  <SizableText size="$1" color="$color10" textAlign="center">
                    {preset.ratio}
                  </SizableText>
                </Card>
              );
            })}
          </ScrollView>
        </YStack>

        {/* ═══════════════ RESIZE ONCE CARD ═══════════════ */}
        <YStack paddingHorizontal="$5" paddingTop="$5">
          <Card
            bordered
            backgroundColor="$color2"
            borderColor="$color4"
            padding="$5"
            gap="$4"
          >
            <XStack gap="$3" alignItems="center">
              <YStack
                width={44}
                height={44}
                borderRadius="$3"
                backgroundColor="$color3"
                alignItems="center"
                justifyContent="center"
              >
                <Layers size={22} color="#0EA5E9" />
              </YStack>
              <YStack flex={1} gap="$1">
                <SizableText size="$4" fontWeight="700" color="$color12">
                  {t.home.resizeOnce}
                </SizableText>
                <Paragraph size="$2" color="$color10">
                  {t.home.resizeOnceDesc}
                </Paragraph>
              </YStack>
              <ChevronRight size={18} color="$color9" />
            </XStack>
            <Button
              theme="active"
              size="$4"
              onPress={handleResizeOnce}
              icon={<Star size={16} color="white" />}
              height={44}
              borderRadius="$3"
              fontWeight="600"
            >
              Start
            </Button>
          </Card>
        </YStack>

        {/* ═══════════════ RECENT PROJECTS ═══════════════ */}
        {recentProjects.length > 0 && (
          <YStack paddingHorizontal="$5" paddingTop="$6" gap="$3">
            <H4 color="$color12" fontWeight="700">
              {t.home.recentProjects}
            </H4>
            {recentProjects.map((project) => {
              const firstPreset = project.selectedPresets[0];
              const dateStr = new Date(project.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });
              return (
                <Card
                  key={project.id}
                  bordered
                  backgroundColor="$color2"
                  borderColor="$color4"
                  padding="$4"
                  animation="bouncy"
                  pressStyle={{ scale: 0.98, opacity: 0.9 }}
                  onPress={() => router.push('/editor')}
                >
                  <XStack gap="$3" alignItems="center">
                    <YStack
                      width={52}
                      height={52}
                      borderRadius="$3"
                      backgroundColor="$color3"
                      overflow="hidden"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {project.sourceUri ? (
                        <Image
                          source={{ uri: project.sourceUri }}
                          style={{ width: 52, height: 52 }}
                          contentFit="cover"
                        />
                      ) : (
                        <ImageIcon size={22} color="$color10" />
                      )}
                    </YStack>
                    <YStack flex={1} gap="$1">
                      <SizableText size="$3" fontWeight="600" color="$color12">
                        {firstPreset?.platform ?? 'Unnamed'}
                      </SizableText>
                      <XStack gap="$3">
                        {firstPreset && (
                          <SizableText size="$1" color="$color10">
                            {firstPreset.width}×{firstPreset.height}
                          </SizableText>
                        )}
                        <SizableText size="$1" color="$color9">
                          {dateStr}
                        </SizableText>
                      </XStack>
                    </YStack>
                    <ChevronRight size={16} color="$color9" />
                  </XStack>
                </Card>
              );
            })}
          </YStack>
        )}

        {/* ═══════════════ PRIVACY FOOTER ═══════════════ */}
        <YStack
          paddingHorizontal="$5"
          paddingTop={recentProjects.length > 0 ? '$4' : '$6'}
          paddingBottom="$4"
          alignItems="center"
          gap="$4"
        >
          {!isPro && (
            <Card bordered backgroundColor={ACCENT + '14'} borderColor={ACCENT + '44'} padding="$4" borderRadius="$4" width="100%">
              <XStack gap="$3" alignItems="center" justifyContent="space-between">
                <YStack gap="$1" flex={1}>
                  <SizableText size="$3" color="$color12" fontWeight="700">Unlock Pro</SizableText>
                  <SizableText size="$2" color="$color10">Unlimited resizes, AI tools, batch processing.</SizableText>
                </YStack>
                <Button theme="active" size="$3" onPress={() => router.push('/pricing')} borderRadius="$3">
                  $4.99
                </Button>
              </XStack>
            </Card>
          )}
          <XStack gap="$2" alignItems="center" opacity={0.6}>
            <Shield size={13} color="$color10" />
            <SizableText size="$1" color="$color10" textAlign="center">
              {t.app.localToolsNotice}
            </SizableText>
          </XStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
