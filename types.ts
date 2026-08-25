export interface EditorOperation {
  type: 'resize' | 'crop' | 'rotate' | 'flip' | 'adjust';
  params: Record<string, unknown>;
  timestamp: string;
}

export interface ExportSettings {
  format: 'jpeg' | 'png' | 'webp';
  quality: number;
  width: number;
  height: number;
  stripMetadata: boolean;
  filename: string;
}

export interface ExportResult {
  uri: string;
  width: number;
  height: number;
  format: string;
  sizeKB: number;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface Project {
  id: string;
  sourceUri: string;
  sourceWidth: number;
  sourceHeight: number;
  createdAt: string;
  selectedPresets: Array<{ platform: string; placementName: string; width: number; height: number }>;
  operationStack: EditorOperation[];
  outputSettings: ExportSettings;
  exportResults: ExportResult[];
}

export interface CustomPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  format: 'jpeg' | 'png' | 'webp';
  quality: number;
  createdAt: string;
}

export interface BrandKit {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  logoUri?: string;
}

export interface AiCreditBalance {
  total: number;
  used: number;
  remaining: number;
}

export type { PlatformPreset } from '@/constants/presets';
