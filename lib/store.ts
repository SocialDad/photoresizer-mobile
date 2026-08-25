import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import type { Project, CustomPreset, BrandKit, AiCreditBalance } from '@/types';
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

interface AppState {
  // Subscriptions
  isPro: boolean;
  aiCredits: AiCreditBalance;
  setIsPro: (pro: boolean) => void;
  addAiCredits: (amount: number) => void;
  useAiCredit: () => boolean;

  // Limits
  dailyResizeCount: number;
  incrementResizeCount: () => boolean;
  canResize: () => boolean;

  // Onboarding
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (done: boolean) => void;

  // Image state (shared across screens!)
  image: ImagePicker.ImagePickerAsset | null;
  result: ResizeResult | null;
  isProcessing: boolean;
  error: string | null;
  pickImage: () => Promise<void>;
  applyPreset: (preset: PlatformPreset) => Promise<void>;
  customResize: (width: number, height: number, format: string, quality: number) => Promise<void>;
  cropImage: (originX: number, originY: number, cropWidth: number, cropHeight: number) => Promise<void>;
  rotateImage: (degrees: number) => Promise<void>;
  flipImage: (direction: 'horizontal' | 'vertical') => Promise<void>;
  resetImage: () => void;

  // Projects
  projects: Project[];
  recentExports: Project[];
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  clearTemporaryFiles: () => void;

  // Custom presets
  customPresets: CustomPreset[];
  addCustomPreset: (preset: CustomPreset) => void;
  deleteCustomPreset: (id: string) => void;

  // Brand kits
  brandKits: BrandKit[];
  addBrandKit: (kit: BrandKit) => void;

  // Settings
  analyticsOptOut: boolean;
  setAnalyticsOptOut: (optOut: boolean) => void;
  keepMetadata: boolean;
  setKeepMetadata: (keep: boolean) => void;
}

const AI_CREDITS_STORAGE_KEY = 'photoresizer.aiCredits';

