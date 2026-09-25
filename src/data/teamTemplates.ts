export interface TemplatePokemon {
  pokemonId: number;
  name: string;
  nature: string;
  evSpread: { hp: number; attack: number; defense: number; spAtk: number; spDef: number; speed: number };
  ability: string;
  heldItem: string;
  moves: string[];
}

export interface TeamTemplate {
  name: string;
  description: string;
  archetype: "rain" | "sun" | "trick-room" | "bulky-offense" | "hyper-offense" | "stall" | "sand" | "balanced";
  pokemon: TemplatePokemon[];
  showdownPaste: string;
}

function buildShowdownPaste(pokemon: TemplatePokemon[]): string {
  return pokemon
    .map((p) => {
      const evParts: string[] = [];
      if (p.evSpread.hp) evParts.push(`${p.evSpread.hp} HP`);
      if (p.evSpread.attack) evParts.push(`${p.evSpread.attack} Atk`);
      if (p.evSpread.defense) evParts.push(`${p.evSpread.defense} Def`);
      if (p.evSpread.spAtk) evParts.push(`${p.evSpread.spAtk} SpA`);
      if (p.evSpread.spDef) evParts.push(`${p.evSpread.spDef} SpD`);
      if (p.evSpread.speed) evParts.push(`${p.evSpread.speed} Spe`);
      const item = p.heldItem ? ` @ ${p.heldItem}` : "";
      const lines = [
        `${p.name}${item}`,
        `Ability: ${p.ability}`,
        `EVs: ${evParts.join(" / ")}`,
        `${p.nature} Nature`,
        ...p.moves.map((m) => `- ${m}`),
      ];
      return lines.join("\n");
    })
    .join("\n\n");
}

const RAIN_POKEMON: TemplatePokemon[] = [
  {
    pokemonId: 279, name: "Pelipper", nature: "Bold",
    evSpread: { hp: 248, attack: 0, defense: 252, spAtk: 8, spDef: 0, speed: 0 },
    ability: "Drizzle", heldItem: "Damp Rock",
    moves: ["Scald", "Hurricane", "U-turn", "Roost"],
  },
  {
    pokemonId: 230, name: "Kingdra", nature: "Modest",
    evSpread: { hp: 0, attack: 0, defense: 0, spAtk: 252, spDef: 4, speed: 252 },
    ability: "Swift Swim", heldItem: "Life Orb",
    moves: ["Hydro Pump", "Draco Meteor", "Hurricane", "Flip Turn"],
  },
  {
    pokemonId: 598, name: "Ferrothorn", nature: "Relaxed",
    evSpread: { hp: 252, attack: 0, defense: 88, spAtk: 0, spDef: 168, speed: 0 },
    ability: "Iron Barbs", heldItem: "Leftovers",
    moves: ["Stealth Rock", "Leech Seed", "Power Whip", "Knock Off"],
  },
  {
    pokemonId: 748, name: "Toxapex", nature: "Bold",
    evSpread: { hp: 252, attack: 0, defense: 252, spAtk: 0, spDef: 4, speed: 0 },
    ability: "Regenerator", heldItem: "Black Sludge",
    moves: ["Scald", "Recover", "Haze", "Toxic Spikes"],
  },
  {
    pokemonId: 145, name: "Zapdos", nature: "Bold",
    evSpread: { hp: 248, attack: 0, defense: 220, spAtk: 0, spDef: 0, speed: 40 },
    ability: "Static", heldItem: "Heavy-Duty Boots",
    moves: ["Discharge", "Hurricane", "Roost", "Volt Switch"],
  },
  {
    pokemonId: 530, name: "Excadrill", nature: "Jolly",
    evSpread: { hp: 0, attack: 252, defense: 4, spAtk: 0, spDef: 0, speed: 252 },
    ability: "Mold Breaker", heldItem: "Choice Scarf",
    moves: ["Earthquake", "Iron Head", "Rapid Spin", "Rock Slide"],
  },
];

