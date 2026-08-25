export interface PlatformPreset {
  platform: string;
  placementName: string;
  width: number;
  height: number;
  ratio: string;
  category: 'social' | 'commerce' | 'generic';
  lastVerified: string;
  officialSourceUrl?: string;
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  { platform: 'Instagram', placementName: 'Square post', width: 1080, height: 1080, ratio: '1:1', category: 'social', lastVerified: '2026-07-27', officialSourceUrl: 'https://help.instagram.com' },
  { platform: 'Instagram', placementName: 'Portrait post', width: 1080, height: 1350, ratio: '4:5', category: 'social', lastVerified: '2026-07-27' },
  { platform: 'Instagram', placementName: '3:4 portrait', width: 1080, height: 1440, ratio: '3:4', category: 'social', lastVerified: '2026-07-27' },
  { platform: 'Instagram', placementName: 'Story or Reel', width: 1080, height: 1920, ratio: '9:16', category: 'social', lastVerified: '2026-07-27' },
  { platform: 'Instagram', placementName: 'Landscape post', width: 1080, height: 566, ratio: '1.91:1', category: 'social', lastVerified: '2026-07-27' },
  { platform: 'Facebook', placementName: 'Square feed', width: 1080, height: 1080, ratio: '1:1', category: 'social', lastVerified: '2026-07-27' },
  { platform: 'Facebook', placementName: 'Portrait feed', width: 1440, height: 1800, ratio: '4:5', category: 'social', lastVerified: '2026-07-27' },
  { platform: 'Facebook', placementName: 'Story', width: 1080, height: 1920, ratio: '9:16', category: 'social', lastVerified: '2026-07-27' },
  { platform: 'TikTok', placementName: 'Vertical', width: 1080, height: 1920, ratio: '9:16', category: 'social', lastVerified: '2026-07-27' },
  { platform: 'YouTube', placementName: 'High-resolution thumbnail', width: 3840, height: 2160, ratio: '16:9', category: 'social', lastVerified: '2026-07-27', officialSourceUrl: 'https://support.google.com/youtube' },
  { platform: 'YouTube', placementName: 'Lightweight thumbnail', width: 1280, height: 720, ratio: '16:9', category: 'social', lastVerified: '2026-07-27' },
  { platform: 'LinkedIn', placementName: 'Square post', width: 1080, height: 1080, ratio: '1:1', category: 'social', lastVerified: '2026-07-27' },
  { platform: 'LinkedIn', placementName: 'Portrait post', width: 1080, height: 1350, ratio: '4:5', category: 'social', lastVerified: '2026-07-27' },
  { platform: 'LinkedIn', placementName: 'Landscape post', width: 1200, height: 627, ratio: '1.91:1', category: 'social', lastVerified: '2026-07-27' },
  { platform: 'LinkedIn', placementName: 'Profile image', width: 400, height: 400, ratio: '1:1', category: 'social', lastVerified: '2026-07-27' },
  { platform: 'LinkedIn', placementName: 'Personal banner', width: 1584, height: 396, ratio: '4:1', category: 'social', lastVerified: '2026-07-27' },
  { platform: 'Pinterest', placementName: 'Standard Pin', width: 1000, height: 1500, ratio: '2:3', category: 'social', lastVerified: '2026-07-27', officialSourceUrl: 'https://help.pinterest.com' },
  { platform: 'X', placementName: 'Landscape post', width: 1600, height: 900, ratio: '16:9', category: 'social', lastVerified: '2026-07-27' },
  { platform: 'X', placementName: 'Square post', width: 1080, height: 1080, ratio: '1:1', category: 'social', lastVerified: '2026-07-27' },
  { platform: 'Discord', placementName: 'Server banner', width: 960, height: 540, ratio: '16:9', category: 'social', lastVerified: '2026-07-27' },
  { platform: 'Discord', placementName: 'Invite background', width: 1920, height: 1080, ratio: '16:9', category: 'social', lastVerified: '2026-07-27' },
  { platform: 'Generic', placementName: 'Square', width: 1080, height: 1080, ratio: '1:1', category: 'generic', lastVerified: '2026-07-27' },
  { platform: 'Generic', placementName: 'Portrait', width: 1080, height: 1350, ratio: '4:5', category: 'generic', lastVerified: '2026-07-27' },
  { platform: 'Generic', placementName: 'Vertical screen', width: 1080, height: 1920, ratio: '9:16', category: 'generic', lastVerified: '2026-07-27' },
  { platform: 'Generic', placementName: 'Landscape', width: 1920, height: 1080, ratio: '16:9', category: 'generic', lastVerified: '2026-07-27' },
  { platform: 'Generic', placementName: 'Custom', width: 0, height: 0, ratio: 'custom', category: 'generic', lastVerified: '2026-07-27' },
];

export const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1 Square' },
  { id: '4:5', label: '4:5 Portrait' },
  { id: '3:4', label: '3:4 Portrait' },
  { id: '2:3', label: '2:3 Portrait' },
  { id: '3:2', label: '3:2 Landscape' },
  { id: '9:16', label: '9:16 Vertical' },
  { id: '16:9', label: '16:9 Landscape' },
  { id: '1.91:1', label: '1.91:1 Horizontal' },
] as const;

export type RatioId = (typeof ASPECT_RATIOS)[number]['id'];