function persistAiCredits(balance: AiCreditBalance) {
  AsyncStorage.setItem(AI_CREDITS_STORAGE_KEY, JSON.stringify(balance)).catch(() => undefined);
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

export const useStore = create<AppState>((set, get) => ({
  isPro: false,
  aiCredits: { total: 0, used: 0, remaining: 0 },
  setIsPro: (pro) => set({ isPro: pro }),
  addAiCredits: (amount) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const state = get();
    const balance = {
      ...state.aiCredits,
      total: state.aiCredits.total + amount,
      remaining: state.aiCredits.remaining + amount,
    };
    set({ aiCredits: balance });
    persistAiCredits(balance);
  },
  useAiCredit: () => {
    const state = get();
    if (state.isPro) return true;
    if (state.aiCredits.remaining <= 0) return false;
    const balance = { ...state.aiCredits, remaining: state.aiCredits.remaining - 1, used: state.aiCredits.used + 1 };
    set({ aiCredits: balance });
    persistAiCredits(balance);
    return true;
  },

  dailyResizeCount: 0,
  incrementResizeCount: () => {
    const state = get();
    if (state.isPro) {
      set({ dailyResizeCount: state.dailyResizeCount + 1 });
      return true;
    }
    if (state.dailyResizeCount >= 50) return false;
    set({ dailyResizeCount: state.dailyResizeCount + 1 });
    return true;
  },
  canResize: () => {
    const state = get();
    if (state.isPro) return true;
    return state.dailyResizeCount < 50;
  },

  hasCompletedOnboarding: false,
  setHasCompletedOnboarding: (done) => set({ hasCompletedOnboarding: done }),

  // ── Image state (shared across screens) ──
  image: null,
  result: null,
  isProcessing: false,
  error: null,

  pickImage: async () => {
    set({ error: null });
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        set({ error: 'Photo library permission is required' });
        return;
      }
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });
      if (!pickerResult.canceled && pickerResult.assets.length > 0) {
        const asset = pickerResult.assets[0];
        // On web, blob: URIs are ephemeral and don't survive navigation.
        // Convert to a persistent data: URI so the image displays in the editor.
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
          } catch {
            // Keep original blob URI as fallback
          }
        }
        set({ image: { ...asset, uri }, result: null });
      }
    } catch (e: any) {
      set({ error: e.message || 'Failed to pick image' });
    }
  },

  applyPreset: async (preset) => {
    const { image, canResize, incrementResizeCount } = get();
    if (!image) return;
    if (!canResize()) { set({ error: 'Daily free limit reached. Upgrade to Pro.' }); return; }

    set({ isProcessing: true, error: null, result: null });
    try {
      const originalSizeKB = await getFileSizeKB(image.uri);
      const manipulateResult = await ImageManipulator.manipulateAsync(
        image.uri,
        [{ resize: { width: preset.width, height: preset.height } }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
      );
      const resultSizeKB = await getFileSizeKB(manipulateResult.uri);
      const success = incrementResizeCount();
      if (!success) { set({ error: 'Daily free limit reached. Upgrade to Pro.', isProcessing: false }); return; }

      set({
        result: {
          uri: manipulateResult.uri,
          width: manipulateResult.width,
          height: manipulateResult.height,
          originalWidth: image.width,
          originalHeight: image.height,
          originalSizeKB,
          resultSizeKB,
          compressionRatio: originalSizeKB > 0 ? Math.round(((originalSizeKB - resultSizeKB) / originalSizeKB) * 100) : 0,
        },
        isProcessing: false,
      });
    } catch (e: any) {
      set({ error: e.message || 'Failed to resize', isProcessing: false });
    }
  },

  customResize: async (width, height, format, quality) => {
    const { image, canResize, incrementResizeCount } = get();
    if (!image) return;
    if (!canResize()) { set({ error: 'Daily free limit reached. Upgrade to Pro.' }); return; }

    set({ isProcessing: true, error: null, result: null });
    try {
      const originalSizeKB = await getFileSizeKB(image.uri);
      const saveFormat = format === 'png' ? ImageManipulator.SaveFormat.PNG
        : format === 'webp' ? ImageManipulator.SaveFormat.WEBP
        : ImageManipulator.SaveFormat.JPEG;
      const manipulateResult = await ImageManipulator.manipulateAsync(
        image.uri,
        [{ resize: { width, height } }],
        { compress: quality, format: saveFormat },
      );
      const resultSizeKB = await getFileSizeKB(manipulateResult.uri);
      const success = incrementResizeCount();
      if (!success) {
        set({ error: 'Daily free limit reached. Upgrade to Pro.', isProcessing: false });
        return;
      }
      set({
        result: {
          uri: manipulateResult.uri,
          width: manipulateResult.width,
          height: manipulateResult.height,
          originalWidth: image.width,
          originalHeight: image.height,
          originalSizeKB,
          resultSizeKB,
          compressionRatio: originalSizeKB > 0 ? Math.round(((originalSizeKB - resultSizeKB) / originalSizeKB) * 100) : 0,
        },
        isProcessing: false,
      });
    } catch (e: any) {
      set({ error: e.message || 'Failed to resize', isProcessing: false });
    }
  },

  cropImage: async (originX, originY, cropWidth, cropHeight) => {
    const { image, canResize, incrementResizeCount } = get();
    if (!image) return;
    if (!canResize()) { set({ error: 'Daily free limit reached. Upgrade to Pro.' }); return; }

    set({ isProcessing: true, error: null });
    try {
      const originalSizeKB = await getFileSizeKB(image.uri);
      const manipulateResult = await ImageManipulator.manipulateAsync(
        image.uri,
        [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
      );
      const resultSizeKB = await getFileSizeKB(manipulateResult.uri);
      const success = incrementResizeCount();
      if (!success) {
        set({ error: 'Daily free limit reached. Upgrade to Pro.', isProcessing: false });
        return;
      }
      set({
        image: { uri: manipulateResult.uri, width: manipulateResult.width, height: manipulateResult.height },
        result: {
          uri: manipulateResult.uri,
          width: manipulateResult.width,
          height: manipulateResult.height,
          originalWidth: image.width,
          originalHeight: image.height,
          originalSizeKB,
          resultSizeKB,
          compressionRatio: originalSizeKB > 0 ? Math.round(((originalSizeKB - resultSizeKB) / originalSizeKB) * 100) : 0,
        },
        isProcessing: false,
      });
    } catch (e: any) {
      set({ error: e.message || 'Failed to crop', isProcessing: false });
    }
  },

  rotateImage: async (degrees) => {
    const { image, canResize, incrementResizeCount } = get();
    if (!image) return;
    if (!canResize()) { set({ error: 'Daily free limit reached. Upgrade to Pro.' }); return; }

    set({ isProcessing: true, error: null });
    try {
      const manipulateResult = await ImageManipulator.manipulateAsync(
        image.uri, [{ rotate: degrees }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
      );
      const success = incrementResizeCount();
      if (!success) {
        set({ error: 'Daily free limit reached. Upgrade to Pro.', isProcessing: false });
        return;
      }
      set({
        image: { uri: manipulateResult.uri, width: manipulateResult.width, height: manipulateResult.height },
        result: null,
        isProcessing: false,
      });
    } catch (e: any) {
      set({ error: e.message || 'Failed to rotate', isProcessing: false });
    }
  },

  flipImage: async (direction) => {
    const { image, canResize, incrementResizeCount } = get();
    if (!image) return;
    if (!canResize()) { set({ error: 'Daily free limit reached. Upgrade to Pro.' }); return; }

    set({ isProcessing: true, error: null });
    try {
      const manipulateResult = await ImageManipulator.manipulateAsync(
        image.uri,
        [{ flip: direction === 'horizontal' ? ImageManipulator.FlipType.Horizontal : ImageManipulator.FlipType.Vertical }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
      );
      const success = incrementResizeCount();
      if (!success) {
        set({ error: 'Daily free limit reached. Upgrade to Pro.', isProcessing: false });
        return;
      }
      set({
        image: { uri: manipulateResult.uri, width: manipulateResult.width, height: manipulateResult.height },
        result: null,
        isProcessing: false,
      });
    } catch (e: any) {
      set({ error: e.message || 'Failed to flip', isProcessing: false });
    }
  },

  resetImage: () => set({ image: null, result: null, error: null }),

  projects: [],
  recentExports: [],
  addProject: (project) => set((s) => ({ projects: [project, ...s.projects], recentExports: [{ ...project, id: project.id + '-export' }, ...s.recentExports].slice(0, 20) })),
  updateProject: (id, updates) => set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)) })),
  deleteProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
  clearTemporaryFiles: () => set({ projects: [], recentExports: [] }),

  customPresets: [],
  addCustomPreset: (preset) => set((s) => ({ customPresets: [...s.customPresets, preset] })),
  deleteCustomPreset: (id) => set((s) => ({ customPresets: s.customPresets.filter((p) => p.id !== id) })),

  brandKits: [],
  addBrandKit: (kit) => set((s) => ({ brandKits: [...s.brandKits, kit] })),

  analyticsOptOut: false,
  setAnalyticsOptOut: (optOut) => set({ analyticsOptOut: optOut }),
  keepMetadata: false,
  setKeepMetadata: (keep) => set({ keepMetadata: keep }),
}));

AsyncStorage.getItem(AI_CREDITS_STORAGE_KEY).then((raw) => {
  if (!raw) return;
  try {
    const balance = JSON.parse(raw) as AiCreditBalance;
    if (Number.isFinite(balance.total) && Number.isFinite(balance.used) && Number.isFinite(balance.remaining)) {
      useStore.setState({ aiCredits: balance });
    }
  } catch {
    // Ignore corrupted local credit data and keep the empty balance.
  }
}).catch(() => undefined);
