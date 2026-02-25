# Professor Basil's Lab

A full-stack-in-the-browser Pokemon platform. Team builder, battle simulator, wild encounters, GBA/NDS emulators, binary save parser, and more -- all running client-side with zero backend.

**Live:** [professor-basils-lab.vercel.app](https://professor-basils-lab.vercel.app)

---

## Features

**Team Builder** -- Search and customize all 1,025 Pokemon. Natures, EVs, IVs, abilities, held items, moves, Tera types. Share via URL or Showdown import/export.

**Battle Simulator** -- Turn-based engine with damage formula, status conditions, stat stages, weather, terrain, 50+ held items, and AI opponent. Supports Mega Evolution, Terastallization, and Dynamax. Battle replays with playback controls and timeline scrubbing.

**Wild Encounters** -- Walk through Kanto, Johto, Hoenn, and Sinnoh. Gen V+ catch formula, 14 ball types, shiny odds (1/4096), fishing, repels, day/night cycle, weather. Caught Pokemon go into a PC box system.

**GBA Emulator** -- Embedded mGBA (compiled to WASM) running real GBA ROMs in the browser. Save states, ROM persistence via IndexedDB, save export/import, and on-screen touch controls for mobile.

**NDS Emulator** -- RetroArch with melonDS WASM core for Nintendo DS games. Dual-screen rendering, touch input on bottom screen, keyboard and gamepad support.

**Binary Save Parser** -- Reads Gen 3 save files (Ruby/Sapphire/Emerald/FireRed/LeafGreen). XOR decryption, substructure permutation, IV bit extraction. Implemented in both TypeScript and Rust/WASM with automatic fallback.

**Coverage Analysis** -- Defensive/offensive team analysis, type weakness charts, suggested types, and threat scoring.

**Damage Calculator** -- Full damage formula with STAB, type effectiveness, abilities, held items, weather, and terrain modifiers.

**Pokedex** -- Track 1,025 Pokemon across all sources (wild catches, battle wins, GBA imports). Habitat filters, fossil revival, and type quiz minigame.

**PokeMart** -- In-game shop for balls, potions, and battle items using earned currency.

**Move Tutor & EV Training** -- Teach moves and train EVs for caught Pokemon.

**Trainer Card** -- Track stats and achievements. PNG export for sharing.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4, Framer Motion |
| Language | TypeScript 5, Rust (9 WASM crates) |
| Data | PokeAPI v2, TanStack React Query v5 |
| Charts | Recharts 3 |
| Emulation | mGBA WASM, RetroArch melonDS WASM |
| Storage | localStorage, IndexedDB |
| Testing | Vitest (63 tests), Rust unit tests |
| Hosting | Vercel |

---

## Architecture

All game logic lives in `src/utils/` as pure functions. Components dispatch actions and render state. No backend, no database, no authentication.

```
src/
  app/page.tsx          Single-page app with tab navigation
  components/           UI components (no business logic)
  hooks/                useReducer state machines + React Query
  utils/                Pure functions: damage, catch rate, AI, parsers
  data/                 Lookup tables (type chart, natures, items, maps)
  contexts/             React Context for shared state

rust/                   9 Rust/WASM crates
  pkmn-type-chart/      Type effectiveness engine
  pkmn-stats/           Stat calculator
  pkmn-damage/          Damage formula
  pkmn-catch-rate/      Catch probability + flee logic
  pkmn-analysis/        Team analysis + defensive coverage
  pkmn-battle/          AI scoring, turn order, mechanic decisions
  pkmn-breeding/        Egg compatibility + IV inheritance
  pkmn-showdown/        Showdown paste parser/serializer
  gen3-parser/          Gen 3 binary save file parser

public/wasm/            Compiled WASM binaries
public/mgba/            mGBA emulator core
public/nds/             melonDS RetroArch core
```

Every WASM module has a TypeScript wrapper (`src/utils/*Wasm.ts`) that lazy-loads the binary, falls back to a pure JS implementation if WASM fails, and exports the same API either way.

---

## Browser Support

| Feature | Chrome 91+ | Firefox 89+ | Safari 16.4+ | iOS Safari | iOS Chrome/Opera |
|---------|-----------|-------------|-------------|------------|-----------------|
| Core app | Yes | Yes | Yes | Yes | Yes |
| WASM crates | Yes | Yes | Yes | Yes | Yes |
| WASM SIMD | Yes | Yes | Yes | Yes | Yes |
| GBA emulator | Yes | Yes | Yes | Yes | No |
| NDS emulator | Yes | Yes | Yes | Yes | No |
| Music (FLAC) | Yes | Yes | Yes | Yes | Yes |

The GBA and NDS emulators require `SharedArrayBuffer` for multi-threaded WASM. This needs cross-origin isolation headers (`COOP: same-origin` + `COEP: require-corp`), which are configured automatically. On iOS, only Safari supports `SharedArrayBuffer` — third-party browsers (Chrome, Opera GX, Firefox) use WebKit without full cross-origin isolation support.

Mobile devices get on-screen touch controls matching real hardware layouts (D-pad, A/B/X/Y, bumpers, Start/Select).

---

## Development

```bash
npm install
npm run dev
```

### Build WASM crates (requires Rust + wasm-pack)

```bash
npm run build:wasm
```

### Run tests

```bash
npm test
```

---

## Scale

| Metric | Value |
|--------|-------|
| Source files | 90+ |
| Pokemon supported | 1,025 (all 9 generations) |
| WASM crates | 9 |
| Test count | 63 JS + Rust unit tests |
| Battle engine | ~800 lines, pure state machine |
| Regions | 4 (Kanto, Johto, Hoenn, Sinnoh) |
| Ball types | 14 with context-sensitive modifiers |
| Held items | 50+ with battle effects |
| Achievements | 23 across 5 categories |
| Backend | None |

---

## License

This project is for educational and portfolio purposes. Pokemon is a trademark of Nintendo/Game Freak/The Pokemon Company. No ROMs or copyrighted assets are included or distributed.
