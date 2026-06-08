import DeviceInfo from 'react-native-device-info';

export function getAppVersion(): string {
  return normalizeVersion(DeviceInfo.getVersion());
}

export function getAppBuildNumber(): string {
  return DeviceInfo.getBuildNumber();
}

export function normalizeVersion(version: string): string {
  const parts = version
    .trim()
    .split('.')
    .map(part => {
      const n = parseInt(part.replace(/[^\d].*$/, ''), 10);
      return Number.isFinite(n) ? n : 0;
    });
  while (parts.length < 3) {
    parts.push(0);
  }
  return parts.slice(0, 3).join('.');
}

/** Returns positive if a > b, negative if a < b, zero if equal. */
export function compareSemver(a: string, b: string): number {
  const pa = normalizeVersion(a).split('.').map(Number);
  const pb = normalizeVersion(b).split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] > pb[i]) {
      return 1;
    }
    if (pa[i] < pb[i]) {
      return -1;
    }
  }
  return 0;
}
