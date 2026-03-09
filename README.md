# Professor Basil's Lab

A full-stack Pokemon platform with team building, competitive battle simulation, wild encounters, breeding, PC storage, minigames, GBA/NDS/3DS emulators, global leaderboards, and 10 Rust/WASM crates — deployable as an offline-capable PWA on Vercel.

**Live:** [professor-basils-lab.vercel.app](https://professor-basils-lab.vercel.app)

---

## Features

### Team Builder

Build teams of 6 from all 1,025 Pokemon. Full customization: natures, EVs, IVs, abilities, held items, moves, formes, Tera types. Import/export Showdown paste format. Smogon competitive preset loader. Tier validation against OU/UU/Uber rulesets. Share teams via URL encoding, QR codes, or shareable links. Trainer card PNG export.

### Battle Simulator

Turn-based engine with the full damage formula, stat stages, type effectiveness, weather (sun, rain, hail, sandstorm), status conditions (paralysis, burn, freeze, sleep, poison, confusion), 100+ abilities, 50+ held items, critical hits, STAB, recoil, drain, multi-hit, and Protect mechanics. Supports Mega Evolution, Terastallization, and generational rulesets (Gen 3 through Gen 8+).

**Battle modes:**
- AI opponents with 5 difficulty tiers (Beginner through Legendary)
- Local 2-player PvP
- Online PvP via PeerJS with room codes
- 8 Kanto gym leaders with canon teams
- Elite Four gauntlet
- Battle Tower (streak-based)
- Battle Factory (rental Pokemon with swapping)
- Multi-round tournament brackets
- Hall of Fame for victorious teams

**Battle tools:**
- Full replay system with step-through viewer and export/import
- ELO ranked ladder with K-factor scaling (40/32/24)
- Challenge code sharing
- Battle history dashboard with win/loss stats
- Global leaderboards (Vercel KV)

### Type Analysis & Damage

Defensive/offensive type coverage matrix across your team. Weakness panel with threat identification. Side-by-side Pokemon stat comparison with radar charts. Speed tier chart. Damage calculator with min/max ranges. Damage matrix showing all team members vs common threats. Move pool browser with level-up, TM, and tutor sources. Evolution tree viewer.

### Wild Area

Tile-based regional maps for Kanto, Johto, Hoenn, and Sinnoh with random encounters. Gen 5+ catch formula with 14 ball types, Rust-calculated catch probability, and Canvas catch animations. Shiny rate at 1/4096. Day/night cycle and weather-based encounters.

**Wild features:**
- 30-slot PC Box with nicknames
- Day Care with breeding, IV/nature inheritance, and egg moves
- Evolution system (level-up, item, stone, trade)
- EV training areas and Move Tutor
- Safari Zone with limited encounters and escape chance
- Fossil Lab, Berry Farm, PokeMart
- Minigames: Voltorb Flip, Type Quiz, Slot Machine
- Wonder Trade and Link Cable trading (PeerJS P2P)
- Mystery Gift Pokemon
- Nuzlocke mode with permadeath tracking and graveyard

### Emulators

**GBA** (mgba-wasm) — Load .gba/.gbc/.gb ROMs. Gen 3 save file import with binary decryption and Pokemon extraction. Touch controls, remappable keybinds, IndexedDB save persistence.

**NDS** (melonDS RetroArch) — Load .nds ROMs. Dual-screen rendering, stylus emulation, keyboard and gamepad support.

**3DS** (Citrine) — Custom ARM11 interpreter with HLE kernel and .3dsx homebrew loader. 25 source files, 86 tests. In progress.

### Pokedex & Achievements

Full Pokedex with seen/caught tracking across all sources (wild catches, battle wins, GBA save imports). Habitat-based filtering, advanced search. 40+ achievements unlocked through gameplay. Stat dashboard: battles won, Pokemon caught, shinies found, ELO rating, gym badges earned.

### Platform (Vercel)

PokeAPI Edge proxy with global CDN caching (24h TTL). ISR Pokemon detail pages at `/pokemon/[name]` with dynamic OG images for social sharing. Blob storage for shareable trainer cards, replays, and challenge codes. KV (Redis) global leaderboards with input sanitization and rate limiting. Edge Config feature flags and announcement banners. Daily cron cache warming for Gen 1-3.

### Sharing

Share trainer cards as PNG images, battle replays, and challenge codes via permanent links. Each share gets a landing page with OG metadata for rich previews on Discord, Twitter, and other platforms. 30-day expiry with rate limiting.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS v4, Framer Motion |
| Compute | 10 Rust/WASM crates (~10K lines Rust) |
| Data | PokeAPI v2, TanStack React Query v5 |
| Caching | Vercel Edge CDN, in-memory Map cache |
| Storage | localStorage, IndexedDB, Vercel Blob, Vercel KV |
| Config | Vercel Edge Config (feature flags, announcements) |
| P2P | PeerJS (online battles & trading) |
| Audio | Web Audio API oscillators (no audio files) |
| Sprites | Programmatic Canvas pixel art (no external image assets) |
| Backend | NestJS, Prisma, PostgreSQL (multiplayer platform) |
| Auth | JWT RS256, argon2id, HttpOnly refresh cookies |
| Deploy | Vercel (frontend + edge), Railway (backend + database) |
| Testing | Vitest (522 tests), Rust (281 tests), Playwright (E2E) |

---

## Rust/WASM Crates

| Crate | Purpose |
|-------|---------|
| `pkmn-type-chart` | 18x18 type effectiveness matrix |
| `pkmn-stats` | HP and stat calculation formulas |
| `pkmn-damage` | Damage formula with STAB, weather, critical hits |
| `pkmn-catch-rate` | Gen 3+ catch probability formula |
| `pkmn-analysis` | Team type coverage analysis |
| `pkmn-breeding` | Egg IV/nature/gender inheritance |
| `pkmn-battle` | AI move selection and team generation |
| `pkmn-showdown` | Showdown paste format parser |
| `gen3-parser` | Gen 3 binary save file decryption and extraction |
| `citrine` | 3DS ARM11 interpreter with HLE kernel |

Every WASM module has a TypeScript wrapper (`src/utils/*Wasm.ts`) that lazy-loads the binary and falls back to a pure JS implementation if WASM fails.

---

## Architecture

```
src/
  app/                  Next.js App Router pages & API routes
    api/                10 API routes (proxy, share, leaderboard, OG, cron, config)
    pokemon/[name]/     ISR Pokemon detail pages with OG images
    share/[id]/         Share landing pages
  components/           131 React components
    battle/             Battle arena, facilities, replay viewer (29)
    wild/               Encounters, PC box, minigames, trading (38)
    explore/            Tile-based map renderer (7)
    gba/                GBA emulator UI (3)
    nds/                NDS emulator UI (2)
    ctr/                3DS emulator UI (2)
    emulator/           Unified emulator tab
  hooks/                45 custom hooks
  utils/                80+ utility modules (~8K lines)
  data/                 35 data files (abilities, natures, gym leaders, maps)
  lib/                  Vercel platform helpers (blob, kv, edge-config)
  types/                TypeScript type definitions
  contexts/             React contexts (achievements, pokedex, feature flags)
rust/                   10 Rust/WASM crates (~10K lines)
  citrine/              3DS emulator core (25 source files)
server/                 NestJS multiplayer backend
  src/
    auth/               JWT RS256 authentication
    users/              User management
    teams/              Team persistence
    prisma/             Database schema & migrations
public/
  wasm/                 10 compiled WASM binaries
```

---

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests (522 TypeScript + 281 Rust)
npm run test:run
cd rust && cargo test --all

# Build WASM crates (requires Rust + wasm-pack)
npm run build:wasm

# E2E tests
npm run test:e2e
```

### Multiplayer Backend (Optional)

```bash
cd server
npm install
cp .env.example .env
# Generate RSA keys (see server/.env.example)
npx prisma migrate dev
npm run start:dev
```

Or run both together:

```bash
npm run dev:all
```

### Environment Variables

For Vercel deployment:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | App base URL |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage |
| `KV_REST_API_URL` | Vercel KV endpoint |
| `KV_REST_API_TOKEN` | Vercel KV auth |
| `EDGE_CONFIG` | Vercel Edge Config connection |
| `CRON_SECRET` | Cron route authorization |

---

## Scale

| Metric | Value |
|--------|-------|
| Source files | 251 |
| TypeScript | ~40K lines |
| Rust | ~10K lines |
| Components | 131 |
| Hooks | 45 |
| WASM crates | 10 |
| API routes | 10 |
| Tests | 522 TS + 281 Rust |
| Pokemon supported | 1,025 (all 9 generations) |
| Regions | 4 (Kanto, Johto, Hoenn, Sinnoh) |
| Battle facilities | 5 (Gym, E4, Tower, Factory, Tournament) |
| Ball types | 14 |
| Held items | 50+ |
| Abilities | 100+ |
| Achievements | 40+ |
| Minigames | 3 (Voltorb Flip, Type Quiz, Slot Machine) |

---

## License

This project is for educational and portfolio purposes. Pokemon is a trademark of Nintendo/Game Freak/The Pokemon Company. No ROMs or copyrighted assets are included or distributed.