const SUN_POKEMON: TemplatePokemon[] = [
  {
    pokemonId: 324, name: "Torkoal", nature: "Quiet",
    evSpread: { hp: 252, attack: 0, defense: 4, spAtk: 252, spDef: 0, speed: 0 },
    ability: "Drought", heldItem: "Charcoal",
    moves: ["Eruption", "Lava Plume", "Earth Power", "Stealth Rock"],
  },
  {
    pokemonId: 3, name: "Venusaur", nature: "Modest",
    evSpread: { hp: 0, attack: 0, defense: 0, spAtk: 252, spDef: 4, speed: 252 },
    ability: "Chlorophyll", heldItem: "Life Orb",
    moves: ["Growth", "Giga Drain", "Sludge Bomb", "Earth Power"],
  },
  {
    pokemonId: 485, name: "Heatran", nature: "Timid",
    evSpread: { hp: 0, attack: 0, defense: 0, spAtk: 252, spDef: 4, speed: 252 },
    ability: "Flash Fire", heldItem: "Air Balloon",
    moves: ["Magma Storm", "Earth Power", "Flash Cannon", "Taunt"],
  },
  {
    pokemonId: 445, name: "Garchomp", nature: "Jolly",
    evSpread: { hp: 0, attack: 252, defense: 4, spAtk: 0, spDef: 0, speed: 252 },
    ability: "Rough Skin", heldItem: "Rocky Helmet",
    moves: ["Earthquake", "Dragon Claw", "Stealth Rock", "Swords Dance"],
  },
  {
    pokemonId: 637, name: "Volcarona", nature: "Timid",
    evSpread: { hp: 0, attack: 0, defense: 0, spAtk: 252, spDef: 4, speed: 252 },
    ability: "Flame Body", heldItem: "Heavy-Duty Boots",
    moves: ["Quiver Dance", "Flamethrower", "Bug Buzz", "Giga Drain"],
  },
  {
    pokemonId: 248, name: "Tyranitar", nature: "Adamant",
    evSpread: { hp: 252, attack: 252, defense: 0, spAtk: 0, spDef: 4, speed: 0 },
    ability: "Sand Stream", heldItem: "Leftovers",
    moves: ["Stone Edge", "Crunch", "Earthquake", "Dragon Dance"],
  },
];

const TRICK_ROOM_POKEMON: TemplatePokemon[] = [
  {
    pokemonId: 233, name: "Porygon2", nature: "Sassy",
    evSpread: { hp: 252, attack: 0, defense: 4, spAtk: 0, spDef: 252, speed: 0 },
    ability: "Download", heldItem: "Eviolite",
    moves: ["Trick Room", "Ice Beam", "Thunderbolt", "Recover"],
  },
  {
    pokemonId: 534, name: "Conkeldurr", nature: "Brave",
    evSpread: { hp: 252, attack: 252, defense: 4, spAtk: 0, spDef: 0, speed: 0 },
    ability: "Guts", heldItem: "Flame Orb",
    moves: ["Close Combat", "Mach Punch", "Knock Off", "Facade"],
  },
  {
    pokemonId: 464, name: "Rhyperior", nature: "Brave",
    evSpread: { hp: 252, attack: 252, defense: 0, spAtk: 0, spDef: 4, speed: 0 },
    ability: "Solid Rock", heldItem: "Weakness Policy",
    moves: ["Earthquake", "Rock Blast", "Ice Punch", "Megahorn"],
  },
  {
    pokemonId: 324, name: "Torkoal", nature: "Quiet",
    evSpread: { hp: 252, attack: 0, defense: 4, spAtk: 252, spDef: 0, speed: 0 },
    ability: "Drought", heldItem: "Choice Specs",
    moves: ["Eruption", "Heat Wave", "Earth Power", "Solar Beam"],
  },
  {
    pokemonId: 858, name: "Hatterene", nature: "Quiet",
    evSpread: { hp: 252, attack: 0, defense: 4, spAtk: 252, spDef: 0, speed: 0 },
    ability: "Magic Bounce", heldItem: "Life Orb",
    moves: ["Trick Room", "Dazzling Gleam", "Psychic", "Mystical Fire"],
  },
  {
    pokemonId: 356, name: "Dusclops", nature: "Relaxed",
    evSpread: { hp: 252, attack: 0, defense: 252, spAtk: 0, spDef: 4, speed: 0 },
    ability: "Frisk", heldItem: "Eviolite",
    moves: ["Trick Room", "Night Shade", "Pain Split", "Will-O-Wisp"],
  },
];

