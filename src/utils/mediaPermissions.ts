import {Alert, Linking, PermissionsAndroid, Platform} from 'react-native';

export type MediaPermissionKind = 'gallery' | 'camera';

export function openAppSettings(): void {
  void Linking.openSettings();
}

export function promptPermissionSettings(kind: MediaPermissionKind): void {
  const title =
    kind === 'gallery' ? 'Photo library permission' : 'Camera permission';
  const message =
    kind === 'gallery'
      ? 'Photo access is required to pick menu images. Open Settings and allow Photos access for this app.'
      : 'Camera access is required to take menu photos. Open Settings and allow Camera access for this app.';

  Alert.alert(title, message, [
    {text: 'Cancel', style: 'cancel'},
    {text: 'Open Settings', onPress: openAppSettings},
  ]);
}

type AndroidPermissionResult = 'granted' | 'denied' | 'blocked';

async function requestAndroidPermission(
  permission: (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS],
): Promise<AndroidPermissionResult> {
  const alreadyGranted = await PermissionsAndroid.check(permission);
  if (alreadyGranted) {
    return 'granted';
  }

  const result = await PermissionsAndroid.request(permission);
  if (result === PermissionsAndroid.RESULTS.GRANTED) {
    return 'granted';
  }
  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    return 'blocked';
  }
  return 'denied';
}

export async function ensureGalleryPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const permission =
    Number(Platform.Version) >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

  const result = await requestAndroidPermission(permission);
  if (result === 'granted') {
    return true;
  }

  promptPermissionSettings('gallery');
  return false;
}

export async function ensureCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const result = await requestAndroidPermission(
    PermissionsAndroid.PERMISSIONS.CAMERA,
  );
  if (result === 'granted') {
    return true;
  }

  promptPermissionSettings('camera');
  return false;
}

export function handlePickerPermissionError(
  errorCode: string | undefined,
  kind: MediaPermissionKind,
): boolean {
  if (errorCode === 'permission') {
    promptPermissionSettings(kind);
    return true;
  }
  return false;
}
