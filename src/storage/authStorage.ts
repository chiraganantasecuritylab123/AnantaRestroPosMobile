import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = 'auth.token.payload.v1';

export type StoredAuthPayload = {
  token: string;
  user: unknown;
};

export async function loadAuthFromStorage(): Promise<StoredAuthPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredAuthPayload;
    if (!parsed?.token) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveAuthToStorage(payload: StoredAuthPayload) {
  try {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage write failures
  }
}

export async function clearAuthFromStorage() {
  try {
    await AsyncStorage.removeItem(AUTH_KEY);
  } catch {
    // ignore
  }
}

