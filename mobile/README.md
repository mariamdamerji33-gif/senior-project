# Mobile App (Proposal-aligned start)

This folder is initialized with **Expo + React Native + TypeScript** and wired to your existing backend API.

## Stack used

- React Native (Expo)
- TypeScript
- React Navigation
- AsyncStorage (session persistence)
- Axios (API client)

## Role flow

- **`parent`** — full family home (progress, chat, check-ins, child activities, notifications). This build is optimized for parents.
- **Other roles** — sign-in is limited to parent accounts for this app; staff continue to use the web dashboard (`frontend/`).

## Run

```bash
npm install
npm run start
```

## API base URL

`app.json` (`expo.extra.apiBaseUrl`) is blank by default so Expo LAN can infer your laptop IP during development. Set it only when you need a fixed target:

- Android emulator default: `http://10.0.2.2:5000`
- iOS simulator: `http://localhost:5000`
- Physical device: use your machine LAN IP, e.g. `http://192.168.1.10:5000`

The HTTP client lives in **`src/mvc/models/api.ts`**. It reads `expo.extra.apiBaseUrl` from `app.json` when set; otherwise it infers the host from Expo in development and falls back to `http://10.0.2.2:5000` for Android emulator. For USB debugging, set `apiBaseUrl` to `http://127.0.0.1:5000` and use `adb reverse` (see below).

## Stable LAN runbook (Windows + Expo Go)

1. Start backend first:

```bash
npm run start --prefix backend
```

2. Confirm backend health from laptop:

```bash
curl http://localhost:5000/api/health
curl http://<your-laptop-ip>:5000/api/health
```

3. Start Expo in LAN mode:

```bash
npx expo start -c --host lan --port 8081
```

4. Before scanning QR, confirm Expo output shows:
   - `Metro waiting on exp://<your-laptop-ip>:8081`
   - never `127.0.0.1`

5. On phone browser, open:
   - `http://<your-laptop-ip>:5000/api/health`

6. Open Expo Go, force-close old sessions, then scan the newest QR code.

## USB fallback runbook (when Wi-Fi is unstable)

1. Enable USB debugging on Android and connect phone with USB.
2. Verify device:

```bash
adb devices
```

3. Reverse ports:

```bash
adb reverse tcp:5000 tcp:5000
adb reverse tcp:8081 tcp:8081
```

4. Set `app.json`:
   - `"apiBaseUrl": "http://127.0.0.1:5000"`

5. Start services:

```bash
npm run start --prefix backend
npx expo start -c --host localhost --port 8081
```

6. Open Expo Go and scan QR.

## End-to-end verification checklist

- Phone browser opens `http://<active-laptop-ip>:5000/api/health`
- Expo shows `exp://<active-laptop-ip>:8081`
- In-app Test Connection shows the same base URL
- Login succeeds with seeded parent user (`family@asp.com` / `AspFamily123` / `parent`)

## Validation before demo

From the project root:

```bash
npm run typecheck --prefix mobile
npm run lint --prefix mobile
```

Use `npm run deploy:check` from the root to confirm the mobile `app.json` API setting is visible to the deployment checker. A blank `expo.extra.apiBaseUrl` is fine for Expo LAN demos; set it to a fixed origin for emulator, USB, or production mobile builds.

## Auth screens

- **Login** — default route when signed out.
- **Register** — tap **Create account** on login to request a parent account (API `registerRequest`). Use **Back to sign in** to return.

## Next enhancements (optional)

1. Deeper offline queues for chat / check-ins where the API already supports retries
2. Push notifications (Expo) wired to parent notification endpoints
3. iOS-specific QA and store build (`eas build`) when you are ready to ship
