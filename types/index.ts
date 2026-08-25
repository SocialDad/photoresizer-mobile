import { PlatformPreset } from '@/constants/presets';

export interface EditorOperation {
  type: 'resize' | 'crop' | 'flip' | 'rotate' | 'adjust';
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
  selectedPresets: PlatformPreset[];
  operationStack: EditorOperation[];
  outputSettings: ExportSettings;
  exportResults: ExportResult[];
}

export interface CustomPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  ratio: string;
  createdAt: string;
}

export interface BrandKit {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  presetIds: string[];
}

export interface AiCreditBalance {
  total: number;
  used: number;
  remaining: number;
}

export type ResizeOnceDestination = PlatformPreset & { checked: boolean };
