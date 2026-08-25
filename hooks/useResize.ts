import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useStore } from '@/lib/store';
import type { PlatformPreset } from '@/constants/presets';

export interface ResizeResult {
  uri: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  originalSizeKB: number;
  resultSizeKB: number;
  compressionRatio: number;
}

export function useResize() {
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [result, setResult] = useState<ResizeResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { incrementResizeCount, canResize } = useStore();

  const pickImage = useCallback(async () => {
    try {
      setError(null);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Photo library permission is required');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!pickerResult.canceled && pickerResult.assets.length > 0) {
        setImage(pickerResult.assets[0]);
        setResult(null);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to pick image');
    }
  }, []);

  const applyPreset = useCallback(async (preset: PlatformPreset) => {
    if (!image) return;

    if (!canResize()) {
      setError('Daily free limit reached. Upgrade to Pro for unlimited resizing.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const originalSizeKB = await getFileSizeKB(image.uri);

      const manipulateResult = await ImageManipulator.manipulateAsync(
        image.uri,
        [{ resize: { width: preset.width, height: preset.height } }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
      );

      const resultSizeKB = await getFileSizeKB(manipulateResult.uri);
      const compressionRatio = originalSizeKB > 0
        ? Math.round(((originalSizeKB - resultSizeKB) / originalSizeKB) * 100)
        : 0;

      const success = incrementResizeCount();
      if (!success) {
        setError('Daily free limit reached. Upgrade to Pro for unlimited resizing.');
        setIsProcessing(false);
        return;
      }

      setResult({
        uri: manipulateResult.uri,
        width: manipulateResult.width,
        height: manipulateResult.height,
        originalWidth: image.width,
        originalHeight: image.height,
        originalSizeKB,
        resultSizeKB,
        compressionRatio,
      });
    } catch (e: any) {
      setError(e.message || 'Failed to resize image');
    } finally {
      setIsProcessing(false);
    }
  }, [image, canResize, incrementResizeCount]);

  const customResize = useCallback(async (width: number, height: number, format: string, quality: number) => {
    if (!image) return;

    if (!canResize()) {
      setError('Daily free limit reached. Upgrade to Pro for unlimited resizing.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const originalSizeKB = await getFileSizeKB(image.uri);

      const saveFormat = format === 'png'
        ? ImageManipulator.SaveFormat.PNG
        : format === 'webp'
          ? ImageManipulator.SaveFormat.WEBP
          : ImageManipulator.SaveFormat.JPEG;

      const manipulateResult = await ImageManipulator.manipulateAsync(
        image.uri,
        [{ resize: { width, height } }],
        { compress: quality, format: saveFormat },
      );

      const resultSizeKB = await getFileSizeKB(manipulateResult.uri);
      const compressionRatio = originalSizeKB > 0
        ? Math.round(((originalSizeKB - resultSizeKB) / originalSizeKB) * 100)
        : 0;

      incrementResizeCount();

      setResult({
        uri: manipulateResult.uri,
        width: manipulateResult.width,
        height: manipulateResult.height,
        originalWidth: image.width,
        originalHeight: image.height,
        originalSizeKB,
        resultSizeKB,
        compressionRatio,
      });
    } catch (e: any) {
      setError(e.message || 'Failed to resize image');
    } finally {
      setIsProcessing(false);
    }
  }, [image, canResize, incrementResizeCount]);

  const cropImage = useCallback(async (
    originX: number,
    originY: number,
    cropWidth: number,
    cropHeight: number,
  ) => {
    if (!image) return;

    if (!canResize()) {
      setError('Daily free limit reached. Upgrade to Pro for unlimited resizing.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const originalSizeKB = await getFileSizeKB(image.uri);

      const manipulateResult = await ImageManipulator.manipulateAsync(
        image.uri,
        [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
      );

      const resultSizeKB = await getFileSizeKB(manipulateResult.uri);
      const compressionRatio = originalSizeKB > 0
        ? Math.round(((originalSizeKB - resultSizeKB) / originalSizeKB) * 100)
        : 0;

      incrementResizeCount();

      setImage({
        uri: manipulateResult.uri,
        width: manipulateResult.width,
        height: manipulateResult.height,
      });
      setResult({
        uri: manipulateResult.uri,
        width: manipulateResult.width,
        height: manipulateResult.height,
        originalWidth: image.width,
        originalHeight: image.height,
        originalSizeKB,
        resultSizeKB,
        compressionRatio,
      });
    } catch (e: any) {
      setError(e.message || 'Failed to crop image');
    } finally {
      setIsProcessing(false);
    }
  }, [image, canResize, incrementResizeCount]);

  const rotateImage = useCallback(async (degrees: number) => {
    if (!image) return;

    if (!canResize()) {
      setError('Daily free limit reached. Upgrade to Pro for unlimited resizing.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const manipulateResult = await ImageManipulator.manipulateAsync(
        image.uri,
        [{ rotate: degrees }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
      );

      incrementResizeCount();

      const newAsset = {
        uri: manipulateResult.uri,
        width: manipulateResult.width,
        height: manipulateResult.height,
      };
      setImage(newAsset);
      setResult(null);
    } catch (e: any) {
      setError(e.message || 'Failed to rotate image');
    } finally {
      setIsProcessing(false);
    }
  }, [image, canResize, incrementResizeCount]);

  const flipImage = useCallback(async (direction: 'horizontal' | 'vertical') => {
    if (!image) return;

    if (!canResize()) {
      setError('Daily free limit reached. Upgrade to Pro for unlimited resizing.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const manipulateResult = await ImageManipulator.manipulateAsync(
        image.uri,
        [{ flip: direction === 'horizontal' ? ImageManipulator.FlipType.Horizontal : ImageManipulator.FlipType.Vertical }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
      );

      incrementResizeCount();

      const newAsset = {
        uri: manipulateResult.uri,
        width: manipulateResult.width,
        height: manipulateResult.height,
      };
      setImage(newAsset);
      setResult(null);
    } catch (e: any) {
      setError(e.message || 'Failed to flip image');
    } finally {
      setIsProcessing(false);
    }
  }, [image, canResize, incrementResizeCount]);

  const reset = useCallback(() => {
    setImage(null);
    setResult(null);
    setError(null);
  }, []);

  return {
    image,
    result,
    isProcessing,
    error,
    pickImage,
    applyPreset,
    customResize,
    cropImage,
    rotateImage,
    flipImage,
    reset,
  };
}

async function getFileSizeKB(uri: string): Promise<number> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return Math.round(blob.size / 1024);
  } catch {
    return 0;
  }
}