const BULKY_OFFENSE_POKEMON: TemplatePokemon[] = [
  {
    pokemonId: 445, name: "Garchomp", nature: "Jolly",
    evSpread: { hp: 0, attack: 252, defense: 4, spAtk: 0, spDef: 0, speed: 252 },
    ability: "Rough Skin", heldItem: "Rocky Helmet",
    moves: ["Earthquake", "Dragon Claw", "Swords Dance", "Stealth Rock"],
  },
  {
    pokemonId: 479, name: "Rotom-Wash", nature: "Bold",
    evSpread: { hp: 252, attack: 0, defense: 212, spAtk: 0, spDef: 0, speed: 44 },
    ability: "Levitate", heldItem: "Leftovers",
    moves: ["Hydro Pump", "Volt Switch", "Will-O-Wisp", "Pain Split"],
  },
  {
    pokemonId: 598, name: "Ferrothorn", nature: "Relaxed",
    evSpread: { hp: 252, attack: 0, defense: 88, spAtk: 0, spDef: 168, speed: 0 },
    ability: "Iron Barbs", heldItem: "Leftovers",
    moves: ["Stealth Rock", "Leech Seed", "Power Whip", "Knock Off"],
  },
  {
    pokemonId: 485, name: "Heatran", nature: "Calm",
    evSpread: { hp: 252, attack: 0, defense: 0, spAtk: 4, spDef: 252, speed: 0 },
    ability: "Flash Fire", heldItem: "Leftovers",
    moves: ["Magma Storm", "Earth Power", "Stealth Rock", "Taunt"],
  },
  {
    pokemonId: 381, name: "Latios", nature: "Timid",
    evSpread: { hp: 0, attack: 0, defense: 0, spAtk: 252, spDef: 4, speed: 252 },
    ability: "Levitate", heldItem: "Choice Specs",
    moves: ["Draco Meteor", "Psychic", "Surf", "Trick"],
  },
  {
    pokemonId: 212, name: "Scizor", nature: "Adamant",
    evSpread: { hp: 248, attack: 252, defense: 0, spAtk: 0, spDef: 8, speed: 0 },
    ability: "Technician", heldItem: "Choice Band",
    moves: ["Bullet Punch", "U-turn", "Superpower", "Knock Off"],
  },
];

const HYPER_OFFENSE_POKEMON: TemplatePokemon[] = [
  {
    pokemonId: 482, name: "Azelf", nature: "Jolly",
    evSpread: { hp: 0, attack: 252, defense: 4, spAtk: 0, spDef: 0, speed: 252 },
    ability: "Levitate", heldItem: "Focus Sash",
    moves: ["Stealth Rock", "Explosion", "Taunt", "Knock Off"],
  },
  {
    pokemonId: 445, name: "Garchomp", nature: "Jolly",
    evSpread: { hp: 0, attack: 252, defense: 4, spAtk: 0, spDef: 0, speed: 252 },
    ability: "Rough Skin", heldItem: "Life Orb",
    moves: ["Earthquake", "Outrage", "Swords Dance", "Stone Edge"],
  },
  {
    pokemonId: 130, name: "Gyarados", nature: "Jolly",
    evSpread: { hp: 0, attack: 252, defense: 4, spAtk: 0, spDef: 0, speed: 252 },
    ability: "Intimidate", heldItem: "Leftovers",
    moves: ["Dragon Dance", "Waterfall", "Bounce", "Earthquake"],
  },
  {
    pokemonId: 448, name: "Lucario", nature: "Jolly",
    evSpread: { hp: 0, attack: 252, defense: 0, spAtk: 0, spDef: 4, speed: 252 },
    ability: "Justified", heldItem: "Life Orb",
    moves: ["Swords Dance", "Close Combat", "Bullet Punch", "Extreme Speed"],
  },
  {
    pokemonId: 94, name: "Gengar", nature: "Timid",
    evSpread: { hp: 0, attack: 0, defense: 0, spAtk: 252, spDef: 4, speed: 252 },
    ability: "Cursed Body", heldItem: "Choice Specs",
    moves: ["Shadow Ball", "Sludge Wave", "Focus Blast", "Trick"],
  },
  {
    pokemonId: 461, name: "Weavile", nature: "Jolly",
    evSpread: { hp: 0, attack: 252, defense: 4, spAtk: 0, spDef: 0, speed: 252 },
    ability: "Pressure", heldItem: "Choice Band",
    moves: ["Knock Off", "Triple Axel", "Ice Shard", "Low Kick"],
  },
];

