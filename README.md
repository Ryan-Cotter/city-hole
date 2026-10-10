# City Hole

An original low-poly city swallowing game built with TypeScript, Vite, Three.js and custom physics. The seeded 120 × 120 map has 36 blocks across residential, commercial, industrial, downtown and park districts. Start with bottlecaps, work through 27 size tiers, and eventually swallow skyscrapers.

## Startup

Use Node.js 22.12 or newer.

```sh
cd /home/swarm/Projects/Videogames/hole-city-game
npm ci
npm run dev
```

Vite prints the local game URL. For production verification:

```sh
npm test
npm run build
npm run preview
```

## Controls

Hold the primary mouse button or a touch to steer toward the pointer. Release to stop. Hovering and keyboard movement do not steer. Speed stays at 3.2 world units per second. Escape/Pause pauses; focus loss also pauses. Restart resets the seeded city. Menu contains self play, a section minimap, and a 390 × 844 phone preview.

## Progression and world

The starting hole has radius 0.04 and is confined to a tiny 6-meter plaza. Four concentric sections unlock at levels 8, 13 and 19, expanding to 40, 80 and 120 meters across. The HUD identifies the section, and the minimap zooms to its boundaries. Item-level detail gives way to building and district detail as the hole grows.

Rewards follow ascending Fibonacci values starting 1, 2. Every item contributes independently, including food on tables. Original log₂ pacing has been restored: each initial step costs `ceil(8 × log2(level))` additional points. Stage radii fit the corresponding footprint with a 0.08 margin. After skyscrapers, each step adds 0.70 radius without a cap; logarithmic costs retain the original requirement-to-largest-object-reward ratio, scaled to the expanded size ladder. All balance values live in `src/game/constants.ts`.

Normal capture pulls an object toward the hole and animates it below the ground at full scale. Score and mass are awarded once after completion. Objects five or more tiers below current capacity keep their original static models. Once their entire footprint is inside the circle, they disappear and award their rewards immediately. They remain visible until then. Completed records and models leave the active city, motion lists and spatial index. Victory waits for all objects to complete.

Small piles cluster around medium fixtures and dumpsters. Each block has a small crowd, outdoor restaurant tables with separately scored food, patio covers and animals. Manhole covers and dividers sit on streets. People flee when swallowable; animals run 25% faster near the hole; cars swerve within their assigned lanes. Vehicles follow signals and queue spacing. Building façades use brick, concrete, stone and muted glass colors, with contrasting windows and roofs. Trees occupy parks; vehicles stay on streets or curb parking.

The hole can overhang an edge by 30% of its radius to reach corner objects. Its outline smoothly compresses against section/map edges instead of staying rigidly circular.

## Performance

Block and object frustum tests load models only where needed. Unloaded blocks retain lightweight simulation records. Captures query spatial chunks; completed objects use constant-time swap deletion. Only relevant visible or nearby actors move. Older object designs stay recognizable but stop animating. At large sizes, distant blocks become one merged building mesh; approaching or swallowing them restores individual physics. HUD and minimap updates are throttled.

Self play uses normal movement and rewards. It groups eligible objects, follows clear paths directly, and runs bounded A* around oversized buildings when needed. Valid routes persist across frames rather than being rebuilt on a timer. Pointer input takes over immediately. Planning is bounded and can retry an inaccessible group.

WebGL is preferred. The Canvas fallback supports shaded geometry, progressive ground clipping and hole deformation, but remains slower and can show painter-order artifacts. Real-device GPU performance still needs benchmarking.

## Native desktop

```sh
npm run desktop:start
npm run desktop:package
```

The Electron desktop app uses local production assets, hardware acceleration by default, a sandboxed renderer, and no Node access in game code. Packaging emits an unpacked native app in `desktop-release`; on Linux run `desktop-release/linux-unpacked/city-hole`. Build for each target operating system on its appropriate host. The Linux package builds and Electron startup was checked; this environment cannot create a hardware OpenGL context, so native GPU smoothness is not verified. Signed installers, native app icons, macOS notarization and Windows signing remain release work.

## Mobile / PWA

```sh
npm run mobile:sync
npm run mobile:open:android
npm run mobile:open:ios
```

Android and iOS Capacitor projects are generated and synced. Android SDK/Android Studio are needed for APK/AAB builds; macOS/Xcode are needed for an iOS archive. The provisional application ID is `com.cityhole.game`. The browser production build includes a manifest, icons and offline cache; deployment requires HTTPS. See `docs/MOBILE_RELEASE.md` for release preparation.

## Validation and repository

Core tests cover exact-once rewards, deletion/index consistency, obsolete-item containment, size eligibility, full-city completion, fixed-speed hold steering, traffic, persistent people, anchored limbs, independent tabletop items, fear speed, section unlocks, corner access, deformed edges and A* routes. TypeScript and production build checks are part of `npm run build`. Browser checks cover self play, shrinking active counts, section minimap and visible small items.

The local Git project is named `city-hole`. GitHub publication remains pending authenticated repository creation; no remote repository or public deployment has been claimed. See `docs/CITY_OBJECTS.md` for the object catalog and `docs/GAME_DESIGN.md` for implementation details.
