# Professor Basil's Lab

A Pokemon team builder that got out of hand. What started as a team builder turned into a battle simulator, then a wild encounter system, then I embedded an actual GBA emulator, then I wrote a binary parser to rip Pokemon out of Gen 3 save files. It's all client-side, no backend.

**Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, PokeAPI

**[Live Demo](#)** (coming soon)

---

## What's in here

**Team Builder** — Search the full National Pokedex (Gens 1–9, 1025 Pokemon), customize EVs/IVs/natures/abilities/items/moves/Tera types, swap between alternate formes. Import and export teams in Pokemon Showdown format. Share teams via URL.

**Battle Simulator** — Turn-based fights against an AI or a friend (local PvP). Full Gen V+ damage formula with STAB, crits, stat stages, status conditions, weather, terrain, held items. Pick one generational mechanic per battle: Mega Evolution, Terastallization, or Dynamax. The AI isn't brilliant but it'll punish bad type matchups.

**Wild Encounters** — Pick a region (Kanto/Johto/Hoenn/Sinnoh), pick an area, walk through grass. The catch system uses the real Gen V+ formula with all 14 ball types and their context-sensitive modifiers. Shiny odds are 1/4096. Caught Pokemon go into a PC box.

**GBA Emulator** — Embedded mGBA compiled to WebAssembly. Drop in a GBA, GBC, or GB ROM you legally own and play it in the browser. Save states, speed controls, auto-save to IndexedDB. The "Import Pokemon" button reads the emulator's save data, decrypts the Gen 3 binary format, and pulls your party/box Pokemon into the app's PC box alongside anything caught in-app.

**Analysis Tools** — Type coverage matrix, stat radar chart, damage calculator, and a team weakness panel that scores your defensive holes and suggests types to patch them.

**Pokedex & Achievements** — Tracks what you've seen/caught across all sources. 23 achievements for various milestones.

---

## The interesting engineering

Most of this is standard React/TypeScript. The parts that aren't:

**The GBA emulator** runs mGBA's C++ core compiled to WASM. Getting it working in Next.js was a pain — Turbopack hangs forever if it tries to bundle the WASM binary, so I serve it from `public/` and load it at runtime with a dynamic import that bypasses static analysis. The app also needs `SharedArrayBuffer` for threading, which requires COOP/COEP headers.

**The save file parser** reads raw Gen 3 save data (Ruby/Sapphire/Emerald). Pokemon data in these saves is XOR-encrypted with a key derived from the personality value and trainer ID. The 48-byte data block is split into 4 sub-structures that get shuffled into one of 24 permutations based on `PID % 24`. IVs are bit-packed into a single 32-bit integer (5 bits per stat). I had to implement all of this from the binary spec to extract species, moves, EVs, IVs, nature, and shiny status.

**The battle engine** is a pure `useReducer` state machine — every action goes through a reducer that returns a new state with no side effects. This matters because it means the engine is deterministic and could support replays or multiplayer (just sync the action stream). Three generational mechanics coexist in the same reducer with unified action types and mechanic-specific sub-handlers.

**The catch formula** is the actual Gen V+ math: modified rate calculation, four independent shake checks, context-aware ball modifiers (Quick Ball checks turn count, Dusk Ball checks time of day, Net Ball checks typing), status bonuses, and flee probability.

---

## Project structure

```
src/
├── components/          # UI — battle, wild encounters, GBA emulator, team builder, etc.
├── data/                # Type chart, natures, items, balls, routes, formes, Max Moves
├── hooks/               # useTeam, useBattle, useWildEncounter, useGBAEmulator, usePokedex, etc.
├── types/               # TypeScript definitions
└── utils/               # Pure logic — damage calc, AI, catch rate, Gen 3 parser, Showdown format
```

All game logic lives in `utils/` as pure functions with no React dependencies. Components just dispatch actions and render state.

---

## Run it

```bash
git clone https://github.com/BFAlajid/professor-basils-lab.git
cd professor-basils-lab
npm install
npm run dev
```

Opens at [localhost:3000](http://localhost:3000).

---

## Credits

- Pokemon data from [PokeAPI](https://pokeapi.co/)
- GBA emulation via [mGBA](https://mgba.io/) ([@thenick775/mgba-wasm](https://www.npmjs.com/package/@thenick775/mgba-wasm))

Pokemon is a trademark of Nintendo / Game Freak / The Pokemon Company. This is a fan project for educational and personal use. No ROMs are included or distributed.