const STALL_POKEMON: TemplatePokemon[] = [
  {
    pokemonId: 113, name: "Chansey", nature: "Bold",
    evSpread: { hp: 4, attack: 0, defense: 252, spAtk: 0, spDef: 252, speed: 0 },
    ability: "Natural Cure", heldItem: "Eviolite",
    moves: ["Soft-Boiled", "Seismic Toss", "Stealth Rock", "Thunder Wave"],
  },
  {
    pokemonId: 227, name: "Skarmory", nature: "Impish",
    evSpread: { hp: 252, attack: 0, defense: 252, spAtk: 0, spDef: 4, speed: 0 },
    ability: "Sturdy", heldItem: "Rocky Helmet",
    moves: ["Roost", "Whirlwind", "Spikes", "Body Press"],
  },
  {
    pokemonId: 195, name: "Quagsire", nature: "Relaxed",
    evSpread: { hp: 252, attack: 0, defense: 252, spAtk: 0, spDef: 4, speed: 0 },
    ability: "Unaware", heldItem: "Leftovers",
    moves: ["Scald", "Earthquake", "Recover", "Toxic"],
  },
  {
    pokemonId: 748, name: "Toxapex", nature: "Bold",
    evSpread: { hp: 252, attack: 0, defense: 252, spAtk: 0, spDef: 4, speed: 0 },
    ability: "Regenerator", heldItem: "Black Sludge",
    moves: ["Scald", "Recover", "Haze", "Toxic Spikes"],
  },
  {
    pokemonId: 36, name: "Clefable", nature: "Bold",
    evSpread: { hp: 252, attack: 0, defense: 252, spAtk: 4, spDef: 0, speed: 0 },
    ability: "Magic Guard", heldItem: "Leftovers",
    moves: ["Moonblast", "Wish", "Protect", "Heal Bell"],
  },
  {
    pokemonId: 302, name: "Sableye", nature: "Careful",
    evSpread: { hp: 252, attack: 0, defense: 4, spAtk: 0, spDef: 252, speed: 0 },
    ability: "Prankster", heldItem: "Leftovers",
    moves: ["Will-O-Wisp", "Knock Off", "Recover", "Foul Play"],
  },
];

const SAND_POKEMON: TemplatePokemon[] = [
  {
    pokemonId: 248, name: "Tyranitar", nature: "Adamant",
    evSpread: { hp: 252, attack: 252, defense: 0, spAtk: 0, spDef: 4, speed: 0 },
    ability: "Sand Stream", heldItem: "Leftovers",
    moves: ["Stone Edge", "Crunch", "Earthquake", "Stealth Rock"],
  },
  {
    pokemonId: 530, name: "Excadrill", nature: "Adamant",
    evSpread: { hp: 0, attack: 252, defense: 4, spAtk: 0, spDef: 0, speed: 252 },
    ability: "Sand Rush", heldItem: "Life Orb",
    moves: ["Earthquake", "Iron Head", "Rock Slide", "Swords Dance"],
  },
  {
    pokemonId: 445, name: "Garchomp", nature: "Jolly",
    evSpread: { hp: 0, attack: 252, defense: 4, spAtk: 0, spDef: 0, speed: 252 },
    ability: "Rough Skin", heldItem: "Rocky Helmet",
    moves: ["Earthquake", "Dragon Claw", "Fire Fang", "Swords Dance"],
  },
  {
    pokemonId: 479, name: "Rotom-Wash", nature: "Bold",
    evSpread: { hp: 252, attack: 0, defense: 212, spAtk: 0, spDef: 0, speed: 44 },
    ability: "Levitate", heldItem: "Leftovers",
    moves: ["Hydro Pump", "Volt Switch", "Will-O-Wisp", "Pain Split"],
  },
  {
    pokemonId: 598, name: "Ferrothorn", nature: "Relaxed",
    evSpread: { hp: 252, attack: 0, defense: 88, spAtk: 0, spDef: 168, speed: 0 },
    ability: "Iron Barbs", heldItem: "Leftovers",
    moves: ["Spikes", "Leech Seed", "Power Whip", "Knock Off"],
  },
  {
    pokemonId: 227, name: "Skarmory", nature: "Impish",
    evSpread: { hp: 252, attack: 0, defense: 252, spAtk: 0, spDef: 4, speed: 0 },
    ability: "Sturdy", heldItem: "Rocky Helmet",
    moves: ["Roost", "Whirlwind", "Spikes", "Body Press"],
  },
];

