import {Alert, Linking, Platform} from 'react-native';

export async function openExternalUrl(
  url: string | undefined | null,
): Promise<boolean> {
  const trimmed = url?.trim();
  if (!trimmed) {
    Alert.alert('Unavailable', 'This link is not configured yet.');
    return false;
  }

  try {
    const supported = await Linking.canOpenURL(trimmed);
    if (!supported) {
      Alert.alert(
        'Unable to open',
        'No app is available to handle this action.',
      );
      return false;
    }
    await Linking.openURL(trimmed);
    return true;
  } catch {
    Alert.alert('Unable to open', 'Something went wrong. Please try again.');
    return false;
  }
}

const ANDROID_PACKAGE = 'com.anantaa.swadeshpos';

export async function openAppStoreListing(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const marketUrl = `market://details?id=${ANDROID_PACKAGE}`;
    const webUrl = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
    const openedMarket = await openExternalUrl(marketUrl);
    if (!openedMarket) {
      return openExternalUrl(webUrl);
    }
    return true;
  }

  return openExternalUrl('https://apps.apple.com/search?term=Swadesh%20POS');
}
