# Dead Zone 0.6.1 — Ashwood graphics pass

Open `next.html?v=061` in iPhone Safari in landscape orientation.

Changes:

- Scanned, locally hosted road, ground, wall, concrete, and bark textures; normal maps on four surfaces.
- Cutout leaf clusters, branch geometry, roadside weeds, and an atmospheric sky.
- Pitched roofs, storefront signs, boarded windows, wall staining, vehicle trim, street lamps, sagging utility cables, and abandoned possessions.
- Rebuilt first-person rifle, gloved hands, and a centered ADS transition.
- Rounded character geometry and existing joint animations.
- Static scenery and stationary limb pieces batched by material; surplus loot lights removed. Battery Saver hides optional detail and disables shadows.
- Three.js pinned and hosted with the game, removing the external runtime CDN dependency.

The working touch direction, configurable HUD, contextual USE, inventory, locker, safehouse, and save key are retained. Existing collection/door/vehicle/container IDs remain in the same order.

Validation: real WebGL browser execution at 844 × 390, with an iPhone user agent and touch enabled. All ten surface images loaded. Control direction, contextual USE, doors, storage, ADS, shooting, first/third-person, all three graphics presets, day/night/flashlight, and save reload passed. No JavaScript or shader errors occurred. This is desktop browser testing with software rendering, not physical iPhone performance measurement.

The browser test script is retained locally and is not included in this release.

This remains an early WebGL game with procedural scenery and character/weapon meshes. It does not yet match COD Mobile visual fidelity. The next art pass needs authored, optimized character, vehicle, and weapon models plus richer building geometry. Screenshots in screenshots/0.6.1 are captures from this game, not visual references.
