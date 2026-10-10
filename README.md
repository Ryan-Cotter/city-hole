# City Hole

An original low-poly city swallowing game built with TypeScript, Vite, Three.js and custom physics. The seeded 120 × 120 map has 36 blocks across residential, commercial, industrial, downtown and park districts. Start with magnified bacteria, spores, dust, pollen and sand before bugs and street objects; grow through buildings, city blocks and landscapes.

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

Hold the primary mouse button or a touch to steer toward the pointer. Release to stop. Hovering and keyboard movement do not steer. Tiny holes start at about 0.00675 world units per second, scaling with radius up to the usual 3.2. Escape/Pause pauses. Focus loss pauses manual play; self-play continues in the background. Restart resets the seeded city. Menu contains self play, a section minimap, and a 390 × 844 phone preview.

## Progression and world

The starting hole has radius 0.0015 in a magnified micro patch. The camera, movement speed and accessible area scale up through five microscopic tiers into the 6-meter starter yard, then a 20-meter block-sized area and the full 120-meter city. Barriers are collision-only: they cannot be swallowed, award no points, and do not count toward completion. Glowing area borders deactivate automatically at the mouse and street-sign size thresholds. The minimap follows the unlocked area.

Rewards follow ascending Fibonacci values starting 1, 2. Every item contributes independently, including food on tables. Growth uses a log2/categorical base cost multiplied by measured per-size pacing weights. Earned progress fills at a bounded rate (4.5 seconds per size), so large harvests cannot skip several sizes; score is awarded immediately. Beyond the largest geographic tier, growth remains uncapped with logarithmically increasing costs. All balance values live in `src/game/constants.ts`.

Normal capture pulls an object toward the hole and animates it below the ground at full scale. Score and mass are awarded once after completion. Objects five or more tiers below current capacity keep their original models and nearby actors keep moving. Once their entire footprint is inside the circle, they disappear and award their rewards immediately. They remain visible until then. Completed records and models leave the active city, motion lists and spatial index. Victory waits for all objects to complete.

The starter plaza uses separated mixed items across its full area, with a loose bottlecap trail near the hole. Toys include tops, dominoes, trains and stacking rings; food includes doughnuts, ice cream, hot dogs and pizza. Dice have face pips, coins raised rims, caps printed tops, and cats have coats and collars. Cats use a 0.17 footprint radius and 0.18 height; dogs use 0.23 and 0.30, compared with people at 0.32 and 1.25.

Small piles cluster around medium fixtures and dumpsters. Each block has a small crowd, outdoor restaurant tables with separately scored food, patio covers and animals. Manhole covers and dividers sit on streets. People and animals flee directly away at twice their walking speed; cars swerve within their assigned lanes. Vehicles follow signals, queue spacing and yield to people/animals on crosswalk routes. Building façades use brick, concrete, stone and muted glass colors, with contrasting windows and roofs. Trees occupy parks; vehicles stay on streets or curb parking.

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

Core tests cover exact-once rewards, deletion/index consistency, obsolete-item containment, size eligibility, full-city completion, size-scaled hold steering, traffic, persistent people, anchored limbs, independent tabletop items, fear speed, section unlocks, corner access, deformed edges and A* routes. TypeScript and production build checks are part of `npm run build`. Browser checks cover self play, shrinking active counts, section minimap and visible small items.