const BALANCED_POKEMON: TemplatePokemon[] = [
  {
    pokemonId: 248, name: "Tyranitar", nature: "Careful",
    evSpread: { hp: 252, attack: 0, defense: 0, spAtk: 0, spDef: 252, speed: 4 },
    ability: "Sand Stream", heldItem: "Leftovers",
    moves: ["Stealth Rock", "Stone Edge", "Crunch", "Earthquake"],
  },
  {
    pokemonId: 445, name: "Garchomp", nature: "Jolly",
    evSpread: { hp: 0, attack: 252, defense: 4, spAtk: 0, spDef: 0, speed: 252 },
    ability: "Rough Skin", heldItem: "Life Orb",
    moves: ["Earthquake", "Outrage", "Swords Dance", "Stone Edge"],
  },
  {
    pokemonId: 479, name: "Rotom-Wash", nature: "Bold",
    evSpread: { hp: 252, attack: 0, defense: 216, spAtk: 0, spDef: 0, speed: 40 },
    ability: "Levitate", heldItem: "Leftovers",
    moves: ["Hydro Pump", "Volt Switch", "Will-O-Wisp", "Pain Split"],
  },
  {
    pokemonId: 212, name: "Scizor", nature: "Adamant",
    evSpread: { hp: 248, attack: 252, defense: 0, spAtk: 0, spDef: 8, speed: 0 },
    ability: "Technician", heldItem: "Choice Band",
    moves: ["Bullet Punch", "U-turn", "Superpower", "Knock Off"],
  },
  {
    pokemonId: 380, name: "Latias", nature: "Timid",
    evSpread: { hp: 252, attack: 0, defense: 0, spAtk: 4, spDef: 0, speed: 252 },
    ability: "Levitate", heldItem: "Leftovers",
    moves: ["Calm Mind", "Psyshock", "Draining Kiss", "Roost"],
  },
  {
    pokemonId: 485, name: "Heatran", nature: "Calm",
    evSpread: { hp: 252, attack: 0, defense: 0, spAtk: 4, spDef: 252, speed: 0 },
    ability: "Flash Fire", heldItem: "Leftovers",
    moves: ["Magma Storm", "Earth Power", "Taunt", "Toxic"],
  },
];

function makeTemplate(
  name: string,
  description: string,
  archetype: TeamTemplate["archetype"],
  pokemon: TemplatePokemon[],
): TeamTemplate {
  return { name, description, archetype, pokemon, showdownPaste: buildShowdownPaste(pokemon) };
}

export const TEAM_TEMPLATES: TeamTemplate[] = [
  makeTemplate(
    "Rain Team",
    "Pelipper sets rain for Kingdra to sweep with Swift Swim-boosted Hydro Pumps. Ferrothorn and Toxapex form a defensive backbone that thrives under rain, while Zapdos provides pivoting and Excadrill handles Steel-types.",
    "rain",
    RAIN_POKEMON,
  ),
  makeTemplate(
    "Sun Team",
    "Torkoal brings the sun for Venusaur to outspeed everything with Chlorophyll. Heatran and Volcarona hit hard under sunlight, Garchomp sets rocks and pressures teams, while Tyranitar offers a weather-changing pivot.",
    "sun",
    SUN_POKEMON,
  ),
  makeTemplate(
    "Trick Room",
    "Porygon2 and Dusclops set Trick Room reliably with Eviolite bulk. Conkeldurr, Rhyperior, and Torkoal devastate under reversed speed. Hatterene provides a secondary setter with Magic Bounce to block hazards and status.",
    "trick-room",
    TRICK_ROOM_POKEMON,
  ),
  makeTemplate(
    "Bulky Offense",
    "Garchomp leads the offensive charge backed by Ferrothorn and Heatran forming a sturdy defensive core. Rotom-Wash provides pivoting and status, Latios hits hard with Specs, and Scizor cleans with priority Bullet Punch.",
    "bulky-offense",
    BULKY_OFFENSE_POKEMON,
  ),
  makeTemplate(
    "Hyper Offense",
    "Azelf leads with Stealth Rock and Taunt then explodes. Garchomp and Gyarados set up and sweep, Lucario provides priority, Gengar punishes switch-ins with Specs, and Weavile pursuit-traps Psychic and Ghost types.",
    "hyper-offense",
    HYPER_OFFENSE_POKEMON,
  ),
  makeTemplate(
    "Stall",
    "Chansey walls special attackers, Skarmory handles physical threats with Spikes and Whirlwind. Quagsire stops setup sweepers with Unaware. Toxapex spreads poison, Clefable provides Wish support, and Sableye burns threats with Prankster.",
    "stall",
    STALL_POKEMON,
  ),
  makeTemplate(
    "Sand Team",
    "Tyranitar summons sandstorm boosting its Special Defense while Excadrill doubles its Speed with Sand Rush. Garchomp adds offensive pressure, Rotom-Wash covers Water weaknesses, and Ferrothorn plus Skarmory stack entry hazards.",
    "sand",
    SAND_POKEMON,
  ),
  makeTemplate(
    "Balanced",
    "A classic OU balance core with Tyranitar setting rocks and tanking special hits, Garchomp as the primary sweeper, and Rotom-Wash for defensive pivoting. Scizor revenge-kills, Latias provides Calm Mind wincon, and Heatran traps Steel-types.",
    "balanced",
    BALANCED_POKEMON,
  ),
];
