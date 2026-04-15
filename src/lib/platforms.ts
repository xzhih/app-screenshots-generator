export type Platform = 'iphone' | 'ipad' | 'macos' | 'tvos' | 'visionos';

export type PlatformSpec = {
  id: Platform;
  label: string;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
};

export const PLATFORMS: Record<Platform, PlatformSpec> = {
  iphone: { id: 'iphone', label: 'iPhone', width: 1242, height: 2688, orientation: 'portrait' },
  ipad: { id: 'ipad', label: 'iPad', width: 2064, height: 2752, orientation: 'portrait' },
  macos: { id: 'macos', label: 'macOS', width: 2560, height: 1600, orientation: 'landscape' },
  tvos: { id: 'tvos', label: 'tvOS', width: 3840, height: 2160, orientation: 'landscape' },
  visionos: { id: 'visionos', label: 'visionOS', width: 3840, height: 2160, orientation: 'landscape' },
};

export const PLATFORM_LIST: PlatformSpec[] = Object.values(PLATFORMS);