The project repository is [Ryan-Cotter/city-hole](https://github.com/Ryan-Cotter/city-hole). See `docs/CITY_OBJECTS.md` for the object catalog and `docs/GAME_DESIGN.md` for implementation details.

Self-play keeps routes on the ground and within the unlocked section, retries another target after 0.75 seconds without movement or a swallow, and limits fruitless chases. It approaches reachable points inside swallowing range, uses scale-aware waypoint tolerances, skips targets outside unlocked areas and avoids chasing faster actors. Unreachable clusters are skipped in bounded batches.

Oversized objects have solid footprints that the hole slides around; self-play plans around those footprints. People and animals wander without needing a threat, nearby traffic stays active at every size tier, and trees sway gently. The rim cycles red, orange, yellow, green, blue, indigo and violet each level, repeating every seven levels in both renderers.

Hidden self-play uses a simulation timer without rendering; native desktop background throttling is disabled. Browsers may still throttle or suspend hidden tabs, especially on mobile or while the device sleeps. Manual pause always stops simulation.

## Campaign, pickups and scale progression

Cities progress through Medieval, Industrial, Modern and Futuristic eras. Their ground palettes, building silhouettes and vehicles change. Subsequent cities remain futuristic with new seeds. Clearing the world shows **Next city**, which starts the next era/seed; Restart repeats the current city.

The starter yard has food, game-piece and garden pockets containing crumbs, rice, peas, berries, cookie pieces, buttons, dice, coins and seeds, plus ants, beetles and ladybugs. This follows the gradual smaller-to-larger eating loop described in [Dingo Games’ Tasty Planet manual](https://www.dingogames.com/tastyplanet/instructions/gameplay.htm), with original low-poly assets and scene layouts.

Boosts are edible rotating pickups, not buttons. Yellow lightning gives 10 seconds of 1.8× speed; three green arrows instantly advance one size level while preserving the percentage toward the following level. Size boosts adjust growth credit without inventing score. Pickup timers use game time and pause with the game. Size pickups five or more edible tiers out of date award their item points without triggering a late-game level skip.

At 80% of the original city consumed, four seeded neighboring city tiles expand the map to 360 meters across. New content contains buildings and whole-block objects only. Large holes can swallow a block and its remaining contents together, awarding every object once. After the expanded city is cleared, the camera opens onto a 400-meter landscape of river sections, grassland, mountains and whole cities. Clearing this advances to a 600-meter world map with edible countries. Geographic transitions use local growth scales while preserving cumulative score. Only clearing this final map completes the era.

The landscape is a stylized procedural representation, not real-world geography. Era theming changes architecture, vehicles and terrain. Medieval street props use wooden signs, crates, barrels, market stalls, buttons, wooden toys and period food instead of modern street furniture. Automated tests cover all scale transitions, self-play through the early city stages, and completion of the country/world maps; browser checks verify the opening, pickup presentation and basic play. Native/mobile store signing remains a release step.

Each required growth level has at least 150% of its full next-level points requirement available as stationary, edible, unlocked material. On entry to a level/section and at five-second checks, missing points are supplied by suitably sized clusters; expanded maps receive buildings or landscape objects, never tiny filler. Reserves stop when all sizes on the current map are edible so completion remains possible. Ants, beetles and ladybugs continuously scurry in two dimensions around their food/garden pockets and move twice as fast near the hole. Cats use spatial separation and smooth turning to reduce overlap and flickering.

Whole blocks have roofs, rooftop equipment, window bands, sidewalks and planted edges. A block shell pays 15% of a skyscraper reward, and remaining contents swallowed with the block pay 10% of their individual rewards (rounded per object). Items eaten individually retain full rewards. This deliberate aggregate discount slows bulk growth while preserving exact-once completion.

Open `/models.html` for the model review gallery. Public CC0 examples used for vehicle proportions and clean color separation: [Kenney Car Kit](https://kenney.nl/assets/car-kit) and [Quaternius Cars](https://quaternius.com/packs/cars.html). Models remain original procedural geometry; no downloaded model files are bundled. Vehicles use plain paint/glass materials. The software renderer keeps box faces together to avoid diagonal sorting artifacts.

Micro sizes are stylized for readability, not a scientifically accurate scale model. Crosswalk walkers patrol curb to curb; traffic yielding is local and simplified rather than a full road-network simulation.

### Precision steering and block scale

Hold the mouse button or touch to steer from the hole's current center toward the cursor. Cursor distance does not change speed; releasing stops manual movement. Desktop framing is 20% wider than the previous view, with phone framing unchanged. The software renderer now places the hole and its collision footprint on the same ground plane, including microscopic stages.

Whole-block items activate when the hole's diameter reaches eight block widths (radius 80 for a 20-unit block). Until then, individual buildings remain visible and edible, and the 150% food reserve continues supplying building points. At that transition, obsolete non-building props five or more tiers below the current edible tier are deleted without score, mass, boost effects, or swallowed credit. Buildings remain block contents, using the existing reduced block rewards. Barriers retain their collision-only behavior.

### Late-city performance and pacing

Block point discounts no longer discount the growth requirements. Growth blends continuously from skyscraper size through block and river size, avoiding the abrupt late-city radius jumps around 35 million points; early discrete sizes and size pickups remain. Non-edible street barriers stop blocking movement when the hole is eight times their radius, so their collision margins cannot seal the city. Section gates still use their normal unlock rules.

Crowd work is bounded: up to 128 nearby actors update at 20 Hz, with 48 distant actors taking coarse steps each quarter-second, prioritizing actors that have waited longest. Distant people remain persistent but move less frequently. Cached software-renderer geometry is reused until an actor's pose changes. Regression tests cover late-city autoplay, growth thresholds, a 1,000-person crowd, and degenerate patrol routes. These are workload checks, not a native-device FPS benchmark.

## Measured pacing

The tuned autoplay runs finish in **4:08–4:17** across all four city themes, from microbes through World cleared. The original measured run took 8:34 and included sub-second levels and a 92-second cleanup level. Most full size intervals now last roughly 4.5–8 seconds, with the longest measured interval under 10 seconds. Map transitions and victory can end an interval early. Manual play can take longer than autoplay.

See [the timing report](docs/PACING_REPORT.html), [CSV](docs/pacing-trials.csv), and [raw trials](docs/pacing-trials.json). Run `npm run test:pacing` with Node 22.12+ to replay four complete 60 Hz trials and check the 180–300-second target. The harness calls the real game update loop with drawing disabled; it does not teleport the hole or award test points. Growth-rate tuning is in `src/game/pacing.ts`; per-size weights are in `src/game/constants.ts`.
