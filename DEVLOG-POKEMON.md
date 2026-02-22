# Professor Basil's Lab -- The Pokemon Experience

> From building teams to catching 'em all. Here's what you can actually do in this app and how it recreates the Pokemon experience in your browser.

---

## What Is This?

It's a Pokemon team builder that kept growing. You can build competitive teams, battle against an AI, catch wild Pokemon across four regions, run actual GBA games in your browser, and import your Pokemon from Gen 3 save files. Everything runs locally -- no accounts, no servers, no downloads. Just open it and play.

---

## Build Your Dream Team

Start by searching through all **1,025 Pokemon** from Generations 1 through 9. Every species ever created is here. Pick up to six for your team.

Once you've chosen your squad, customize each one:

- **Nature** -- All 25 natures with their stat boosts and drops. Want a Jolly Garchomp for that extra Speed? Adamant for max Attack? It's all here.
- **EVs and IVs** -- Fine-tune every stat. See exactly how your spreads affect the final numbers with the live stat calculator.
- **Abilities** -- Choose between available abilities for each species.
- **Held Items** -- 50+ items including Choice Band, Life Orb, Leftovers, Focus Sash, and all the Mega Stones.
- **Moves** -- Pick 4 moves from each Pokemon's full movepool.
- **Tera Type** -- Set a Tera type for Terastallization in battle.

The **type coverage matrix** shows your team's defensive gaps at a glance. Green means you resist it, red means you're weak. If every cell has at least one green, your team has no unresisted weaknesses. The **stat radar chart** overlays all six team members so you can see if you're skewing too physical or too special.

Share your team with anyone -- just copy the URL. It encodes your entire team, including all customizations.

---

## Battle Your Team

Take your team into battle against an AI opponent that builds its own team from ~80 competitive Pokemon. The AI picks sensible natures and EVs, and it actually thinks about its moves -- it scores each option by damage output, type matchups, and even considers switching when it's at a disadvantage.

### How battles work

The battle engine follows the real Pokemon rules:

- **Turn-based combat** -- Both sides pick an action, then speed determines who goes first. Switches always have priority.
- **Damage formula** -- The actual Gen III+ formula. STAB, type effectiveness, critical hits, the 0.85-1.0 random roll -- it's all there.
- **6 status conditions** -- Burn (halves Attack, chip damage), Paralysis (halves Speed, 25% full para), Poison (1/8 HP per turn), Toxic (escalating damage), Sleep (1-3 turns), Freeze (20% thaw chance).
- **Stat stages** -- Swords Dance gives +2 Attack, Calm Mind boosts Sp.Atk and Sp.Def. Stat changes range from -6 to +6, just like the games.
- **Weather** -- Sun boosts Fire and weakens Water. Rain does the opposite. Sandstorm and Hail deal chip damage to non-immune types.

### Pick your generational mechanic

Before each battle, choose one:

- **Mega Evolution** -- If your Pokemon is holding a Mega Stone, it can Mega Evolve for boosted stats, a potential new type, and a new ability. Lasts the entire battle.
- **Terastallization** -- Change your Pokemon's type to its Tera type. Keep STAB on your original types plus gain STAB on the Tera type. Defensive typing changes too.
- **Dynamax** -- Your Pokemon grows huge. HP doubles, all moves become Max Moves with powerful secondary effects (Max Airstream raises your Speed, Max Flare sets up sun). Lasts 3 turns.

Only one mechanic per team per battle, just like in the games.

### Battle Replays

Won an epic battle? Save the replay. You can watch it back later with play/pause, step forward/back, speed controls (1x/2x/4x), and a timeline scrubber. See how the battle played out turn by turn.

---

## Catch Wild Pokemon

Explore four full regions:

- **Kanto** -- Pallet Town, Route 1, Viridian Forest, Mt. Moon, Cerulean Cave...
- **Johto** -- New Bark Town, Route 29, Ilex Forest, Lake of Rage...
- **Hoenn** -- Route 101, Petalburg Woods, Meteor Falls...
- **Sinnoh** -- Route 201, Eterna Forest, Mt. Coronet...

Each area has its own encounter table with Pokemon at appropriate levels. Walk through grass, caves, or surf on water to find wild Pokemon.

### The catch formula

This uses the **real Gen V+ catch formula** from the games. Your odds depend on:

- The Pokemon's base capture rate (legendary = hard, common = easy)
- How much HP it has left (lower = better chance)
- Status conditions (Sleep and Freeze give 2.5x, Burn and Paralysis give 1.5x)
- Which ball you throw

### 14 Poke Ball types

Each ball has its own gimmick:

