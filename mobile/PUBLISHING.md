# Mobile Publishing Guide

Publish the mobile app after the backend API is deployed and reachable over HTTPS.

## 1. Set the Production API URL

`mobile/src/mvc/models/api.ts` reads `expo.extra.apiBaseUrl` from `mobile/app.json`.

For production builds, change:

```json
"extra": {
  "apiBaseUrl": "http://127.0.0.1:5000"
}
```

to:

```json
"extra": {
  "apiBaseUrl": "https://your-render-api.onrender.com"
}
```

Use the API origin only. Do not add `/api` at the end.

## 2. Validate Before Building

From `mobile`:

```bash
npm run typecheck
npm run lint
```

From the repo root, strict deployment check should pass after replacing localhost URLs:

```bash
npm run deploy:check:strict
```

## 3. Build With Expo EAS

Install and log in:

```bash
npm install -g eas-cli
eas login
```

Initialize EAS once:

```bash
cd mobile
eas build:configure
```

Build Android:

```bash
eas build -p android --profile production
```

Build iOS later if you have an Apple Developer account:

```bash
eas build -p ios --profile production
```

## 4. Test Before Store Submission

- Sign in with a real test parent account.
- Open child activities.
- Open Daily Supported Videos.
- Submit daily check-in.
- Open chat, reports, downloads, and support.
- Confirm all requests go to the HTTPS API, not localhost.
