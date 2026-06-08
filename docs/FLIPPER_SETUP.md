# Flipper network debugging (development only)

This project uses **Flipper 0.273** with the **Network** plugin for API inspection.  
Production/release builds do **not** include Flipper (noop stubs + `__DEV__` guards).

> **Note:** React Native 0.84 removed built-in Flipper from the template. This repo adds a **manual** debug-only integration compatible with RN 0.84.1.

## What is captured

| Source | How |
|--------|-----|
| RTK Query / `fetchBaseQuery` | RN `NetworkingModule` OkHttp (Android) + Flipper Network plugin |
| `fetch()` in `menuApi` image upload | Same + dev fetch wrapper |
| Axios (if used) | Dev-only axios interceptors |

Logged fields: URL, method, headers, query params, request body, status, response body, errors, duration.

## 1. Install Flipper Desktop

1. Download **Flipper** desktop app (v0.273.x recommended): https://fbflipper.com/
2. Install and open Flipper before running the app.

## 2. JavaScript dependencies

Already in `package.json` (dev):

```bash
npm install --legacy-peer-deps
```

Packages: `axios` (dev interceptors only). Native Flipper is wired in Android/iOS debug source sets (not `react-native-flipper`, which is incompatible with Gradle 9 in this project).

## 3. Android (debug build)

```bash
npm run android
# or
npx react-native run-android
```

- Flipper starts from `ReactNativeFlipper.kt` (debug source set only).
- `NetworkingModule.setCustomClientBuilder` adds `FlipperOkhttpInterceptor` so the **Network** tab shows full bodies (not “Preview unavailable” from DevTools).

**Release builds** use `flipper-noop` and the release `ReactNativeFlipper` stub — no Flipper code in APK.

## 4. iOS (debug build, macOS)

```bash
cd ios
pod install
cd ..
npx react-native run-ios
```

Flipper pods are **Debug configuration only** in `Podfile`.  
`FlipperManager.mm` initializes layout + network plugins.

## 5. Using Flipper Network

1. Run the app in **debug** on a device/emulator.
2. Open **Flipper Desktop** — your app should appear in the left sidebar.
3. Open the **Network** plugin.
4. Trigger API calls in the app (login, POS, orders, etc.).
5. Select a request to inspect headers, payload, and response body.

### JS supplement (Metro)

Dev fetch/axios wrappers log the same payloads to **Metro console** (grouped, full JSON).  
Use the Flipper **Network** tab for the primary inspector (native layer).

## 6. React Native DevTools vs Flipper

RN 0.83+ **DevTools Network** may show “Preview unavailable” for some bodies.  
Flipper’s **Network** plugin (native OkHttp hook) is the supported way to inspect full payloads in this project.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| App crashes on launch (`NativeLoader has not been initialized`) | `MainApplication` must call `SoLoader.init(this, OpenSourceMergedSoMapping)` **before** `ReactNativeFlipper.initializeFlipper` |
| App not in Flipper | Debug build only; restart app + Flipper; USB debugging on for physical Android |
| “native module Flipper unavailable” | Rebuild debug app after `npm install`; Android: clean rebuild |
| No network events | Confirm debug variant; Android: check `ReactNativeFlipper` runs before `loadReactNative` |
| iOS build fails on Flipper | `cd ios && pod install`; Flipper requires Debug scheme |
| npm peer dependency errors | Use `npm install --legacy-peer-deps` |

## Changed files (reference)

- `package.json` — devDependencies
- `index.js` — `__DEV__` setup
- `src/dev/setupFlipper.ts`, `src/dev/flipper/*`
- `android/gradle.properties`, `android/build.gradle`, `android/app/build.gradle`
- `android/app/src/debug/.../ReactNativeFlipper.kt`
- `android/app/src/release/.../ReactNativeFlipper.kt`
- `android/app/src/main/.../MainApplication.kt`
- `ios/Podfile`, `ios/AnantaRestroPosMobile/FlipperManager.*`, `AppDelegate.swift`, bridging header, `project.pbxproj`
