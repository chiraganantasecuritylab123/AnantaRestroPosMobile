# Firebase push notifications (POS mobile)

## Flow

1. User logs in → `FcmBootstrap` requests notification permission.
2. App reads FCM device token via `@react-native-firebase/messaging`.
3. Token is sent to your API: `POST /api/v1/fcm/save-token` with body:
   ```json
   { "token": "<fcm-token>", "device": "pos-mobile" }
   ```
   (Web admin uses `device: "admin-web"`.)
4. Backend stores token and can send Firebase messages to this device.
5. Foreground pushes show an alert and appear under **Dashboard → Notifications**.
6. Background/quit pushes are stored via `setBackgroundMessageHandler` and shown in the same list.

## Setup checklist

### Firebase Console

1. Project: `hrms-42c0f` (from `.env`).
2. Add Android app with package **`com.anantaa.swadeshpos`** if not already added.
3. Download `google-services.json` and replace `android/app/google-services.json` if package or keys differ.
4. Enable **Cloud Messaging**; upload server key / service account on your backend if required.

### Run app (debug)

```bash
npm start
npm run dev
```

Allow notifications when prompted. Token registers automatically after login.

### Verify token API

Watch Metro logs or use Flipper Network for:

`POST {API_BASE_URL}/fcm/save-token`

Expected response: `{ "success": true, "firebase": true }`

## Payload format (backend → device)

Include a `notification` block for system tray display:

```json
{
  "notification": {
    "title": "New order",
    "body": "Table 5 · ₹450"
  },
  "data": {
    "orderId": "123",
    "type": "order_created"
  }
}
```

Data-only messages are saved to the in-app list but may not show a system banner unless you add Notifee later.

## Files

- `android/app/google-services.json`
- `src/services/fcmApi.ts` — save token API
- `src/services/fcmService.ts` — permissions, token, handlers
- `src/components/FcmBootstrap.tsx` — wired in `MainTabsNavigator`
- `src/notifications/fcmBackground.ts` — imported from `index.js`
- `src/storage/notificationsStorage.ts` — persisted push history

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No token / build error | Rebuild after `npm install`; confirm `google-services.json` package is `com.anantaa.swadeshpos` |
| Permission denied | Android 13+: enable Notifications in app settings |
| API 401 | User must be logged in; token uses same auth headers as other APIs |
| Push not received | Confirm backend sends to correct FCM token and `device` filter includes `pos-mobile` |
