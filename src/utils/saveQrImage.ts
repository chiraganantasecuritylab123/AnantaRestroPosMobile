import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import {PermissionsAndroid, Platform} from 'react-native';
import RNFS from 'react-native-fs';

async function ensureAndroidSavePermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) >= 29) {
    return true;
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export async function saveQrImageFromDataUrl(dataUrl: string): Promise<void> {
  const permitted = await ensureAndroidSavePermission();
  if (!permitted) {
    throw new Error('permission_denied');
  }

  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const path = `${RNFS.CachesDirectoryPath}/qr-menu-${Date.now()}.png`;

  await RNFS.writeFile(path, base64, 'base64');
  try {
    await CameraRoll.saveAsset(`file://${path}`, {type: 'photo'});
  } finally {
    try {
      await RNFS.unlink(path);
    } catch {
      // ignore cache cleanup failures
    }
  }
}