| Ball | Effect |
|------|--------|
| Poke Ball | Standard 1x rate |
| Great Ball | 1.5x rate |
| Ultra Ball | 2x rate |
| Master Ball | Never fails |
| Quick Ball | 5x on turn 1, then 1x |
| Dusk Ball | 3.5x at night or in caves |
| Net Ball | 3.5x against Bug or Water types |
| Timer Ball | Gets better each turn (up to 4x) |
| Nest Ball | Better against lower-level Pokemon |
| Repeat Ball | 3.5x if you've caught this species before |
| Dive Ball | 3.5x while surfing |
| Luxury Ball | Standard rate, friendship bonus |
| Premier Ball | Standard rate, looks cool |
| Heal Ball | Fully heals on catch |

The ball shakes up to 4 times. Each shake is an independent check. All four must pass, or the Pokemon breaks free. You can feel the tension on that third shake.

### Shiny Pokemon

Every encounter has a **1/4096** chance of being shiny. When it happens, you'll know.

### PC Box

Every Pokemon you catch goes into your PC Box. View your collection, nickname your catches, see where and when you caught each one.

---

## Play Actual GBA Games

There's a real Game Boy Advance emulator built into the app. It runs mGBA (one of the most accurate GBA emulators) compiled to WebAssembly.

- Load your own GBA ROMs
- Full save state support (4 slots)
- Speed controls (1x, 2x, 4x, 8x)
- On-screen controls for mobile
- Auto-saves every 30 seconds
- ROMs and saves persist between sessions

### Import Your Pokemon

Here's where it gets interesting. If you're playing a Gen 3 game (Ruby, Sapphire, Emerald, FireRed, or LeafGreen), you can **import your in-game Pokemon directly into the app**.

Hit "Import Pokemon" and the app reads your save file. It decrypts your party and PC boxes and pulls out every Pokemon with all their data intact:

- Species, nickname, and level
- All 6 IVs (the hidden stats)
- All 6 EVs (the trained stats)
- Held item
- Moves
- Which Poke Ball they were caught in
- Whether they're shiny
- Whether they're an egg

Your imported Pokemon appear in the PC box, marked as "GBA Import." They're added to your Pokedex and count toward achievements.

The parser understands the Gen 3 binary format -- the same proprietary encoding the Game Boy Advance uses. Your Pokemon's data is stored encrypted in the save file with their stats packed into individual bits. The parser decrypts everything and reads the data exactly as the GBA hardware would.

---

## Track Your Progress

### Pokedex

The Pokedex tracks all 1,025 Pokemon. Every species you encounter in the wild gets marked as "seen." Every Pokemon you catch or import gets marked as "caught." See your completion percentage and which ones you're still missing.

Three ways to fill it:
1. **Wild encounters** -- See a Pokemon in the wild
2. **Catching** -- Catch it with a Poke Ball
3. **GBA import** -- Import from your Gen 3 save file

### 23 Achievements

Achievements across five categories:

**Catching milestones:**
- First catch
- 10 catches, 50 catches
- Use every ball type
- Catch a shiny

**Battle milestones:**
- First win
- 10 wins
- Win streak of 5
- Win streak of 10

**Collection milestones:**
- Own 10 unique types
- Complete the Kanto Pokedex (all 151 original Pokemon)

**Exploration:**
- Import from a GBA save
- Export to Showdown format

---

## Share With the Community

### Pokemon Showdown Format

Export your team to **Pokemon Showdown** format -- the standard used by the competitive Pokemon community. The export generates a paste you can drop straight into Showdown's teambuilder:

```
Garchomp @ Life Orb
Ability: Rough Skin
Tera Type: Steel
EVs: 252 Atk / 252 Spe / 4 HP
Jolly Nature
IVs: 0 SpA
- Earthquake
- Outrage
- Swords Dance
- Stone Edge
```

You can also import Showdown teams. Paste a team, and the app builds it for you -- fetching all the Pokemon data, setting their EVs, IVs, natures, moves, and items automatically.

### URL Sharing

Every team configuration encodes into the URL. Copy the link, send it to a friend, and they'll see your exact team with all customizations intact.

---

## The GBA Aesthetic

The whole app looks like a GBA game. **Press Start 2P** font for headers (the classic Game Boy pixel font), **VT323** for body text. A GBA-faithful color palette with navy backgrounds, warm white text, and orange accents.

Pokemon sprites render with `pixelated` scaling -- crisp pixels at any size, no blurry smoothing. HP bars change from green to yellow to red as health drops, just like in the games.

---

## Everything Runs Locally

No account needed. No sign-up. No data sent anywhere. Your teams, caught Pokemon, achievements, and replays are stored in your browser's local storage. Your GBA ROMs and save files are stored in IndexedDB. Everything stays on your machine.

The only external calls are to **PokeAPI** -- the open Pokemon data API -- to fetch Pokemon stats, moves, and sprites. That data gets cached locally so repeat lookups are instant.
