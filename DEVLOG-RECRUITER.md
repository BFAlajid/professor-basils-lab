# Professor Basil's Lab -- Project Overview

> A full-stack-in-the-browser Pokemon application. Team builder, battle simulator, wild encounter system, GBA emulator, and binary save file parser -- all running client-side with zero backend.

---

## What I Built

A Pokemon team builder that grew into a comprehensive game platform, entirely in the browser. No server. No database. No authentication. Just a single-page app that handles everything from competitive team analysis to emulating a real Game Boy Advance.

**Live features:**

- **Team Builder** -- Search and customize all 1,025 Pokemon. Set natures, EVs, IVs, abilities, held items, moves, Tera types. Share teams via URL or Showdown format.
- **Battle Simulator** -- Full turn-based battle engine with damage formula, 6 status conditions, stat stages, weather, terrain, 50+ held items, and an AI opponent. Supports Mega Evolution, Terastallization, and Dynamax.
- **Wild Encounter System** -- Walk through 4 regions (Kanto, Johto, Hoenn, Sinnoh), encounter wild Pokemon with the real Gen V+ catch formula, 14 ball types, shiny odds. Caught Pokemon go into a PC box.
- **GBA Emulator** -- Embedded mGBA (compiled to WebAssembly) that runs real GBA ROMs in the browser. Save state management, ROM persistence, and save file export/import.
- **Binary Save Parser** -- Reads Gen 3 save files (Ruby/Sapphire/Emerald/FireRed/LeafGreen) and imports your Pokemon into the app. XOR decryption, substructure permutation, IV bit extraction. Implemented in both TypeScript and Rust/WASM.
- **Pokedex & Achievements** -- Track 1,025 Pokemon across all sources. 23 achievements tied to catching, battling, collecting, and exploring.
- **Battle Replays** -- Record and replay battles with playback controls, speed adjustment, and timeline scrubbing.

---

## Technical Highlights

### Rust/WebAssembly Binary Parser

Rewrote the Gen 3 save file parser in Rust, compiled to a 37KB WebAssembly module. The parser handles XOR-encrypted Pokemon data, 24 substructure permutations, and bit-packed IVs. The WASM module loads lazily with an automatic fallback to the TypeScript implementation if WASM initialization fails.

**Why this matters:** Demonstrates the ability to work across language boundaries -- writing systems-level Rust code that integrates seamlessly with a React frontend via wasm-bindgen and serde serialization.

**Test coverage:** 63 Rust unit tests + 20 JavaScript parity tests. Tests are built on synthetic data construction -- no binary fixture files, just programmatic test data builders that serve as executable documentation of the binary format.

### Battle Engine as a Pure State Machine

The entire battle simulator is a single pure function: `(state, action) => newState`. No side effects, no mutations. This made it possible to:

- Test complex battle scenarios without rendering UI
- Add three generational mechanics (Mega/Tera/Dynamax) through unified action types
- Build a replay system by snapshotting state after each turn

### GBA Emulator in the Browser

Integrated mGBA (a C++ GBA emulator compiled to WASM) into a Next.js app. Solved two non-trivial integration challenges:

1. **SharedArrayBuffer requirements** -- mGBA needs Web Workers with shared memory, requiring specific HTTP security headers that had to be balanced against cross-origin resource loading (PokeAPI sprites).
2. **WASM bundling** -- Next.js 16's Turbopack hangs on large WASM files. Worked around this by serving WASM from the public directory and using runtime dynamic imports that bypass static analysis.

### Cross-System Event Wiring

Used React Context to connect previously siloed features. Catching a wild Pokemon updates the Pokedex. Winning a battle tracks toward achievements. Importing from a GBA save registers caught Pokemon. Each system was built independently, then connected through shared context providers.

---

## Skills Demonstrated

| Area | Details |
|------|---------|
| **Frontend Architecture** | React 19, Next.js 16, TypeScript 5, useReducer state machines, React Context for shared state |
| **Systems Programming** | Rust, wasm-bindgen, serde, binary format parsing, XOR decryption, bit manipulation |
| **WebAssembly** | wasm-pack build pipeline, lazy WASM loading, JS/WASM interop, fallback patterns |
| **State Management** | Complex reducer patterns, 800+ line battle reducer, replay via state snapshots |
| **API Integration** | PokeAPI consumption, React Query caching, Showdown format import/export |
| **Binary Data** | Little-endian byte parsing, encrypted data structures, bit-packed fields, proprietary character encoding |
| **Testing** | 83 tests across Rust + JS, synthetic test data builders, parity testing between implementations |
| **Performance** | WASM for compute-heavy parsing, lazy loading, IndexedDB for large binary storage |
| **Problem Solving** | WASM bundler workarounds, SharedArrayBuffer header configuration, unsigned arithmetic in JS |

---

## Architecture Decisions

**All game logic in pure functions.** Components only dispatch actions and render state. This kept the codebase testable and made the Rust port straightforward -- the TypeScript parser was already a pure function with no framework coupling.

**useReducer over external state libraries.** The battle engine, team builder, wild encounters, Pokedex, and achievements all use React's built-in `useReducer`. No Redux, no Zustand. The reducer pattern provided the right balance of structure and simplicity for each feature's state machine.

**Dual implementation (Rust + TypeScript).** The save parser exists in both languages with automatic fallback. This demonstrates cross-language development and ensures the feature works even if WASM fails to load (SSR, unsupported browser, missing binary).

**Client-side everything.** localStorage for structured data, IndexedDB for binary blobs, React Query for API caching. No backend simplifies deployment and eliminates infrastructure costs, but required careful attention to storage limits and data persistence.

---

## Scale

| Metric | Value |
|--------|-------|
| Source files | ~90 |
| Languages | TypeScript, Rust, CSS |
| Battle engine | ~800 lines, 6 action types, 9 Math.random() call sites |
| Save parser | 4 Rust modules, ~750 lines total |
| WASM binary | 37KB |
| Test count | 83 (63 Rust + 20 JS) |
| Pokemon supported | 1,025 (all 9 generations) |
| Ball types | 14 with context-sensitive modifiers |
| Held items | 50+ with battle effects |
| Achievements | 23 across 5 categories |
| Regions | 4 (Kanto, Johto, Hoenn, Sinnoh) |
| Backend | None |

---

## Tech Stack

- **Framework:** Next.js 16.1.6 (App Router, Turbopack)
- **UI:** React 19, Tailwind CSS v4, Framer Motion
- **Data:** TanStack React Query v5, PokeAPI
- **Charts:** Recharts 3.7
- **Systems:** Rust (wasm-pack, wasm-bindgen, serde), WebAssembly
- **Emulation:** mGBA via @thenick775/mgba-wasm
- **Storage:** localStorage, IndexedDB
- **Testing:** Rust's built-in test framework, Node's built-in test runner
