# Professor Basil's Lab -- Technical Deep Dive

> For developers and engineers. Architecture decisions, code patterns, binary format parsing, WASM compilation, and testing methodology.

> **Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript 5, Rust/WASM (wasm-pack + wasm-bindgen), Tailwind CSS v4, TanStack React Query v5, Recharts, Framer Motion, PokeAPI

> **Source:** ~90 source files, zero backend, entirely client-side. Battle engine, binary parser, GBA emulator, and wild encounter system all run in the browser.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [State Management Pattern](#2-state-management-pattern)
3. [Battle Engine](#3-battle-engine)
4. [Binary Save Parser (TypeScript)](#4-binary-save-parser-typescript)
5. [Rust/WASM Rewrite](#5-rustwasm-rewrite)
6. [WASM Build Pipeline & Integration](#6-wasm-build-pipeline--integration)
7. [Test Strategy](#7-test-strategy)
8. [GBA Emulator Integration](#8-gba-emulator-integration)
9. [Wild Encounter System](#9-wild-encounter-system)
10. [Cross-System Wiring via React Context](#10-cross-system-wiring-via-react-context)
11. [Battle Replay System](#11-battle-replay-system)
12. [Lessons & Trade-offs](#12-lessons--trade-offs)

---

## 1. Architecture Overview

Every feature follows one rule: **game logic lives in `utils/` as pure functions. Components dispatch actions and render state.**

```
src/
  types/index.ts        -- All shared TypeScript interfaces
  hooks/                -- useReducer-based state machines + React Query hooks
  utils/                -- Pure functions: damage calc, catch formula, parser, AI
  data/                 -- Hardcoded lookup tables (type chart, natures, items)
  contexts/             -- React Context providers for shared state
  components/           -- UI only, no business logic
  app/page.tsx          -- Single-page app, tab navigation

rust/gen3-parser/       -- Rust crate compiled to WASM
  src/lib.rs            -- wasm-bindgen entry points
  src/charset.rs        -- Gen 3 encoding → UTF-8
  src/species.rs        -- Internal ID → National Dex mapping
  src/pokemon.rs        -- XOR decryption, substructure permutations, IV extraction
  src/save.rs           -- Save slot detection, section ordering, full parse

public/wasm/            -- Compiled WASM binary (37KB)
tests/                  -- JS parity tests (Node built-in test runner)
```

This separation meant the Rust port was straightforward -- `utils/gen3SaveParser.ts` and `utils/gen3PokemonDecryptor.ts` mapped cleanly to `save.rs` and `pokemon.rs` because the TypeScript was already pure functions with no framework coupling.

---

## 2. State Management Pattern

The app uses `useReducer` for all complex state. No Redux, no Zustand -- just React's built-in reducer pattern.

### Why useReducer over useState

Three features evolved independently into state machines: team builder, battle engine, and wild encounters. Each has:

- **Finite phases** (e.g., battle: `setup → action_select → executing → force_switch → ended`)
- **Complex transitions** (end-of-turn effects cascade: damage → status → weather → faints → force switch)
- **Derived state** (effective stats depend on base + EVs + IVs + nature + stat stages + items)

Reducers make these transitions explicit and testable. The battle reducer is ~800 lines of pure logic that can be tested without rendering a single component.

### Persistence Layer

- **localStorage**: Team, Pokedex, achievements, replays (small structured data)
- **IndexedDB**: ROMs and save files (binary blobs up to 32MB)
- **React Query**: PokeAPI responses (automatic caching with infinite staleTime)
- **URL params**: Team sharing via base64-encoded `?team=` parameter

---

## 3. Battle Engine

The entire battle engine is `(BattleState, BattleAction) => BattleState`. Six action types drive all interactions:

```typescript
type BattleAction =
  | { type: "START_BATTLE"; ... }
  | { type: "SELECT_MOVE"; player; moveIndex }
  | { type: "SELECT_SWITCH"; player; pokemonIndex }
  | { type: "EXECUTE_TURN"; player1Action; player2Action }
  | { type: "FORCE_SWITCH"; player; pokemonIndex }
  | { type: "RESET_BATTLE" };
```

### Turn execution order

1. Both players submit actions simultaneously
2. Priority resolution: switches always go first, then speed comparison
3. For each action: status check → mechanic transformation (Mega/Tera/Dynamax) → move execution → faint check
4. End-of-turn: weather damage → status damage (burn/poison/toxic) → terrain countdown → Dynamax turns → held item triggers (Leftovers, Black Sludge)
5. Force switch phase if a Pokemon fainted

### Generational mechanics

Three mechanics share unified action types. One mechanic per team per battle:

- **Mega Evolution**: Stat/type/ability override, permanent for the battle
- **Terastallization**: Defensive type changes, dual STAB (original + Tera type)
- **Dynamax**: HP doubles, moves become Max Moves with field effects, 3-turn timer, reverts on switch

### AI scoring

```
move_score = power * STAB * typeEffectiveness * (accuracy / 100)
switch_score = defensive_matchup + offensive_matchup + hp_percentage
```

If best switch score > 1.5 * best move score, the AI switches. Mechanic usage: Mega always first opportunity, Tera when defensively mismatched, Dynamax 50% when healthy or always when last Pokemon alive.

---

## 4. Binary Save Parser (TypeScript)

Gen 3 saves (Ruby/Sapphire/Emerald/FireRed/LeafGreen) are 128KB binary files.

### File structure

```
Offset 0x00000-0x0DFFF: Save slot 0 (14 sections × 4096 bytes)
Offset 0x0E000-0x1BFFF: Save slot 1 (14 sections × 4096 bytes)
Offset 0x1C000+:        Hall of Fame + misc
```

Each section has a footer at bytes 0xFF4-0xFFF:
- `0xFF4`: Section ID (0-13) -- **sections are stored in scrambled order**
- `0xFF8`: Checksum
- `0xFFC`: Save index (monotonically increasing counter)

Active slot = whichever has the higher save index.

### Pokemon data layout (80 bytes PC, 100 bytes party)

```
Bytes 0-3:    PID (Personality Value)
Bytes 4-7:    OTID (Trainer ID | Secret ID << 16)
Bytes 8-17:   Nickname (Gen 3 proprietary encoding, 0xFF terminated)
Bytes 32-79:  ENCRYPTED substructure data (48 bytes, XOR cipher)
Bytes 80-99:  Party-only battle stats (level, current HP, etc.)
```

### XOR decryption

```typescript
const key = (pid ^ otId) >>> 0;  // >>> 0 forces unsigned 32-bit
for (let i = 0; i < 48; i += 4) {
  const chunk = encrypted[i] | (encrypted[i+1] << 8) |
                (encrypted[i+2] << 16) | (encrypted[i+3] << 24);
  const dec = (chunk ^ key) >>> 0;
  // write dec back as little-endian bytes
}
```

The `>>> 0` is critical. JavaScript's bitwise operators produce signed 32-bit integers. Without unsigned coercion, XOR results with the sign bit set become negative, corrupting subsequent byte extraction.

### 24 substructure permutations

After decryption, the 48 bytes contain 4 × 12-byte substructures:
- **G (Growth)**: Species, held item, experience
- **A (Attacks)**: 4 move IDs + PP values
- **E (EVs)**: 6 EV values + contest stats
- **M (Misc)**: Pokeball, IVs (bit-packed u32), egg flag, ability bit

The physical order depends on `PID % 24` (4! = 24 permutations). To read the Growth substructure, you first look up where Growth is stored for this PID's permutation index.

### IV bit-packing

All 6 IVs + egg flag + ability bit are packed into a single `uint32` in the Misc substructure:

```
Bits  0-4:  HP IV      (0-31)
Bits  5-9:  Attack IV  (0-31)
Bits 10-14: Defense IV (0-31)
Bits 15-19: Speed IV   (0-31)
Bits 20-24: Sp.Atk IV  (0-31)
Bits 25-29: Sp.Def IV  (0-31)
Bit  30:    Is Egg
Bit  31:    Ability Slot
```

### Shiny determination

```typescript
const isShiny = (tid ^ sid ^ (pid >> 16) ^ (pid & 0xFFFF)) < 8;
```

XOR of trainer ID, secret ID, and both PID halves. Threshold of 8 gives ~1/8192 odds in Gen 3.

---

## 5. Rust/WASM Rewrite

The save parser was rewritten in Rust and compiled to WebAssembly. The TypeScript version is kept as a fallback.

### Why this module

The parser is a pure function with no framework dependencies: `bytes → structured data`. It's heavy on bit manipulation, XOR operations, and binary format parsing -- all things Rust handles natively without JavaScript's unsigned arithmetic workarounds.

### Crate layout

```toml
[package]
name = "gen3-parser"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]  # cdylib for WASM, rlib for tests

[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1", features = ["derive"] }
serde-wasm-bindgen = "0.6"

[profile.release]
opt-level = "z"   # optimize for size
lto = true        # link-time optimization
strip = true      # strip debug symbols
```

### Key design decisions

**1. Native unsigned arithmetic.**

In TypeScript:
```typescript
const key = (pid ^ otId) >>> 0;  // force unsigned
const dec = (chunk ^ key) >>> 0;  // force unsigned again
```

In Rust:
```rust
let key: u32 = pid ^ ot_id;  // naturally unsigned
let dec: u32 = chunk ^ key;  // no coercion needed
```

Every `>>> 0` in the TypeScript version simply disappears.

**2. Stack-allocated decryption buffer.**

TypeScript allocates a `DataView` on the heap. Rust decrypts into `[u8; 48]` -- a fixed-size array on the stack:

```rust
fn decrypt_substructures(encrypted: &[u8], pid: u32, ot_id: u32) -> [u8; 48] {
    let key = pid ^ ot_id;
    let mut decrypted = [0u8; 48];
    for i in (0..48).step_by(4) {
        let chunk = u32::from_le_bytes([
            encrypted[i], encrypted[i+1], encrypted[i+2], encrypted[i+3],
        ]);
        decrypted[i..i+4].copy_from_slice(&(chunk ^ key).to_le_bytes());
    }
    decrypted
}
```

**3. Compile-time permutation table.**

```rust
const SUBSTRUCTURE_ORDERS: [[u8; 4]; 24] = [
    [0, 1, 2, 3], // GAEM
    [0, 1, 3, 2], // GAME
    // ... all 24 permutations
    [3, 2, 1, 0], // MEAG
];
```

This is a `const` -- it exists in the WASM binary's data section, not allocated at runtime.

**4. Serde for zero-friction JS interop.**

```rust
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Gen3Pokemon {
    pub pid: u32,
    pub ot_id: u32,
    pub species: u16,
    pub nickname: String,
    pub level: u8,
    // ...
}
```

The `rename_all = "camelCase"` attribute means the Rust struct fields (`ot_id`, `held_item`, `sp_atk`) serialize to JavaScript-convention names (`otId`, `heldItem`, `spAtk`) automatically. The WASM output matches the TypeScript types with no manual mapping.

**5. WASM entry points are thin wrappers.**

```rust
#[wasm_bindgen(js_name = "parseGen3Save")]
pub fn parse_gen3_save_wasm(buffer: &[u8]) -> JsValue {
    match save::parse_gen3_save(buffer) {
        Some(data) => serde_wasm_bindgen::to_value(&data).unwrap_or(JsValue::NULL),
        None => JsValue::NULL,
    }
}
```

The `&[u8]` parameter accepts a JavaScript `Uint8Array` directly via wasm-bindgen. The return value is a `JsValue` -- a plain JavaScript object, not a WASM struct.

---

## 6. WASM Build Pipeline & Integration

### Build command

```bash
wasm-pack build --target web --release
```

Output goes to `rust/gen3-parser/pkg/`:
- `gen3_parser_bg.wasm` -- the compiled binary (37KB)
- `gen3_parser.js` -- wasm-bindgen JS glue
- `gen3_parser.d.ts` -- TypeScript type declarations

### wasm-opt problem

`wasm-pack` bundles `wasm-opt` for post-compilation optimization. But Rust 1.93 emits bulk memory operations (`memory.copy`, `memory.fill`) that the bundled `wasm-opt` version couldn't validate:

```
Error: Bulk memory operations require bulk memory [--enable-bulk-memory]
```

Fix: disable `wasm-opt` entirely. Rust's LTO pass already handles optimization:

```toml
[package.metadata.wasm-pack.profile.release]
wasm-opt = false
```

### Serving the WASM binary

The `.wasm` file is copied to `public/wasm/` and served as a static asset. This avoids Turbopack trying to bundle it (which, like the mGBA WASM, causes infinite hangs).

### JS wrapper with lazy loading and fallback

```typescript
async function initWasm(): Promise<boolean> {
  try {
    const mod = await import(
      /* webpackIgnore: true */
      "../../rust/gen3-parser/pkg/gen3_parser.js"
    );
    await mod.default("/wasm/gen3_parser_bg.wasm");
    wasmModule = { parseGen3Save: mod.parseGen3Save };
    return true;
  } catch (e) {
    console.warn("[gen3-parser] WASM init failed, using JS fallback:", e);
    wasmFailed = true;
    return false;
  }
}
```

Three layers of safety:
1. **Lazy init**: WASM loads on first use (or pre-loaded via `ensureWasmReady()`)
2. **Init failure fallback**: If WASM can't load (SSR, missing file), flag it and use JS forever
3. **Parse failure fallback**: If a WASM parse throws, catch it and retry with the JS parser

The `SaveImporter` component pre-loads WASM on mount so the first parse doesn't stall:

```typescript
useEffect(() => { ensureWasmReady(); }, []);
```

---

## 7. Test Strategy

### Rust tests (63 total)

Tests use synthetic data construction -- no real save files needed. A shared `build_pokemon_data` helper constructs valid encrypted Pokemon data blocks programmatically:

```rust
pub fn build_pokemon_data(
    pid: u32, ot_id: u32, species: u16, held_item: u16,
    experience: u32, moves: [u16; 4], evs: [u8; 6],
    iv_data: u32, origins_info: u16, party: bool, party_level: u8,
) -> Vec<u8>
```

The helper:
1. Builds 4 plaintext substructures (Growth, Attacks, EVs, Misc)
2. Arranges them according to `PID % 24`
3. XOR-encrypts with `key = PID ^ OTID`
4. Prepends the 32-byte header (PID, OTID, nickname)
5. Appends 20-byte party data if `party = true`

This helper lives in `pub(crate) mod test_helpers` inside `pokemon.rs` -- accessible from `save.rs` tests via `crate::pokemon::test_helpers::build_pokemon_data` but invisible outside the crate.

Coverage breakdown:

| Module | Tests | Coverage |
|--------|-------|----------|
| `charset.rs` | 16 | Full charset, terminators, offsets, real names |
| `species.rs` | 8 | Gen 1-3 mapping, boundaries, edge cases |
| `pokemon.rs` | 22 | All 24 permutations, shiny boundaries, IV packing, encryption roundtrip |
| `save.rs` | 12 | Slot detection, scrambled sections, party cap, missing sections |
| **Total** | **63** | |

### JavaScript parity tests (20 total)

`tests/gen3-parser-parity.test.ts` -- standalone file using Node's built-in test runner (`node:test`). Contains a self-contained reimplementation of the parser (no external imports) to validate the same synthetic data constructions produce identical results.

Three test suites:
- **Synthetic Pokemon Decryption** (9 tests): All 24 permutations, shiny boundary, egg/ability flags, ball extraction, party level, species mapping
- **Synthetic Save File Parsing** (5 tests): Full save parse, slot selection, empty/full party
- **Edge Cases** (6 tests): XOR identity, move filtering, species rejection, max EVs, large PIDs

### Running tests

```bash
# Rust
cd rust/gen3-parser && cargo test    # 63 tests, < 1s

# JavaScript
node --experimental-strip-types tests/gen3-parser-parity.test.ts    # 20 tests
```

---

## 8. GBA Emulator Integration

### The package

`@thenick775/mgba-wasm` -- mGBA compiled from C++ to WebAssembly. ~2.5MB binary.

### SharedArrayBuffer requirement

mGBA uses Web Workers, which require `SharedArrayBuffer`. This needs COOP/COEP headers:

```typescript
// next.config.ts
headers: [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
]
```

Used `credentialless` (not `require-corp`) so cross-origin PokeAPI sprites still load.

### Turbopack WASM bundling workaround

Turbopack hangs indefinitely on large WASM imports. Solution:

1. Copy WASM files to `public/mgba/`
2. Use `new Function("url", "return import(url)")` to bypass static analysis:

```typescript
const mod = await new Function("url", "return import(url)")("/mgba/mgba.js");
```

Turbopack never sees the import, never tries to process the WASM.

### Storage

ROMs and saves persist to IndexedDB (not localStorage -- GBA ROMs can be 16-32MB). Three object stores: `roms`, `saves`, `states`. Auto-save every 30 seconds + on tab visibility change.

---

## 9. Wild Encounter System

### The catch formula (Gen V+)

```typescript
modifiedRate = min(255, ((3*maxHP - 2*currentHP) * captureRate * ballMod) / (3*maxHP) * statusMod);
shakeProbability = 65536 / pow(255 / modifiedRate, 0.1875);
```

Four independent shake checks. All four must pass. 14 ball types with context-sensitive modifiers (Quick Ball: 5x turn 1, Dusk Ball: 3.5x at night/cave, Timer Ball: scales with turn count).

### Region maps

Four regions (Kanto, Johto, Hoenn, Sinnoh) with area-based encounter tables. Each area specifies theme, encounter pool, level ranges, and encounter rates.

---

## 10. Cross-System Wiring via React Context

### The problem

`usePokedex()` and `useAchievements()` used internal `useReducer`. Each component calling the hook got its own independent instance. Catching a Pokemon in Wild mode didn't register in the Pokedex. Winning a battle didn't count toward achievements.

### The solution

Wrapped each hook in a React Context provider:

```typescript
const PokedexContext = createContext<ReturnType<typeof usePokedex> | null>(null);

export function PokedexProvider({ children }) {
  const pokedex = usePokedex();
  return <PokedexContext.Provider value={pokedex}>{children}</PokedexContext.Provider>;
}
```

Both providers nested in `providers.tsx`:
```
QueryClientProvider > PokedexProvider > AchievementsProvider > children
```

Now `WildTab`, `BattleTab`, and `SaveImporter` all call `usePokedexContext()` and `useAchievementsContext()` to update the shared instance.

---

## 11. Battle Replay System

### The Math.random() problem

The battle reducer calls `Math.random()` for damage rolls, crits, accuracy, and AI decisions. Replaying the same action sequence produces different results. JavaScript's `Math.random()` can't be seeded.

### Solution: state snapshots

Instead of recording actions, snapshot the entire `BattleState` via `structuredClone` after every turn:

```typescript
const recordSnapshot = useCallback((state: BattleState) => {
  snapshotsRef.current.push({
    turn: state.turn,
    state: structuredClone(state),  // deep copy
  });
}, []);
```

The replay player just walks through the snapshot array. The same `BattleArena` component renders each snapshot.

Trade-off: ~5-10KB per snapshot, ~40 turns per battle = ~400KB per replay. Max 10 replays in localStorage. Acceptable for a client-side app.

---

## 12. Lessons & Trade-offs

**useReducer scales surprisingly well.** The battle reducer grew to ~800 lines and handles 6 status conditions, 3 generational mechanics, weather, terrain, 50+ items, and AI. It's still one pure function. Testing is trivial -- construct a state, dispatch an action, assert the result.

**WASM isn't always faster, but it's always safer for bit manipulation.** The Rust parser doesn't need `>>> 0` hacks. Every `u32` operation is naturally unsigned. The code is more readable and less error-prone for binary format parsing.

**Turbopack and WASM don't mix yet.** Both the mGBA binary and the Gen 3 parser WASM had to be served from `public/` with runtime loading tricks. This is a known gap in the ecosystem as of early 2026.

**structuredClone is underappreciated.** It solved the replay problem cleanly. Deep-copying complex state trees (nested objects, arrays, references) without writing custom clone logic.

**The `pub(crate)` pattern for test helpers works well.** Rust's module system makes it clean to share test utilities across modules while keeping them invisible to external consumers. The `#[cfg(test)] pub(crate) mod test_helpers` pattern is worth adopting broadly.

**Synthetic test data > fixture files.** Building encrypted Pokemon data programmatically in both Rust and TypeScript proved more maintainable than shipping binary test fixtures. The builder functions serve as executable documentation of the binary format.
