declare module '*.mp3' {
  const src: number;
  export default src;
}

declare module '@env' {
  export const API_BASE_URL: string;
  export const QR_MENU_BASE_URL: string;
  export const VITE_FIREBASE_API_KEY: string;
  export const VITE_FIREBASE_AUTH_DOMAIN: string;
  export const VITE_FIREBASE_PROJECT_ID: string;
  export const VITE_FIREBASE_STORAGE_BUCKET: string;
  export const VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  export const VITE_FIREBASE_APP_ID: string;
  export const VITE_FIREBASE_VAPID_KEY: string;
}
