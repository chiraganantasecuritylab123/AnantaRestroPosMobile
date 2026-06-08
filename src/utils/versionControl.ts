import {Platform} from 'react-native';
import {
  compareSemver,
  getAppVersion,
  normalizeVersion,
} from '../constants/appVersion';
import type {AppVersionControlConfig} from '../services/configApi';

export type VersionControlStatus = {
  currentVersion: string;
  latestVersion: string;
  minSupportedVersion: string;
  forceUpdate: boolean;
  optionalUpdate: boolean;
};

export function evaluateVersionControl(
  config?: AppVersionControlConfig | null,
): VersionControlStatus {
  const currentVersion = normalizeVersion(getAppVersion());
  const isIos = Platform.OS === 'ios';
  const latestVersion = normalizeVersion(
    (isIos ? config?.ios_version : config?.android_version) ?? currentVersion,
  );
  const minSupportedVersion = normalizeVersion(
    (isIos
      ? config?.min_supported_ios_version
      : config?.min_supported_android_version) ?? '0.0.0',
  );

  const belowMin = compareSemver(currentVersion, minSupportedVersion) < 0;
  const updateAvailable = compareSemver(currentVersion, latestVersion) < 0;
  const platformForce = isIos
    ? Boolean(config?.ios_force_update)
    : Boolean(config?.android_force_update);
  const globalForce = Boolean(config?.force_update);

  const forceUpdate =
    belowMin || (updateAvailable && (platformForce || globalForce));
  const optionalUpdate = updateAvailable && !forceUpdate;

  return {
    currentVersion,
    latestVersion,
    minSupportedVersion,
    forceUpdate,
    optionalUpdate,
  };
}
