# Mobile release preparation

## Implemented

- Pointer and touch hold-to-steer controls; release, cancellation, lost pointer capture and focus loss stop steering.
- Self-play pilot in Menu for normal-speed progression testing, with manual takeover.
- Slower tiny-scale movement, visible cursor, touch-action suppression and automatic pause on hidden tabs during manual play. Self-play uses a background simulation timer, subject to browser suspension policies.
- Compact left HUD with supporting controls inside Menu, safe-area spacing, 44 px controls and a 390 × 844 phone preview in desktop browsers.
- Installable web manifest, original 192/512 px icons and production-only offline service worker.
- Offline build cache includes the game, fonts use system fallbacks, and no analytics or advertising SDK is included.
- Capacitor 8 configuration and generated Android/iOS native projects.
- CI checks, seeded mechanics tests and production bundling.

## Development

Use Node 22.12+ (or the bundled Node 24 runtime). Android Studio/Android SDK are required for an Android binary; macOS and Xcode are required for an iOS binary.

```sh
npm ci
npm test
npm run build
npm run preview
npm run mobile:sync
npm run mobile:open:android
npm run mobile:open:ios
```

The platform projects already exist. The `mobile:android` / `mobile:ios` add commands are only for recreating a missing platform directory. Follow [Capacitor's official workflow](https://capacitorjs.com/docs/getting-started) for signing and device builds.

The provisional app ID is `com.cityhole.game`. Confirm ownership and the final identifier before signing releases. Sync web changes before producing native binaries. The browser PWA requires HTTPS in deployment (localhost also works); an installed native wrapper carries its web bundle locally. Service-worker caches update on the next app load rather than replacing a running game.

## Remaining launch work

Native projects have been generated and synchronized, but no Android APK/AAB or iOS archive has been built in this Linux environment. Run real-device touch, safe-area, memory, battery and frame-rate checks, especially late-game views of the dense city. The software canvas fallback is slower than WebGL and can show painter-order artifacts.

Before store submission: finalize branding and native icons/splash screens, confirm app ID, create signing credentials, configure developer accounts, capture device screenshots, write descriptions and support/privacy pages, complete the stores' content-rating and data disclosures, and perform platform testing. No store submission, public hosting or monetization has been performed.

[Android guide](https://capacitorjs.com/docs/android) · [iOS guide](https://capacitorjs.com/docs/ios)

The game now streams visible blocks, removes completed records, and uses a 120-meter map with staged unlocks. Native desktop startup and packaging are also available; see the root README. These reduce workload but do not replace hardware frame-rate, memory and battery testing.
