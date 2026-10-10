# City Hole (`city-hole`)

A playable browser city-swallowing game with TypeScript, Vite, Three.js, and custom physics. Explore a 200×200 city with 100 compact blocks and 15,117 objects, moving cars, walking pedestrians, parks, street furniture, and skyscrapers.

## Run

Use Node.js 22.12+ (Capacitor requires Node 22 or newer).

```sh
cd /home/swarm/Projects/Videogames/hole-city-game
npm install
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

Open the localhost URL printed by Vite. No keys or paid assets are required.

## Controls

- Click and hold the primary mouse button, or touch and hold the city, to steer toward that location. Move the held pointer to change direction. Hovering and keyboard movement do not move the hole.
- Release to stop immediately. Cancellation, lost pointer capture and focus loss also stop input.
- Movement stays at 3.2 world units per second at every size; the cursor remains visible.
- Use **Menu → Phone preview** to fit a 390 × 844 game screen inside your browser; use **Desktop view** to return. Phones automatically use the responsive layout.
- Escape or Pause pauses/resumes. Hidden tabs and focus loss pause automatically.
- Restart creates a fresh run with the same seed.
- The compact HUD is entirely on the left: score, level/radius, growth progress, remaining objects, pause/restart, and an expandable map. The game UI contains no score-sequence explanation.

## Scoring and growth

Every swallowed object contributes its Fibonacci score and mass. There are no category quotas, target highlights, or muted locked objects. Only footprint size and proximity determine whether an object fits. Hole size changes at explicit score thresholds; the HUD shows the next threshold and growth progress.

| Object             | Points |
| ------------------ | -----: |
| Litter             |      1 |
| Fire hydrant       |      2 |
| Person             |      3 |
| Street sign        |      5 |
| Bench              |      8 |
| Park tree          |     13 |
| Car                |     21 |
| Van                |     34 |
| Kiosk              |     55 |
| House              |     89 |
| Shop               |    144 |
| Apartment building |    233 |
| Large building     |    377 |
| Skyscraper         |    610 |

The first 14 levels unlock increasing footprint sizes. Thresholds are 0, 15, 45, 100, 200, 400, 800, 1,400, 2,500, 4,000, 6,000, 8,500, 12,000, and 16,000 points.

After skyscrapers, growth has no level or radius cap. For extra level index `n` starting at zero, the next incremental points requirement is:

```text
ceil(10,000 × (1 + log2(n + 2)))
```

Requirements are cumulative: the first extra level costs 20,000 additional points; subsequent incremental costs increase logarithmically. Every extra level adds 0.7 world units to the radius. The camera smoothly changes zoom with hole radius, starting with a close view and widening as the hole grows. The run ends when every object has completed its fall; finite map content naturally limits the points available in one run.

## City and rendering

The map remains 200×200 units, but block spacing is now 20 units instead of 40. Buildings sit in interior lots with varied colors, orientation, gabled/flat/stepped roofs, contrasting window frames, darker glass, entrances, storefronts, and rooftop details. Trees occur only inside designated parks. Cars and vans drive in right-hand lanes or park beside the curb. Intersection signals alternate green, yellow, and all-red clearance phases; cars stop before crossings, accelerate smoothly, maintain queue spacing, and clear intersections they have already entered. Pedestrians remain on sidewalks, turn around rather than wrap at block ends, and maintain separation from other walkers. Arms swing about shoulder pivots and legs about hip pivots. Signs, hydrants, benches, and litter provide smaller targets. The four small-prop tiers contain eight designs each; the other ten tiers contain four each (72 designs total), while retaining the same footprint threshold and score within the tier. The city includes cans/bottles/bags, hydrants/cones/mailboxes, varied people/signs/park furniture/trees, sedans/hatchbacks/taxis, delivery vans/minibuses/pickups, four kiosk/store/house types, and several larger building and skyscraper silhouettes.

Roads, sidewalks, crossings, and park paths are baked into one city texture rendered on a single ground plane. This avoids intersecting thin road meshes and unstable depth ordering.

GPU browsers use Three.js WebGLRenderer. Browsers without WebGL use a raster Canvas2D renderer with projected Three.js geometry, depth sorting, backface removal, visibility culling, and ground-plane polygon clipping. The former SVG fallback has been removed. Shared primitive geometry and materials keep allocation low; the HUD refreshes at 10 Hz.

Objects remain full scale while pulled into the hole, then visibly descend. Geometry below ground is clipped progressively, and objects are removed only after their entire fall finishes. Rewards apply exactly once at completion. This is a scripted fall rather than a rigid-body simulation.

## Validation

26 tests cover Fibonacci ordering, swallow boundaries, exact-once rewards, mixed-object progression, uncapped logarithmic growth, deterministic city generation, multiple designs per tier, road/park placement, signal phases, stop lines and queue spacing, pedestrian persistence and separation, anchored walking limbs, vehicle windows, building features, full-city completion, fixed-speed hold-to-steer motion and sightline transparency, restart/victory, highlight removal, and progressive clipping. TypeScript checks and the production build pass.

Browser smoke checks cover the production city, stable roads, mouse swallowing, moving cars and pedestrians, compact left HUD, pause/resume, expandable map, and visible cursor. The final phone-preview raster smoke test sampled 37–38 FPS after static-geometry caching; comprehensive real-device benchmarking has not been performed. WebGL visual validation remains unperformed because the available verification browser disables WebGL.

## Reference and limitations

The design comparison uses [Hole.io's official mobile listing](https://play.google.com/store/apps/details?id=io.voodoo.holeio), particularly its small-object-to-skyscraper progression, glide controls, and vivid city presentation. City Hole uses original procedural geometry and adds the requested Fibonacci scores and logarithmic post-skyscraper growth.

Traffic obeys the implemented lane, signal, stop-line, clearance, and queue-spacing rules. Vehicles still take straight routes and wrap at city edges; intersection turning and lane changes are future work. Pedestrians walk persistent sidewalk routes rather than crossing roads. The raster renderer uses object-level painter ordering, so unusual overlap between tall objects can still show occlusion artifacts. No multiplayer, sound, saved leaderboard, or physical building destruction yet. Typography uses local system fonts.

## Dense city and visibility

Each block contains three times its previous object count and a complete 14-tier size ladder, including a skyscraper. The map remains 200 × 200 with 100 blocks. Mixed-use lots contain compact buildings, pocket parks, sidewalk furniture and pedestrians; cars and vans remain on streets or curb parking. Tall buildings preserve their capture tier while using compact lot widths so the dense layout fits.

Buildings obstructing the camera-to-hole sightline become 50% transparent, then return to full opacity when clear. Shared materials are preserved. The software renderer composites a complete object before fading it.

See [the city catalog](docs/CITY_OBJECTS.md) for implemented designs and further common city objects, and [mobile release preparation](docs/MOBILE_RELEASE.md) for native startup commands and remaining launch work.

## GitHub

The local repository is initialized on `main`, with package name `city-hole` and a GitHub Actions validation workflow. Repository creation requires a signed-in GitHub browser session because the connected GitHub tools expose repository content operations but not repository creation. No GitHub remote is claimed until it is created and verified.

Small props (litter, compact fixtures, signs and sidewalk furniture) are independently tripled relative to the previous dense city, with eight designs in each tier. Placement rejects building footprints, existing props and pedestrian corridors. The mobile HUD shows score, level, growth, pause and a compact menu; supporting controls are tucked into that menu. Only houses, shops, buildings, large buildings and skyscrapers fade on obstruction. Vehicles, people, trees, kiosks and street props stay opaque.
