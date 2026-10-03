# Nexus console motion preview

This is an interactive design study for the launcher opening and game launch transitions. Startup renders an original three-dimensional glass landscape with camera movement and animated reflections using a small WebGL shader. The emblem appears above the material before the scene opens into the library. The demo and Electron startup share the same renderer. This is procedural animation, not an AI-generated video. No video plugin asset has been produced: Higgsfield was not connected and the connected Runway plan did not allow video generation.

Rendering is capped at 1600 pixels wide, stops when the document is hidden, and releases its resources on exit. Reduced motion renders one still frame; unsupported WebGL falls back to the CSS material and emblem. Electron startup lasts about three seconds, can wait up to 4.2 seconds for the initial scan, and can be skipped with Enter, Escape, the visible button or controller A/B. Game launch remains a separate image transition. The demo does not start an executable.

Run `npm run dev` from `frontend/`, then open `/prototypes/console-intro.html` on the local Vite URL. Press Enter to enter Nexus, use Left/Right to change games, Enter to preview launch, and Escape to return. Mouse and gamepad input also work. The page includes a reduced motion switch. Game artwork is loaded from Steam's public CDN, so images require a network connection.

Motion references:

- [BUCK: F8 2019](https://buck.co/work/f8-2019) — scale, frame edges, and shape movement.
- [BUCK: Comfy Brand Refresh](https://www.buck.co/work/comfy-brand-refresh) — modular parts reorganizing into a coherent identity.
- [Territory Studio: Call of Duty Black Ops 6 Cinematics](https://territorystudio.com/project/call-of-duty-bo6/) — expressive deconstruction of type.
- [PlayStation: First Look at the PlayStation 5 User Experience](https://www.youtube.com/watch?v=7TBPrYJDoDE) — game-first pacing and navigation.

The prototype uses Nexus branding and original transitions rather than PlayStation assets or sounds.
