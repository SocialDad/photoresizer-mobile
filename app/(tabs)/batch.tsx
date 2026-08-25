import { useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import {
  YStack, XStack, ScrollView, Card, Button, H4, SizableText, Paragraph,
  Separator, Spinner, toast, BlinkSelect, Input,
} from '@blinkdotnew/mobile-ui';
import {
  Image as ImageIcon, Plus, Check, X, Play, Download, AlertTriangle,
} from '@tamagui/lucide-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useStore } from '@/lib/store';
import t from '@/constants/translations';

const BATCH_LIMIT = 5;
const PRO_BATCH_LIMIT = 50;
const ACCENT = '#0EA5E9';

const FORMATS = [
  { label: 'JPEG', value: 'jpeg' },
  { label: 'PNG', value: 'png' },
  { label: 'WebP', value: 'webp' },
];

const FIT_MODES = [
  { label: 'Crop to fill', value: 'crop' },
  { label: 'Fit with background', value: 'fit' },
];

type BatchJob = {
  id: string;
  asset: ImagePicker.ImagePickerAsset;
  status: 'pending' | 'processing' | 'done' | 'failed';
  error?: string;
};

export default function BatchScreen() {
  const { isPro } = useStore();

  const [photos, setPhotos] = useState<BatchJob[]>([]);
  const [width, setWidth] = useState('1080');
  const [height, setHeight] = useState('1350');
  const [format, setFormat] = useState('jpeg');
  const [quality, setQuality] = useState(85);
  const [fitMode, setFitMode] = useState('crop');
  const [isProcessing, setIsProcessing] = useState(false);
  const cancelledRef = useRef(false);

  const limit = isPro ? PRO_BATCH_LIMIT : BATCH_LIMIT;

  const addPhotos = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1,
      });
      if (!result.canceled && result.assets.length > 0) {
        setPhotos((prev) => {
          const combined = [...prev, ...result.assets.map((a) => ({
            id: `batch_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            asset: a,
            status: 'pending' as const,
          }))];
          return combined.slice(0, limit);
        });
      }
    } catch (e: any) {
      toast('Error', { message: e.message, variant: 'error' });
    }
  }, [limit]);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const processBatch = useCallback(async () => {
    const w = parseInt(width, 10);
    const h = parseInt(height, 10);
    if (!w || !h || photos.length === 0) {
      toast('Missing info', { message: 'Select photos and dimensions.', variant: 'error' });
      return;
    }

    cancelledRef.current = false;
    setIsProcessing(true);

    const saveFormat = format === 'png'
      ? ImageManipulator.SaveFormat.PNG
      : format === 'webp'
        ? ImageManipulator.SaveFormat.WEBP
        : ImageManipulator.SaveFormat.JPEG;

    const jobs = [...photos];
    for (let i = 0; i < jobs.length; i++) {
      if (cancelledRef.current) break;

      setPhotos((prev) => prev.map((p) =>
        p.id === jobs[i].id ? { ...p, status: 'processing' as const } : p,
      ));

      try {
        const result = await ImageManipulator.manipulateAsync(
          jobs[i].asset.uri,
          [{ resize: { width: w, height: h } }],
          { compress: quality / 100, format: saveFormat },
        );

        if (Platform.OS !== 'web') {
          try {
            const { createAssetAsync } = await import('expo-media-library');
            await createAssetAsync(result.uri);
          } catch {}
        }

        setPhotos((prev) => prev.map((p) =>
          p.id === jobs[i].id ? { ...p, status: 'done' as const } : p,
        ));
      } catch (e: any) {
        setPhotos((prev) => prev.map((p) =>
          p.id === jobs[i].id ? { ...p, status: 'failed' as const, error: e.message } : p,
        ));
      }
    }

    setIsProcessing(false);

    const successCount = jobs.filter((j) => {
      const current = photos.find((p) => p.id === j.id);
      return current?.status === 'done' || current?.status === 'processing';
    });
    toast('Batch complete', {
      message: `${successCount.length} of ${jobs.length} images processed.`,
      variant: 'success',
    });
  }, [photos, width, height, format, quality]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setIsProcessing(false);
    toast('Cancelled', { message: 'Batch processing stopped.', variant: 'error' });
  }, []);

  const clearPhotos = useCallback(() => {
    setPhotos([]);
  }, []);

  const doneCount = photos.filter((p) => p.status === 'done').length;
  const failCount = photos.filter((p) => p.status === 'failed').length;
  const pendingCount = photos.filter((p) => p.status === 'pending').length;

  return (
    <YStack flex={1} backgroundColor="$color1">
      <ScrollView flex={1} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <XStack paddingHorizontal="$5" paddingTop="$4" paddingBottom="$2" justifyContent="space-between" alignItems="center">
          <H4 color="$color12" fontWeight="700">{t.batch.title}</H4>
          <SizableText size="$2" color="$color9">
            {isPro ? t.batch.proLimit : t.batch.freeLimit}
          </SizableText>
        </XStack>

        <Separator marginHorizontal="$5" marginVertical="$3" />

        {/* Photo Selection */}
        <YStack paddingHorizontal="$5" gap="$3">
          <XStack gap="$3" alignItems="center">
            <Button
              theme="active"
              size="$4"
              onPress={addPhotos}
              icon={<Plus size={18} color="white" />}
              borderRadius="$4"
              disabled={isProcessing}
              opacity={isProcessing ? 0.5 : 1}
            >
              {t.batch.selectPhotos}
            </Button>
            {photos.length > 0 && (
              <Button
                chromeless
                size="$4"
                onPress={clearPhotos}
                disabled={isProcessing}
              >
                <SizableText color="$red10" size="$2">Clear</SizableText>
              </Button>
            )}
          </XStack>

          <SizableText size="$2" color="$color10">
            {photos.length} / {limit} photos selected
            {!isPro && photos.length >= BATCH_LIMIT && ' — Upgrade for up to 50'}
          </SizableText>

          {/* Photo grid */}
          {photos.length > 0 && (
            <XStack flexWrap="wrap" gap="$2">
              {photos.map((p) => (
                <Card
                  key={p.id}
                  width={72}
                  height={72}
                  borderRadius="$3"
                  overflow="hidden"
                  backgroundColor="$color3"
                  bordered
                  borderColor={p.status === 'failed' ? '$red7' : p.status === 'done' ? '$green7' : '$color4'}
                >
                  <YStack flex={1} position="relative">
                    <Image
                      source={{ uri: p.asset.uri }}
                      style={{ width: 72, height: 72 }}
                      contentFit="cover"
                    />
                    {p.status === 'done' && (
                      <YStack
                        position="absolute"
                        top={0}
                        left={0}
                        right={0}
                        bottom={0}
                        backgroundColor="rgba(0,0,0,0.5)"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Check size={18} color="$green9" />
                      </YStack>
                    )}
                    {p.status === 'failed' && (
                      <YStack
                        position="absolute"
                        top={0}
                        left={0}
                        right={0}
                        bottom={0}
                        backgroundColor="rgba(0,0,0,0.5)"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <AlertTriangle size={18} color="$red9" />
                      </YStack>
                    )}
                    {p.status === 'processing' && (
                      <YStack
                        position="absolute"
                        top={0}
                        left={0}
                        right={0}
                        bottom={0}
                        backgroundColor="rgba(0,0,0,0.5)"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Spinner size="small" color={ACCENT} />
                      </YStack>
                    )}
                    {p.status === 'pending' && (
                      <Button
                        position="absolute"
                        top={2}
                        right={2}
                        chromeless
                        size="$1"
                        onPress={() => removePhoto(p.id)}
                        backgroundColor="rgba(0,0,0,0.6)"
                        padding={4}
                        borderRadius="$10"
                      >
                        <X size={10} color="white" />
                      </Button>
                    )}
                  </YStack>
                </Card>
              ))}
            </XStack>
          )}
        </YStack>

        {/* Settings */}
        {photos.length > 0 && (
          <YStack paddingHorizontal="$5" paddingTop="$5" gap="$3">
            <H4 color="$color12" fontWeight="700">Settings</H4>

            <XStack gap="$3">
              <YStack flex={1} gap="$1">
                <SizableText size="$1" color="$color9">Width</SizableText>
                <YStack>
                  <InputShim
                    value={width}
                    onChangeText={setWidth}
                    keyboardType="numeric"
                    disabled={isProcessing}
                  />
                </YStack>
              </YStack>
              <SizableText color="$color9" marginTop="$4">x</SizableText>
              <YStack flex={1} gap="$1">
                <SizableText size="$1" color="$color9">Height</SizableText>
                <YStack>
                  <InputShim
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="numeric"
                    disabled={isProcessing}
                  />
                </YStack>
              </YStack>
            </XStack>

            <XStack gap="$3">
              <YStack flex={1} gap="$1">
                <SizableText size="$1" color="$color9">Format</SizableText>
                <BlinkSelect
                  items={FORMATS}
                  value={format}
                  onValueChange={setFormat}
                />
              </YStack>
              <YStack flex={1} gap="$1">
                <SizableText size="$1" color="$color9">Quality</SizableText>
                <BlinkSelect
                  items={[
                    { label: 'Max (100)', value: '100' },
                    { label: 'High (85)', value: '85' },
                    { label: 'Balanced (65)', value: '65' },
                    { label: 'Small (40)', value: '40' },
                  ]}
                  value={String(quality)}
                  onValueChange={(v) => setQuality(Number(v))}
                />
              </YStack>
            </XStack>

            <XStack gap="$3">
              <YStack flex={1} gap="$1">
                <SizableText size="$1" color="$color9">Fit mode</SizableText>
                <BlinkSelect
                  items={FIT_MODES}
                  value={fitMode}
                  onValueChange={setFitMode}
                />
              </YStack>
              <YStack flex={1} gap="$1" />
            </XStack>
          </YStack>
        )}

        {/* Progress */}
        {isProcessing && (
          <YStack paddingHorizontal="$5" paddingTop="$5" alignItems="center" gap="$3">
            <Spinner size="large" color={ACCENT} />
            <SizableText color="$color12">
              {t.batch.progress.replace('{current}', String(doneCount)).replace('{total}', String(photos.length))}
            </SizableText>
            <Button
              chromeless
              onPress={cancel}
              backgroundColor="$red3"
              paddingHorizontal="$4"
              borderRadius="$4"
            >
              <SizableText color="$red11" fontWeight="600">{t.common.cancel}</SizableText>
            </Button>
          </YStack>
        )}

        {/* Results summary */}
        {(doneCount > 0 || failCount > 0) && !isProcessing && (
          <YStack paddingHorizontal="$5" paddingTop="$5" gap="$2">
            <Card padding="$3" backgroundColor="$green3" borderRadius="$4">
              <XStack gap="$2" alignItems="center">
                <Check size={16} color="$green10" />
                <SizableText color="$green11" fontWeight="600">{doneCount} succeeded</SizableText>
              </XStack>
            </Card>
            {failCount > 0 && (
              <Card padding="$3" backgroundColor="$red3" borderRadius="$4">
                <XStack gap="$2" alignItems="center">
                  <AlertTriangle size={16} color="$red10" />
                  <SizableText color="$red11" fontWeight="600">
                    {t.batch.failed.replace('{count}', String(failCount)).replace('{plural}', failCount > 1 ? 's' : '')}
                  </SizableText>
                </XStack>
              </Card>
            )}
            <Button
              theme="active"
              size="$4"
              onPress={() => router.push('/(tabs)/projects')}
              icon={<Download size={18} color="white" />}
              borderRadius="$4"
            >
              View exports
            </Button>
          </YStack>
        )}

        {/* Start button */}
        {photos.length > 0 && !isProcessing && pendingCount > 0 && (
          <YStack paddingHorizontal="$5" paddingTop="$5">
            <Button
              theme="active"
              size="$5"
              onPress={processBatch}
              icon={<Play size={20} color="white" />}
              fontWeight="700"
              height={52}
              borderRadius="$4"
            >
              Process {pendingCount} image{pendingCount !== 1 ? 's' : ''}
            </Button>
          </YStack>
        )}

        {/* Empty state */}
        {photos.length === 0 && (
          <YStack paddingHorizontal="$5" paddingTop="$10" alignItems="center" gap="$4">
            <YStack
              width={64}
              height={64}
              borderRadius="$4"
              backgroundColor="$color3"
              alignItems="center"
              justifyContent="center"
            >
              <ImageIcon size={28} color="$color8" />
            </YStack>
            <Paragraph color="$color9" size="$3" textAlign="center">
              Select multiple images to resize them all at once using the same dimensions and settings.
            </Paragraph>
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}

// Thin wrapper for consistent disabled Input behavior
function InputShim({ value, onChangeText, disabled }: {
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: string;
  disabled?: boolean;
}) {
  return (
    <Input
      value={value}
      onChangeText={onChangeText}
      keyboardType="numeric"
      editable={!disabled}
      opacity={disabled ? 0.5 : 1}
    />
  );
}
