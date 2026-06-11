import {Linking, PermissionsAndroid, Platform} from 'react-native';
import {showDialog} from '../context/DialogProvider';

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

  showDialog(title, message, [
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

  // Android 13+ uses the system Photo Picker via react-native-image-picker.
  // No READ_MEDIA_IMAGES permission is required or requested.
  if (Number(Platform.Version) >= 33) {
    return true;
  }

  const result = await requestAndroidPermission(
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
  );
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
