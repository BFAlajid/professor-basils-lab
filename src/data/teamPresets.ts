export interface TeamPreset {
  name: string;
  description: string;
  format: string;
  showdownPaste: string;
}

export const TEAM_PRESETS: TeamPreset[] = [
  {
    name: "Sun Team",
    description:
      "A VGC sun-based team built around Koraidon's Orichalcum Pulse, with Torkoal for manual sun and Charizard as a secondary sun abuser. Supports with redirection and speed control.",
    format: "VGC 2024",
    showdownPaste: `Koraidon @ Assault Vest
Ability: Orichalcum Pulse
Level: 50
Tera Type: Fire
EVs: 4 HP / 252 Atk / 252 Spe
Jolly Nature
- Collision Course
- Flare Blitz
- Dragon Claw
- Close Combat

Torkoal @ Charcoal
Ability: Drought
Level: 50
Tera Type: Fire
EVs: 252 HP / 4 Def / 252 SpA
Quiet Nature
IVs: 0 Atk / 0 Spe
- Eruption
- Heat Wave
- Earth Power
- Protect

Charizard @ Choice Specs
Ability: Solar Power
Level: 50
Tera Type: Fire
EVs: 4 HP / 252 SpA / 252 Spe
Timid Nature
- Heat Wave
- Overheat
- Air Slash
- Focus Blast

Amoonguss @ Sitrus Berry
Ability: Regenerator
Level: 50
Tera Type: Steel
EVs: 252 HP / 172 Def / 84 SpD
Relaxed Nature
IVs: 0 Atk / 0 Spe
- Spore
- Rage Powder
- Pollen Puff
- Protect

Rillaboom @ Miracle Seed
Ability: Grassy Surge
Level: 50
Tera Type: Grass
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Grassy Glide
- Wood Hammer
- U-turn
- Fake Out

Incineroar @ Safety Goggles
Ability: Intimidate
Level: 50
Tera Type: Ghost
EVs: 252 HP / 4 Atk / 100 Def / 148 SpD / 4 Spe
Careful Nature
- Flare Blitz
- Knock Off
- Parting Shot
- Fake Out`,
  },
  {
    name: "Rain Team",
    description:
      "An OU rain offense team with Pelipper setting drizzle, Barraskewda and Urshifu-Rapid-Strike as swift swim and rain sweepers, supported by Ferrothorn and Zapdos for defensive balance.",
    format: "OU",
    showdownPaste: `Pelipper @ Damp Rock
Ability: Drizzle
Tera Type: Water
EVs: 248 HP / 252 Def / 8 SpA
Bold Nature
- Scald
- Hurricane
- U-turn
- Roost

Barraskewda @ Choice Band
Ability: Swift Swim
Tera Type: Water
EVs: 4 HP / 252 Atk / 252 Spe
Adamant Nature
- Liquidation
- Flip Turn
- Close Combat
- Aqua Jet

Urshifu-Rapid-Strike @ Choice Scarf
Ability: Unseen Fist
Tera Type: Water
EVs: 4 HP / 252 Atk / 252 Spe
Jolly Nature
- Surging Strikes
- Close Combat
- U-turn
- Aqua Jet

Ferrothorn @ Leftovers
Ability: Iron Barbs
Tera Type: Water
EVs: 252 HP / 24 Def / 232 SpD
Sassy Nature
IVs: 0 Spe
- Stealth Rock
- Leech Seed
- Power Whip
- Knock Off

Zapdos @ Heavy-Duty Boots
Ability: Static
Tera Type: Steel
EVs: 248 HP / 220 Def / 40 Spe
Bold Nature
- Discharge
- Hurricane
- Roost
- Volt Switch

Garchomp @ Rocky Helmet
Ability: Rough Skin
Tera Type: Steel
EVs: 252 HP / 4 Atk / 252 Spe
Jolly Nature
- Earthquake
- Dragon Tail
- Stealth Rock
- Toxic`,
  },
  {
    name: "Trick Room",
    description:
      "A VGC Trick Room team centered on Calyrex-Ice as the primary sweeper under Trick Room, with Indeedee-F providing Psychic Terrain and Follow Me support and Dusclops as the bulky setter.",
    format: "VGC 2024",
    showdownPaste: `Calyrex-Ice @ Clear Amulet
Ability: As One (Glastrier)
Level: 50
Tera Type: Ice
EVs: 252 HP / 252 Atk / 4 SpD
Brave Nature
IVs: 0 Spe
- Glacial Lance
- High Horsepower
- Close Combat
- Protect

Indeedee-F @ Psychic Seed
Ability: Psychic Surge
Level: 50
Tera Type: Ghost
EVs: 252 HP / 4 Def / 252 SpD
Sassy Nature
IVs: 0 Atk / 0 Spe
- Follow Me
- Helping Hand
- Psychic
- Protect

Dusclops @ Eviolite
Ability: Frisk
Level: 50
Tera Type: Dark
EVs: 252 HP / 4 Def / 252 SpD
Sassy Nature
IVs: 0 Atk / 0 Spe
- Trick Room
- Night Shade
- Pain Split
- Ally Switch

Torkoal @ Choice Specs
Ability: Drought
Level: 50
Tera Type: Grass
EVs: 252 HP / 252 SpA / 4 SpD
Quiet Nature
IVs: 0 Atk / 0 Spe
- Eruption
- Heat Wave
- Earth Power
- Solar Beam

Amoonguss @ Coba Berry
Ability: Regenerator
Level: 50
Tera Type: Steel
EVs: 252 HP / 116 Def / 140 SpD
Relaxed Nature
IVs: 0 Atk / 0 Spe
- Spore
- Rage Powder
- Pollen Puff
- Protect

Iron Hands @ Assault Vest
Ability: Quark Drive
Level: 50
Tera Type: Grass
EVs: 252 HP / 252 Atk / 4 SpD
Brave Nature
IVs: 0 Spe
- Drain Punch
- Wild Charge
- Ice Punch
- Fake Out`,
  },
  {
    name: "Hyper Offense",
    description:
      "An OU hyper offense team with Dragapult as the lead, Iron Valiant and Great Tusk as offensive pivots, and Gholdengo preventing hazard removal. Built for relentless pressure and momentum.",
    format: "OU",
    showdownPaste: `Dragapult @ Focus Sash
Ability: Infiltrator
Tera Type: Ghost
EVs: 4 Atk / 252 SpA / 252 Spe
Hasty Nature
- Draco Meteor
- Shadow Ball
- U-turn
- Dragon Darts

Iron Valiant @ Booster Energy
Ability: Quark Drive
Tera Type: Fairy
EVs: 4 Atk / 252 SpA / 252 Spe
Naive Nature
- Moonblast
- Close Combat
- Knock Off
- Thunderbolt

Great Tusk @ Leftovers
Ability: Protosynthesis
Tera Type: Steel
EVs: 252 Atk / 4 Def / 252 Spe
Jolly Nature
- Headlong Rush
- Close Combat
- Knock Off
- Rapid Spin

Gholdengo @ Air Balloon
Ability: Good as Gold
Tera Type: Fighting
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Make It Rain
- Shadow Ball
- Focus Blast
- Nasty Plot

Kingambit @ Black Glasses
Ability: Supreme Overlord
Tera Type: Dark
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Kowtow Cleave
- Sucker Punch
- Iron Head
- Swords Dance

Cinderace @ Heavy-Duty Boots
Ability: Libero
Tera Type: Ghost
EVs: 252 Atk / 4 Def / 252 Spe
Jolly Nature
- Pyro Ball
- High Jump Kick
- U-turn
- Sucker Punch`,
  },
  {
    name: "Balanced",
    description:
      "A well-rounded OU balance team built around Gliscor and Heatran as a defensive core, Rotom-Wash for momentum and coverage, and Garchomp as the primary offensive threat. Covers most matchups reliably.",
    format: "OU",
    showdownPaste: `Gliscor @ Toxic Orb
Ability: Poison Heal
Tera Type: Water
EVs: 244 HP / 8 Def / 200 SpD / 56 Spe
Careful Nature
- Earthquake
- Knock Off
- Toxic
- Protect

Heatran @ Leftovers
Ability: Flash Fire
Tera Type: Grass
EVs: 252 HP / 4 SpA / 252 SpD
Calm Nature
- Magma Storm
- Earth Power
- Stealth Rock
- Taunt

Rotom-Wash @ Choice Scarf
Ability: Levitate
Tera Type: Electric
EVs: 4 Def / 252 SpA / 252 Spe
Timid Nature
- Hydro Pump
- Volt Switch
- Trick
- Thunderbolt

Garchomp @ Loaded Dice
Ability: Rough Skin
Tera Type: Steel
EVs: 4 HP / 252 Atk / 252 Spe
Jolly Nature
- Scale Shot
- Earthquake
- Swords Dance
- Iron Head

Clefable @ Leftovers
Ability: Magic Guard
Tera Type: Steel
EVs: 252 HP / 252 Def / 4 SpA
Bold Nature
- Moonblast
- Soft-Boiled
- Thunder Wave
- Stealth Rock

Dragapult @ Choice Specs
Ability: Infiltrator
Tera Type: Ghost
EVs: 4 HP / 252 SpA / 252 Spe
Timid Nature
- Shadow Ball
- Draco Meteor
- Flamethrower
- U-turn`,
  },
];
