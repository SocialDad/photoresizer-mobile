import { useState, useCallback, useMemo, useEffect } from 'react';
import { Dimensions, Platform, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import * as Sharing from 'expo-sharing';
import { useStore } from '@/lib/store';
import { PLATFORM_PRESETS, type PlatformPreset } from '@/constants/presets';
import type { ExportResult } from '@/types';
import t from '@/constants/translations';
import {
  XStack, YStack, ZStack, View, ScrollView,
  Button, Input, Slider, Switch,
  SizableText, H4,
  Card, Separator,
  Spinner, toast, SafeArea,
} from '@blinkdotnew/mobile-ui';
import {
  ArrowLeft, Eye, EyeOff, HelpCircle,
  Image as ImageIcon, Maximize2, Download,
  Share2, Check, X, Crop,
} from '@tamagui/lucide-icons';

const SCREEN = Dimensions.get('window');
const CANVAS_HEIGHT = SCREEN.height * 0.45;
const CANVAS_WIDTH = SCREEN.width - 32;
const CANVAS_INNER_H = CANVAS_HEIGHT - 16;
const ACCENT = '#0EA5E9';
const FORMATS = ['jpeg', 'png', 'webp'] as const;
const QUALITY_PRESETS = [
  { label: 'Max', value: 100 },
  { label: 'High', value: 85 },
  { label: 'Balanced', value: 65 },
  { label: 'Small', value: 40 },
];

// ── 5 key aspect ratios shown prominently ──
const KEY_RATIOS = [
  { id: '1:1', w: 1, h: 1, label: '1:1' },
  { id: '3:4', w: 3, h: 4, label: '3:4' },
  { id: '4:3', w: 4, h: 3, label: '4:3' },
  { id: '16:9', w: 16, h: 9, label: '16:9' },
  { id: '9:16', w: 9, h: 16, label: '9:16' },
];

function groupByPlatform(presets: PlatformPreset[]) {
  const groups: Record<string, PlatformPreset[]> = {};
  for (const p of presets) {
    if (!groups[p.platform]) groups[p.platform] = [];
    groups[p.platform].push(p);
  }
  return groups;
}

function getImageDisplayRect(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  fit: 'contain' | 'cover',
) {
  const imageRatio = imageWidth / imageHeight;
  const canvasRatio = canvasWidth / canvasHeight;
  const displayScale = fit === 'cover'
    ? (imageRatio > canvasRatio ? canvasHeight / imageHeight : canvasWidth / imageWidth)
    : (imageRatio > canvasRatio ? canvasWidth / imageWidth : canvasHeight / imageHeight);
  const width = imageWidth * displayScale;
  const height = imageHeight * displayScale;
  return {
    left: (canvasWidth - width) / 2,
    top: (canvasHeight - height) / 2,
    width,
    height,
    scale: displayScale,
  };
}

function getCropRegionFromViewport(
  imageWidth: number,
  imageHeight: number,
  imageRect: { left: number; top: number; scale: number },
  frame: { left: number; top: number; w: number; h: number },
  canvasWidth: number,
  canvasHeight: number,
  zoom: number,
  translateX: number,
  translateY: number,
) {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const imageLeft = centerX + (imageRect.left - centerX) * zoom + translateX;
  const imageTop = centerY + (imageRect.top - centerY) * zoom + translateY;
  const pixelsPerPoint = imageRect.scale * zoom;
  const originX = Math.max(0, Math.round((frame.left - imageLeft) / pixelsPerPoint));
  const originY = Math.max(0, Math.round((frame.top - imageTop) / pixelsPerPoint));
  const width = Math.min(imageWidth - originX, Math.round(frame.w / pixelsPerPoint));
  const height = Math.min(imageHeight - originY, Math.round(frame.h / pixelsPerPoint));

  return {
    originX,
    originY,
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

type Tab = 'size' | 'fit' | 'background' | 'export';
type SizeView = 'ratios' | 'presets' | 'custom';
type FitMode = 'crop' | 'fit' | 'smart';

function mimeTypeForFormat(format: string) {
  return format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
}

async function downloadOnWeb(uri: string, filename: string) {
  const anchor = document.createElement('a');
  anchor.href = uri;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

async function saveImageToDevice(uri: string, filename: string) {
  if (Platform.OS === 'web') {
    await downloadOnWeb(uri, filename);
    return uri;
  }

  const MediaLibrary = await import('expo-media-library');
  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to save this image.');
  }
  const asset = await MediaLibrary.createAssetAsync(uri);
  return asset.uri;
}

async function shareImageDirectly(uri: string, format: string, filename: string) {
  const mimeType = mimeTypeForFormat(format);
  if (Platform.OS !== 'web') {
    if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Share Image' });
    return;
  }

  const webNavigator = navigator as Navigator & {
    share?: (data: { title?: string; files?: File[]; url?: string }) => Promise<void>;
    canShare?: (data: { files?: File[] }) => boolean;
  };
  if (webNavigator.share) {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: mimeType });
      if (!webNavigator.canShare || webNavigator.canShare({ files: [file] })) {
        await webNavigator.share({ title: 'Resized image', files: [file] });
        return;
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
    }
  }
  await downloadOnWeb(uri, filename);
}

export default function EditorScreen() {
  const {
    image, result, isProcessing, error,
    cropImage, customResize, resetImage,
    isPro, keepMetadata, setKeepMetadata, brandKits, addProject,
  } = useStore();

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('size');
  const [sizeView, setSizeView] = useState<SizeView>('ratios');
  const [customW, setCustomW] = useState('1080');
  const [customH, setCustomH] = useState('1350');
  const [lockAspect, setLockAspect] = useState(true);
  const [fitMode, setFitMode] = useState<FitMode>('crop');
  const [bgColor, setBgColor] = useState('#000000');
  const [bgBlur, setBgBlur] = useState(false);
  const [exportFormat, setExportFormat] = useState<typeof FORMATS[number]>('jpeg');
  const [exportQuality, setExportQuality] = useState(85);
  const [stripMetadata, setStripMetadata] = useState(true);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showBefore, setShowBefore] = useState(false);
  const [hasCropped, setHasCropped] = useState(false);
  const [showCropTarget, setShowCropTarget] = useState(false);

  // Crop target dimensions are declared before the gesture worklets so the
  // canvas can switch to an interactive crop mode immediately after selection.
  const cw = parseInt(customW, 10) || 0;
  const ch = parseInt(customH, 10) || 0;
  const hasCropTarget = showCropTarget && cw > 0 && ch > 0 && !hasCropped;

  // Pan + pinch zoom on the crop canvas. Translation is clamped so the image
  // can be repositioned inside the crop frame without exposing empty space.
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const imageFit = hasCropTarget ? 'cover' : 'contain';
  const imageRect = image
    ? getImageDisplayRect(image.width, image.height, CANVAS_WIDTH, CANVAS_INNER_H, imageFit)
    : { left: 0, top: 0, width: CANVAS_WIDTH, height: CANVAS_INNER_H, scale: 1 };

  const clampTranslation = (nextX: number, nextY: number, nextScale: number) => {
    'worklet';
    const scaledWidth = imageRect.width * nextScale;
    const scaledHeight = imageRect.height * nextScale;
    const maxX = Math.max(0, (scaledWidth - CANVAS_WIDTH) / 2);
    const maxY = Math.max(0, (scaledHeight - CANVAS_INNER_H) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, nextX)),
      y: Math.min(maxY, Math.max(-maxY, nextY)),
    };
  };

  const pinch = Gesture.Pinch()
    .onStart(() => { savedScale.value = scale.value; })
    .onUpdate((e) => {
      const nextScale = Math.min(4, Math.max(1, savedScale.value * e.scale));
      const next = clampTranslation(translateX.value, translateY.value, nextScale);
      scale.value = nextScale;
      translateX.value = next.x;
      translateY.value = next.y;
    })
    .onEnd(() => {
      runOnJS(setIsZoomed)(scale.value !== 1 || translateX.value !== 0 || translateY.value !== 0);
      if (scale.value < 1) scale.value = withSpring(1);
    });

  const pan = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      const next = clampTranslation(savedTranslateX.value + e.translationX, savedTranslateY.value + e.translationY, scale.value);
      translateX.value = next.x;
      translateY.value = next.y;
    })
    .onEnd(() => {
      runOnJS(setIsZoomed)(scale.value !== 1 || translateX.value !== 0 || translateY.value !== 0);
    });

  const canvasGesture = Gesture.Simultaneous(pan, pinch);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const resetZoom = useCallback(() => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    setIsZoomed(false);
  }, [scale, translateX, translateY]);

  useEffect(() => {
    return () => { resetImage(); };
  }, [resetImage]);

  // Crop frame dimensions (fit within canvas, maintain aspect ratio)
  const cropFrame = useMemo(() => {
    if (!hasCropTarget || !image) return null;
    const targetRatio = cw / ch;
    let fw: number, fh: number;
    if (CANVAS_WIDTH / CANVAS_INNER_H > targetRatio) {
      fh = CANVAS_INNER_H * 0.85;
      fw = fh * targetRatio;
    } else {
      fw = CANVAS_WIDTH * 0.85;
      fh = fw / targetRatio;
    }
    return { w: fw, h: fh, left: (CANVAS_WIDTH - fw) / 2, top: (CANVAS_INNER_H - fh) / 2 };
  }, [hasCropTarget, cw, ch, image]);

  // Derived
  const outputDims = useMemo(() => {
    if (cw > 0 && ch > 0) return `${cw} × ${ch}`;
    return image ? `${image.width} × ${image.height}` : '—';
  }, [cw, ch, image]);

  const estimatedSize = useMemo(() => {
    if (!image) return '—';
    const w = cw || image.width;
    const h = ch || image.height;
    const bpp = exportFormat === 'png' ? 4 : 3;
    const rawKB = (w * h * bpp) / 1024;
    const factor = exportFormat === 'webp' ? 0.6 : exportFormat === 'jpeg' ? 0.8 : 1.2;
    const compressedKB = rawKB * (exportQuality / 100) * factor;
    if (compressedKB > 1024) return `${(compressedKB / 1024).toFixed(1)} MB`;
    return `${Math.round(compressedKB)} KB`;
  }, [image, cw, ch, exportFormat, exportQuality]);

  const filenamePreview = useMemo(() => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `PhotoResizer_${cw || image?.width || 'IMG'}x${ch || image?.height || 'IMG'}_${date}.${exportFormat}`;
  }, [cw, ch, exportFormat, image]);

  // ── Select a ratio → set crop target dimensions (no resize yet) ──
  const handleRatioSelect = useCallback((ratioW: number, ratioH: number) => {
    if (!image) return;
    // Calculate dimensions that maintain ratio, bounded by image dimensions
    let w: number, h: number;
    if (image.width / image.height > ratioW / ratioH) {
      h = image.height;
      w = Math.round(h * (ratioW / ratioH));
    } else {
      w = image.width;
      h = Math.round(w / (ratioW / ratioH));
    }
    setCustomW(String(w));
    setCustomH(String(h));
    setHasCropped(false);
    setShowCropTarget(true);
  }, [image]);

  // ── Select a platform preset → set dimensions ──
  const handlePreset = useCallback((preset: PlatformPreset) => {
    setCustomW(String(preset.width));
    setCustomH(String(preset.height));
    setLockAspect(true);
    setHasCropped(false);
    setShowCropTarget(false);
  }, []);

  // ── Apply crop: convert the visible crop frame into source-image pixels ──
  const handleApplyCrop = useCallback(async () => {
    if (!image || !hasCropTarget || !cropFrame) return;
    const cropRegion = getCropRegionFromViewport(
      image.width,
      image.height,
      imageRect,
      cropFrame,
      CANVAS_WIDTH,
      CANVAS_INNER_H,
      scale.value,
      translateX.value,
      translateY.value,
    );
    await cropImage(cropRegion.originX, cropRegion.originY, cropRegion.width, cropRegion.height);
    setHasCropped(true);
    setCustomW(String(cropRegion.width));
    setCustomH(String(cropRegion.height));
  }, [image, hasCropTarget, cropFrame, imageRect, scale, translateX, translateY, cropImage]);

  // ── Custom size apply ──
  const handleCustomApply = useCallback(() => {
    const w = parseInt(customW, 10);
    const h = parseInt(customH, 10);
    if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > 12000 || h > 12000) {
      toast('Invalid dimensions', { message: 'Enter width and height from 1 to 12,000 pixels.', variant: 'error' });
      return;
    }
    setShowCropTarget(false);
    customResize(w, h, exportFormat, exportQuality / 100);
    setHasCropped(true);
  }, [customW, customH, customResize, exportFormat, exportQuality]);

  const handleCustomWChange = useCallback((val: string) => {
    setCustomW(val);
    if (lockAspect && image && hasCropTarget) {
      const nw = parseInt(val, 10);
      if (nw > 0) setCustomH(String(Math.round(nw / (cw / ch))));
    }
    setHasCropped(false);
  }, [lockAspect, image, hasCropTarget, cw, ch]);

  const handleCustomHChange = useCallback((val: string) => {
    setCustomH(val);
    if (lockAspect && image && hasCropTarget) {
      const nh = parseInt(val, 10);
      if (nh > 0) setCustomW(String(Math.round(nh * (cw / ch))));
    }
    setHasCropped(false);
  }, [lockAspect, image, hasCropTarget, cw, ch]);

  // ── Export ──
  const handleSaveResult = useCallback(async (resizeResult: { uri: string; width: number; height: number; resultSizeKB: number }) => {
    setIsSaving(true);
    try {
      const filename = `PhotoResizer_${resizeResult.width}x${resizeResult.height}_${new Date().toISOString().slice(0, 10)}.${exportFormat}`;
      const savedUri = await saveImageToDevice(resizeResult.uri, filename);
      setExportResult({
        uri: savedUri,
        width: resizeResult.width,
        height: resizeResult.height,
        format: exportFormat,
        sizeKB: resizeResult.resultSizeKB,
        timestamp: new Date().toISOString(),
        success: true,
      });
      toast('Saved', { message: Platform.OS === 'web' ? 'Download started.' : 'Image saved to your device.', variant: 'success' });
    } catch (e: any) {
      toast('Save failed', { message: e.message || 'The image could not be saved.', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [exportFormat]);

  const handleExport = useCallback(async () => {
    const w = parseInt(customW, 10);
    const h = parseInt(customH, 10);
    if (!image || !w || !h) { toast('No image', { message: 'Select dimensions first.', variant: 'error' }); return; }
    await customResize(w, h, exportFormat, exportQuality / 100);
    const latestResult = useStore.getState().result;
    if (!latestResult) {
      toast('Export failed', { message: useStore.getState().error || 'The image could not be resized.', variant: 'error' });
      return;
    }
    await handleSaveResult(latestResult);
    addProject({
      id: `proj_${Date.now()}`, sourceUri: image.uri,
      sourceWidth: image.width, sourceHeight: image.height,
      createdAt: new Date().toISOString(), selectedPresets: [],
      operationStack: [], outputSettings: { format: exportFormat, quality: exportQuality, width: w, height: h, stripMetadata, filename: filenamePreview },
      exportResults: [{
        uri: latestResult.uri, width: w, height: h, format: exportFormat,
        sizeKB: latestResult.resultSizeKB, timestamp: new Date().toISOString(), success: true,
      }],
    });
  }, [image, customW, customH, exportFormat, exportQuality, stripMetadata, filenamePreview, customResize, addProject, handleSaveResult]);

  const handleShareResult = useCallback(async (resizeResult: { uri: string }) => {
    try {
      const filename = `PhotoResizer_${new Date().toISOString().slice(0, 10)}.${exportFormat}`;
      await shareImageDirectly(resizeResult.uri, exportFormat, filename);
      toast('Ready to share', { message: Platform.OS === 'web' ? 'Share opened, or the image was downloaded.' : 'Choose an app to share your image.', variant: 'success' });
    } catch (e: any) {
      toast('Share failed', { message: e.message || 'The image could not be shared.', variant: 'error' });
    }
  }, [exportFormat]);

  const handleShare = useCallback(async () => {
    if (exportResult?.uri) await handleShareResult(exportResult);
  }, [exportResult, handleShareResult]);

  // Tab config — 4 tabs: Size, Fit, Background, Export
  const TABS: { key: Tab; icon: any; label: string }[] = useMemo(() => [
    { key: 'size', icon: ImageIcon, label: 'Size' },
    { key: 'fit', icon: Crop, label: 'Fit' },
    { key: 'background', icon: Maximize2, label: 'BG' },
    { key: 'export', icon: Download, label: 'Export' },
  ], []);

  if (!image) {
    return (
      <SafeArea>
        <YStack flex={1} backgroundColor="$color1" alignItems="center" justifyContent="center" padding="$6" gap="$4">
          <ImageIcon size={48} color="$color8" />
          <SizableText color="$color9">No image selected. Go back and pick a photo.</SizableText>
          <Button onPress={() => router.back()} theme="active">Go Back</Button>
        </YStack>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <ZStack flex={1}>
        <YStack flex={1}>
          {/* === TOP TOOLBAR === */}
          <XStack height={48} paddingHorizontal="$3" alignItems="center" justifyContent="space-between" backgroundColor="$color2" borderBottomWidth={1} borderBottomColor="$color4">
            <XStack gap="$2" alignItems="center">
              <Button chromeless size="$3" onPress={() => router.back()} padding="$1" icon={<ArrowLeft size={20} color="$color12" />} />
              <Button chromeless size="$3" onPress={() => setShowBefore(!showBefore)} padding="$1" icon={showBefore ? <Eye size={18} color={ACCENT} /> : <EyeOff size={18} color="$color12" />} />
            </XStack>
            <SizableText size="$3" color="$color12" fontWeight="600">
              {cw > 0 && ch > 0 ? `${cw}×${ch}` : `${image.width}×${image.height}`}
            </SizableText>
            <Button chromeless size="$3" onPress={() => setActiveTab('export')} padding="$1" icon={<Download size={18} color={ACCENT} />} />
          </XStack>

          {/* === CANVAS === */}
          <YStack height={CANVAS_HEIGHT} backgroundColor="$color1" alignItems="center" justifyContent="center" overflow="hidden">
            <GestureDetector gesture={canvasGesture}>
              <Animated.View style={animatedStyle}>
                <Pressable onPress={() => { if (isZoomed) resetZoom(); }} delayLongPress={250}>
                  <Image
                    source={{ uri: showBefore ? image.uri : (result?.uri ?? image.uri) }}
                    style={{ width: CANVAS_WIDTH, height: CANVAS_INNER_H }}
                    contentFit={imageFit}
                  />
                </Pressable>
              </Animated.View>
            </GestureDetector>

            {/* ── Crop frame overlay (shown when a ratio is selected but not yet applied) ── */}
            {cropFrame && (
              <>
                {/* Dimmed overlay outside frame */}
                <View
                  position="absolute"
                  top={8}
                  left={16}
                  width={CANVAS_WIDTH}
                  height={CANVAS_INNER_H}
                  pointerEvents="none"
                >
                  {/* Top dim */}
                  <View position="absolute" top={0} left={0} right={0} height={cropFrame.top} backgroundColor="rgba(0,0,0,0.55)" />
                  {/* Bottom dim */}
                  <View position="absolute" bottom={0} left={0} right={0} height={CANVAS_INNER_H - cropFrame.top - cropFrame.h} backgroundColor="rgba(0,0,0,0.55)" />
                  {/* Left dim */}
                  <View position="absolute" top={cropFrame.top} left={0} width={cropFrame.left} height={cropFrame.h} backgroundColor="rgba(0,0,0,0.55)" />
                  {/* Right dim */}
                  <View position="absolute" top={cropFrame.top} right={0} width={CANVAS_WIDTH - cropFrame.left - cropFrame.w} height={cropFrame.h} backgroundColor="rgba(0,0,0,0.55)" />
                  {/* Crop frame border */}
                  <View
                    position="absolute"
                    top={cropFrame.top}
                    left={cropFrame.left}
                    width={cropFrame.w}
                    height={cropFrame.h}
                    borderWidth={2}
                    borderColor={ACCENT}
                    borderStyle="dashed"
                  />
                  {/* Corner handles */}
                  {[
                    { top: cropFrame.top - 4, left: cropFrame.left - 4 },
                    { top: cropFrame.top - 4, left: cropFrame.left + cropFrame.w - 16 },
                    { top: cropFrame.top + cropFrame.h - 16, left: cropFrame.left - 4 },
                    { top: cropFrame.top + cropFrame.h - 16, left: cropFrame.left + cropFrame.w - 16 },
                  ].map((pos, i) => (
                    <View key={i} position="absolute" top={pos.top} left={pos.left} width={20} height={20} borderRadius="$2" borderWidth={3} borderColor={ACCENT} />
                  ))}
                </View>
              </>
            )}

            {isZoomed && (
              <Button position="absolute" bottom="$2" size="$2" chromeless onPress={resetZoom} backgroundColor="$color2" paddingHorizontal="$4">
                <SizableText size="$1" color="$color12">Double-tap to reset</SizableText>
              </Button>
            )}

            {/* ── Result badge ── */}
            {result && (
              <Card position="absolute" top="$2" right="$2" paddingHorizontal="$2" paddingVertical="$1" backgroundColor={showBefore ? '$color3' : '$green3'} borderRadius="$3">
                <SizableText size="$1" color={showBefore ? '$color10' : '$green10'} fontWeight="600">
                  {showBefore ? 'Before' : `${result.width}×${result.height}`}
                </SizableText>
              </Card>
            )}

            {/* ── Preview & Save banner ── */}
            {result && !showBefore && (
              <Card
                position="absolute" bottom="$3" left="$3" right="$3"
                backgroundColor="$green3" borderColor="$green7" borderWidth={1}
                padding="$3" borderRadius="$4"
                pressStyle={{ scale: 0.98 }}
              >
                <XStack gap="$2" alignItems="center" justifyContent="space-between">
                  <YStack flex={1} gap="$1">
                    <SizableText size="$2" color="$green11" fontWeight="700">
                      Resized: {result.width}×{result.height}
                    </SizableText>
                    <SizableText size="$1" color="$green9">
                      {result.resultSizeKB} KB · {result.compressionRatio > 0 ? `${result.compressionRatio}% smaller` : 'Ready'}
                    </SizableText>
                  </YStack>
                  <Button
                    chromeless
                    size="$3"
                    borderRadius="$3"
                    backgroundColor="$green7"
                    paddingHorizontal="$3"
                    onPress={async () => {
                      try {
                        if (await Sharing.isAvailableAsync()) {
                          await Sharing.shareAsync(result.uri, { mimeType: 'image/jpeg', dialogTitle: 'Share Image' });
                        } else {
                          toast('Share unavailable', { message: 'Sharing is not available on this platform.', variant: 'error' });
                        }
                      } catch {
                        toast('Share unavailable', { message: 'This image could not be shared yet.', variant: 'error' });
                      }
                    }}
                  >
                    <Share2 size={16} color="$green12" />
                    <SizableText marginLeft="$1" size="$2" color="$green12" fontWeight="600">Share</SizableText>
                  </Button>
                  <Button theme="active" size="$3" borderRadius="$3" onPress={() => setActiveTab('export')}>
                    Save
                  </Button>
                </XStack>
              </Card>
            )}
          </YStack>

          {/* === BOTTOM TABS === */}
          <XStack borderTopWidth={1} borderTopColor="$color4" backgroundColor="$color2" minHeight={56} paddingBottom="$1">
            {hasCropTarget && (
              <Card position="absolute" bottom={60} left="$3" right="$3" zIndex={2} paddingHorizontal="$3" paddingVertical="$2" backgroundColor="$color4" borderRadius="$3">
                <SizableText size="$1" color="$color12" textAlign="center">
                  Drag to reposition · Pinch to scale
                </SizableText>
              </Card>
            )}
            {TABS.map((tab) => (
              <Button
                key={tab.key}
                flex={1} chromeless size="$3"
                paddingVertical="$2" minHeight={48}
                onPress={() => setActiveTab(tab.key)}
                backgroundColor={activeTab === tab.key ? '$color3' : 'transparent'}
                borderBottomWidth={activeTab === tab.key ? 2 : 0}
                borderBottomColor={ACCENT}
                borderRadius={0}
              >
                <YStack alignItems="center" gap="$1">
                  <tab.icon size={16} color={activeTab === tab.key ? ACCENT : '$color10'} />
                  <SizableText size="$2" color={activeTab === tab.key ? ACCENT : '$color10'} fontWeight="600">{tab.label}</SizableText>
                </YStack>
              </Button>
            ))}
          </XStack>

          {/* === TAB CONTENT === */}
          <ScrollView flex={1} backgroundColor="$color2" padding="$3">
            {activeTab === 'size' && (
              <SizePanel
                {...{ sizeView, setSizeView, customW, customH, lockAspect, setLockAspect,
                  handleRatioSelect, handlePreset, handleCustomApply, handleCustomWChange, handleCustomHChange,
                  result, hasCropTarget, handleApplyCrop, cw, ch, image }}
              />
            )}
            {activeTab === 'fit' && (
              <FitPanel {...{ fitMode, setFitMode, image, customW, customH, result, cropImage, cw, ch, hasCropTarget, handleApplyCrop }} />
            )}
            {activeTab === 'background' && (
              <BackgroundPanel {...{ bgColor, setBgColor, bgBlur, setBgBlur, brandKits }} />
            )}
            {activeTab === 'export' && (
              <ExportPanel {...{ exportFormat, setExportFormat, exportQuality, setExportQuality, stripMetadata, setStripMetadata, keepMetadata, setKeepMetadata, outputDims, estimatedSize, filenamePreview, handleExport, exportResult, setExportResult, handleShare, isPro, FORMATS, QUALITY_PRESETS, result }} />
            )}
          </ScrollView>
        </YStack>

        {/* === PROCESSING OVERLAY === */}
        {isProcessing && (
          <ZStack flex={1} backgroundColor="rgba(0,0,0,0.6)" alignItems="center" justifyContent="center">
            <Card padding="$6" alignItems="center" gap="$4" backgroundColor="$color2">
              <Spinner size="large" color={ACCENT} />
              <SizableText color="$color12">Processing&hellip;</SizableText>
            </Card>
          </ZStack>
        )}

        {/* === ERROR BANNER === */}
        {error && (
          <Card position="absolute" bottom={60} left="$3" right="$3" backgroundColor="$red3" borderColor="$red7" borderWidth={1} padding="$3">
            <XStack gap="$2" alignItems="center">
              <SizableText flex={1} color="$red11" size="$2">{error}</SizableText>
              <Button chromeless size="$2" onPress={() => useStore.getState().resetImage()} icon={<X size={14} color="$red11" />} />
            </XStack>
          </Card>
        )}
      </ZStack>
    </SafeArea>
  );
}

// ===== SIZE PANEL =====
function SizePanel({
  sizeView, setSizeView, customW, customH, lockAspect, setLockAspect,
  handleRatioSelect, handlePreset, handleCustomApply, handleCustomWChange, handleCustomHChange,
  result, hasCropTarget, handleApplyCrop, cw, ch,
}: any) {
  const platformGroups = useMemo(() => groupByPlatform(PLATFORM_PRESETS), []);

  return (
    <YStack gap="$3">
      {/* Sub-tabs */}
      <XStack gap="$2">
        {([
          { key: 'ratios', label: 'Aspect' },
          { key: 'presets', label: 'Platforms' },
          { key: 'custom', label: 'Custom' },
        ] as const).map((v) => (
          <Button key={v.key} size="$2" chromeless onPress={() => setSizeView(v.key)} backgroundColor={sizeView === v.key ? '$color4' : 'transparent'} paddingHorizontal="$3" borderRadius="$4">
            <SizableText size="$2" color={sizeView === v.key ? '$color12' : '$color9'}>{v.label}</SizableText>
          </Button>
        ))}
      </XStack>
      <Separator />

      {/* ── Aspect Ratios (default) ── */}
      {sizeView === 'ratios' && (
        <YStack gap="$3">
          <XStack gap="$2">
            {KEY_RATIOS.map((r) => (
              <Button
                key={r.id}
                chromeless
                flex={1}
                size="$3"
                onPress={() => handleRatioSelect(r.w, r.h)}
                backgroundColor="$color3"
                paddingVertical="$4"
                paddingHorizontal="$2"
                borderRadius="$4"
                alignItems="center"
                justifyContent="center"
              >
                <SizableText size="$4" color={ACCENT} fontWeight="800">{r.label}</SizableText>
              </Button>
            ))}
          </XStack>
          {hasCropTarget && (
            <Card padding="$3" backgroundColor="$color3" borderRadius="$4" gap="$3">
              <SizableText size="$2" color="$color12" fontWeight="600">
                Crop target: {cw} × {ch}
              </SizableText>
              <SizableText size="$1" color="$color9">
                Drag the image to choose what stays in frame, pinch to scale, then apply the crop.
              </SizableText>
              <XStack gap="$2">
                <Button flex={1} onPress={handleApplyCrop} theme="active" borderRadius="$4">
                  Apply Crop
                </Button>
                <Button flex={1} chromeless onPress={() => setSizeView('custom')} backgroundColor="$color3" borderRadius="$4">
                  <SizableText size="$2" color="$color12">Edit Size</SizableText>
                </Button>
              </XStack>
            </Card>
          )}
        </YStack>
      )}

      {/* ── Platform Presets ── */}
      {sizeView === 'presets' && (
        <YStack gap="$4">
          {Object.entries(platformGroups).map(([platform, presets]) => (
            <YStack key={platform} gap="$2">
              <SizableText size="$2" color="$color9" fontWeight="600">{platform}</SizableText>
              <XStack flexWrap="wrap" gap="$2">
                {presets.map((p, i) => (
                  <Card
                    key={i}
                    bordered
                    pressStyle={{ scale: 0.96, opacity: 0.8 }}
                    onPress={() => handlePreset(p)}
                    backgroundColor="$color3"
                    borderColor="$color4"
                    paddingHorizontal="$3"
                    paddingVertical="$3"
                    borderRadius="$3"
                    width="48%"
                    alignItems="center"
                    gap="$1"
                    hoverStyle={{ borderColor: ACCENT }}
                  >
                    <SizableText
                      size="$2"
                      color="$color12"
                      fontWeight="600"
                      numberOfLines={1}
                      textAlign="center"
                    >
                      {p.placementName}
                    </SizableText>
                    <SizableText
                      size="$2"
                      color={ACCENT}
                      fontWeight="700"
                      numberOfLines={1}
                    >
                      {p.width}×{p.height}
                    </SizableText>
                  </Card>
                ))}
              </XStack>
            </YStack>
          ))}
        </YStack>
      )}

      {/* ── Custom ── */}
      {sizeView === 'custom' && (
        <YStack gap="$3">
          <XStack gap="$3" alignItems="center">
            <YStack flex={1} gap="$1">
              <SizableText size="$1" color="$color9">Width</SizableText>
              <Input value={customW} onChangeText={handleCustomWChange} keyboardType="numeric" size="$3" />
            </YStack>
            <SizableText color="$color9" marginTop="$4">×</SizableText>
            <YStack flex={1} gap="$1">
              <SizableText size="$1" color="$color9">Height</SizableText>
              <Input value={customH} onChangeText={handleCustomHChange} keyboardType="numeric" size="$3" />
            </YStack>
          </XStack>
          <XStack gap="$2" alignItems="center">
            <SizableText size="$2" color="$color9">Lock aspect ratio</SizableText>
            <Switch checked={lockAspect} onCheckedChange={setLockAspect} size="$2" />
          </XStack>
          <Button theme="active" onPress={handleCustomApply} borderRadius="$4">Resize to Custom</Button>
        </YStack>
      )}
    </YStack>
  );
}

// ===== FIT PANEL (simplified — no guides) =====
function FitPanel({ fitMode, setFitMode, image, customW, customH, result, cropImage, cw, ch, hasCropTarget, handleApplyCrop }: any) {
  const modes: { key: string; label: string }[] = [
    { key: 'crop', label: 'Crop to fill' },
    { key: 'fit', label: 'Fit with background' },
    { key: 'smart', label: 'Smart focal point' },
  ];

  // Manual crop sub-controls
  const [cropX, setCropX] = useState('0');
  const [cropY, setCropY] = useState('0');
  const [cropW, setCropW] = useState(String(image?.width ?? 400));
  const [cropH, setCropH] = useState(String(image?.height ?? 400));

  const handleManualCrop = useCallback(async () => {
    if (!image) return;
    const ox = parseInt(cropX, 10);
    const oy = parseInt(cropY, 10);
    const cw_ = parseInt(cropW, 10);
    const ch_ = parseInt(cropH, 10);
    if (cw_ > 0 && ch_ > 0 && ox + cw_ <= image.width && oy + ch_ <= image.height) {
      await cropImage(ox, oy, cw_, ch_);
    } else {
      toast('Invalid crop', { message: 'Crop must be within image bounds.', variant: 'error' });
    }
  }, [cropX, cropY, cropW, cropH, image, cropImage]);

  return (
    <YStack gap="$3">
      {modes.map((m) => (
        <Button key={m.key} chromeless size="$3" onPress={() => setFitMode(m.key)} backgroundColor={fitMode === m.key ? '$color4' : '$color3'} padding="$3" borderRadius="$4" justifyContent="flex-start">
          <XStack gap="$3" alignItems="center">
            <View width={20} height={20} borderRadius="$10" borderWidth={2} borderColor={fitMode === m.key ? ACCENT : '$color7'} alignItems="center" justifyContent="center">
              {fitMode === m.key && <View width={10} height={10} borderRadius="$5" backgroundColor={ACCENT} />}
            </View>
            <SizableText color="$color12">{m.label}</SizableText>
          </XStack>
        </Button>
      ))}

      {/* ── Quick crop from current ratio ── */}
      {hasCropTarget && fitMode === 'crop' && (
        <Card padding="$3" backgroundColor="$color3" borderRadius="$4" gap="$3">
          <SizableText size="$2" color="$color12" fontWeight="600">
            Crop to {cw}×{ch}
          </SizableText>
          <Button theme="active" size="$3" onPress={handleApplyCrop} borderRadius="$3">
            Apply Center Crop
          </Button>
        </Card>
      )}

      {/* ── Manual crop region ── */}
      {fitMode === 'crop' && (
        <YStack gap="$2" backgroundColor="$color3" padding="$3" borderRadius="$3">
          <SizableText size="$2" color="$color12" fontWeight="600">Manual crop region</SizableText>
          <XStack gap="$2">
            <YStack flex={1} gap="$1">
              <SizableText size="$1" color="$color9">X</SizableText>
              <Input value={cropX} onChangeText={setCropX} keyboardType="numeric" size="$2" />
            </YStack>
            <YStack flex={1} gap="$1">
              <SizableText size="$1" color="$color9">Y</SizableText>
              <Input value={cropY} onChangeText={setCropY} keyboardType="numeric" size="$2" />
            </YStack>
          </XStack>
          <XStack gap="$2">
            <YStack flex={1} gap="$1">
              <SizableText size="$1" color="$color9">Width</SizableText>
              <Input value={cropW} onChangeText={setCropW} keyboardType="numeric" size="$2" />
            </YStack>
            <YStack flex={1} gap="$1">
              <SizableText size="$1" color="$color9">Height</SizableText>
              <Input value={cropH} onChangeText={setCropH} keyboardType="numeric" size="$2" />
            </YStack>
          </XStack>
          <Button theme="active" size="$2" onPress={handleManualCrop} borderRadius="$3">
            Apply Crop
          </Button>
        </YStack>
      )}

      {/* ── Result ── */}
      {result && (
        <Card padding="$3" backgroundColor="$green3" borderRadius="$3" marginTop="$2">
          <XStack gap="$2" alignItems="center">
            <Check size={14} color="$green10" />
            <SizableText size="$2" color="$green11" fontWeight="600">
              Resized: {result.width}×{result.height} · {result.resultSizeKB} KB
            </SizableText>
          </XStack>
        </Card>
      )}
    </YStack>
  );
}

// ===== BACKGROUND PANEL =====
function BackgroundPanel({ bgColor, setBgColor, bgBlur, setBgBlur, brandKits }: any) {
  const colors = [
    { label: 'White', value: '#FFFFFF' },
    { label: 'Black', value: '#000000' },
    { label: 'Transparent', value: 'transparent' },
  ];
  return (
    <YStack gap="$3">
      <H4 color="$color12">Background color</H4>
      <XStack gap="$2">
        {colors.map((c) => (
          <Button key={c.value} chromeless size="$3" onPress={() => setBgColor(c.value)} padding="$2" borderRadius="$3" backgroundColor={bgColor === c.value ? '$color4' : '$color3'}>
            <YStack alignItems="center" gap="$1">
              <View
                width={28} height={28} borderRadius="$2"
                backgroundColor={c.value === 'transparent' ? 'transparent' : c.value}
                borderWidth={c.value === 'transparent' || c.value === '#FFFFFF' ? 1 : 0}
                borderColor="$color6"
              >
                {c.value === 'transparent' && (
                  <View flex={1} overflow="hidden" borderRadius="$2">
                    <View position="absolute" top={0} left={0} right={14} bottom={14} backgroundColor="$color3" />
                    <View position="absolute" top={14} left={14} right={0} bottom={0} backgroundColor="$color6" />
                  </View>
                )}
              </View>
              <SizableText size="$1" color="$color10">{c.label}</SizableText>
            </YStack>
          </Button>
        ))}
      </XStack>
      {brandKits.length > 0 && (
        <YStack gap="$1">
          <SizableText size="$2" color="$color9">Brand colors</SizableText>
          <XStack gap="$2">
            {brandKits.flatMap((bk: any) => [bk.primaryColor, bk.secondaryColor]).filter(Boolean).map((c: string, i: number) => (
              <Button key={i} chromeless size="$2" onPress={() => setBgColor(c)} padding={0} borderRadius="$4">
                <View width={36} height={36} borderRadius="$3" backgroundColor={c} borderWidth={bgColor === c ? 2 : 0} borderColor={ACCENT} />
              </Button>
            ))}
          </XStack>
        </YStack>
      )}
      <Separator />
      <XStack gap="$2" alignItems="center" justifyContent="space-between">
        <SizableText color="$color12" size="$2">Blurred background</SizableText>
        <Switch checked={bgBlur} onCheckedChange={setBgBlur} size="$2" />
      </XStack>
    </YStack>
  );
}

// ===== EXPORT PANEL =====
function ExportPanel({ exportFormat, setExportFormat, exportQuality, setExportQuality, stripMetadata, setStripMetadata, keepMetadata, setKeepMetadata, outputDims, estimatedSize, filenamePreview, handleExport, exportResult, setExportResult, handleShare, isPro, FORMATS, QUALITY_PRESETS, result }: any) {
  return (
    <YStack gap="$3">
      {result && (
        <Card borderRadius="$4" overflow="hidden" bordered borderColor="$green7" borderWidth={1}>
          <Image
            source={{ uri: result.uri }}
            style={{ width: '100%', height: 180 }}
            contentFit="contain"
          />
          <XStack padding="$3" backgroundColor="$green3" justifyContent="space-between" alignItems="center">
            <SizableText size="$2" color="$green11" fontWeight="600">
              {result.width}×{result.height} · {result.resultSizeKB} KB
            </SizableText>
            <SizableText size="$1" color="$green9">
              {result.compressionRatio > 0 ? `${result.compressionRatio}% smaller` : 'Ready'}
            </SizableText>
          </XStack>
        </Card>
      )}
      <H4 color="$color12">{t.export.format}</H4>
      <XStack gap="$2">
        {FORMATS.map((fmt: string) => (
          <Button
            key={fmt} chromeless size="$2"
            onPress={() => setExportFormat(fmt)}
            backgroundColor={exportFormat === fmt ? '$color4' : '$color3'}
            paddingHorizontal="$4" borderRadius="$4"
          >
            <SizableText size="$2" color={exportFormat === fmt ? ACCENT : '$color12'} fontWeight="600">{fmt.toUpperCase()}</SizableText>
          </Button>
        ))}
      </XStack>
      <Separator />
      <YStack gap="$1">
        <XStack justifyContent="space-between">
          <SizableText size="$2" color="$color12">{t.export.quality}</SizableText>
          <SizableText size="$2" color={ACCENT}>{exportQuality}</SizableText>
        </XStack>
        <Slider value={[exportQuality]} onValueChange={(v) => setExportQuality(v[0])} min={1} max={100} step={1} width="100%">
          <Slider.Track height={4} backgroundColor="$color4" borderRadius="$2">
            <Slider.TrackActive backgroundColor={ACCENT} />
          </Slider.Track>
          <Slider.Thumb index={0} size="$2" backgroundColor={ACCENT} circular />
        </Slider>
        <XStack gap="$2" flexWrap="wrap" marginTop="$1">
          {QUALITY_PRESETS.map((qp: any) => (
            <Button key={qp.label} chromeless size="$1" onPress={() => setExportQuality(qp.value)} backgroundColor={exportQuality === qp.value ? '$color4' : '$color3'} paddingHorizontal="$2" borderRadius="$2">
              <SizableText size="$1" color={exportQuality === qp.value ? ACCENT : '$color9'}>{qp.label}</SizableText>
            </Button>
          ))}
        </XStack>
      </YStack>
      <Separator />
      <Card padding="$3" backgroundColor="$color3" borderRadius="$3">
        <XStack justifyContent="space-between">
          <SizableText size="$2" color="$color9">{t.export.dimensions}</SizableText>
          <SizableText size="$2" color="$color12" fontWeight="600">{outputDims}</SizableText>
        </XStack>
      </Card>
      <Card padding="$3" backgroundColor="$color3" borderRadius="$3">
        <XStack justifyContent="space-between">
          <SizableText size="$2" color="$color9">{t.export.estimatedSize}</SizableText>
          <SizableText size="$2" color="$color12" fontWeight="600">{estimatedSize}</SizableText>
        </XStack>
      </Card>
      <Separator />
      <YStack gap="$1">
        <XStack gap="$2" alignItems="center" justifyContent="space-between">
          <YStack flex={1}>
            <SizableText size="$2" color="$color12">{t.export.stripMetadata}</SizableText>
            <SizableText size="$1" color="$color9">Removes GPS, camera, and editing history from the file.</SizableText>
          </YStack>
          <Switch checked={stripMetadata} onCheckedChange={setStripMetadata} size="$2" />
        </XStack>
      </YStack>
      <YStack gap="$1">
        <XStack gap="$2" alignItems="center" justifyContent="space-between">
          <YStack flex={1}>
            <SizableText size="$2" color="$color12">{t.export.keepMetadata}</SizableText>
            <SizableText size="$1" color="$red10">{t.export.metadataWarning}</SizableText>
          </YStack>
          <Switch checked={keepMetadata} onCheckedChange={setKeepMetadata} size="$2" />
        </XStack>
      </YStack>
      <Separator />
      <Card padding="$3" backgroundColor="$color3" borderRadius="$3">
        <SizableText size="$2" color="$color9" numberOfLines={1}>{filenamePreview}</SizableText>
      </Card>
      {!exportResult ? (
        <Button theme="active" onPress={handleExport} size="$4" borderRadius="$4" marginTop="$2">
          <Download size={18} color="#fff" />
          <SizableText marginLeft="$2" color="white" fontWeight="600">Export</SizableText>
        </Button>
      ) : (
        <YStack gap="$2" marginTop="$2">
          <Card padding="$3" backgroundColor="$green3" borderRadius="$3" alignItems="center">
            <Check size={20} color="$green10" />
            <SizableText color="$green11" size="$2" fontWeight="600">Saved to gallery</SizableText>
          </Card>
          <XStack gap="$2" flexWrap="wrap">
            <Button flex={1} onPress={handleShare} size="$3" borderRadius="$4" backgroundColor="$color3">
              <Share2 size={16} color="$color12" />
              <SizableText marginLeft="$2" color="$color12" size="$2">{t.export.share}</SizableText>
            </Button>
            <Button flex={1} onPress={() => setExportResult(null)} size="$3" borderRadius="$4" backgroundColor="$color3">
              <Download size={16} color="$color12" />
              <SizableText marginLeft="$2" color="$color12" size="$2">{t.export.saveAnother}</SizableText>
            </Button>
          </XStack>
          <XStack gap="$2">
            <Button flex={1} onPress={() => router.back()} size="$3" borderRadius="$4" backgroundColor="$color4">
              <SizableText color="$color12" size="$2">{t.export.done}</SizableText>
            </Button>
          </XStack>
        </YStack>
      )}
    </YStack>
  );
}