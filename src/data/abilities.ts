import { BattlePokemon, TypeName, WeatherType, TerrainType, StatusCondition } from "@/types";

// --- Ability Hook Types ---

export interface AbilityHooks {
  /** Triggered when this Pokemon switches in */
  onSwitchIn?: (context: {
    pokemon: BattlePokemon;
    opponent: BattlePokemon;
  }) => SwitchInResult | null;

  /** Modify incoming damage — return 0 to nullify, a multiplier to scale, or null for no effect */
  modifyIncomingDamage?: (context: {
    defender: BattlePokemon;
    attacker: BattlePokemon;
    moveType: TypeName;
    movePower: number;
    isPhysical?: boolean;
  }) => IncomingDamageResult | null;

  /** Modify the attack stat during damage calc */
  modifyAttackStat?: (context: {
    attacker: BattlePokemon;
    movePower: number;
    isPhysical: boolean;
    moveName?: string;
  }) => number; // multiplier (1 = no change)

  /** Modify STAB multiplier */
  modifySTAB?: (context: {
    attacker: BattlePokemon;
    stab: number;
  }) => number;

  /** Prevent a status condition from being applied */
  preventStatus?: (context: {
    pokemon: BattlePokemon;
    status: StatusCondition;
  }) => boolean; // true = blocked

  /** Triggered after this Pokemon KOs an opponent */
  onAfterKO?: (context: {
    attacker: BattlePokemon;
  }) => StatBoostResult | null;

  /** Triggered at end of turn */
  onEndOfTurn?: (context: {
    pokemon: BattlePokemon;
  }) => EndOfTurnResult | null;

  /** Modify survival — can prevent OHKO (Sturdy) */
  modifySurvival?: (context: {
    pokemon: BattlePokemon;
    incomingDamage: number;
  }) => SurvivalResult | null;

  /** Prevent indirect damage (weather, status, hazards) */
  preventIndirectDamage?: boolean;

  /** Triggered when a stat is dropped by the opponent (Defiant, Competitive) */
  onStatDrop?: (context: {
    pokemon: BattlePokemon;
    stat: string;
    stages: number;
  }) => StatBoostResult | null;

  /** Triggered when this Pokemon switches out */
  onSwitchOut?: (context: {
    pokemon: BattlePokemon;
  }) => SwitchOutResult | null;

  /** Check if this ability traps the opponent (Arena Trap, Shadow Tag, Magnet Pull) */
  onTrapping?: (context: {
    pokemon: BattlePokemon;
    opponent: BattlePokemon;
  }) => boolean; // true = opponent is trapped

  /** Modify critical hit damage multiplier (Sniper: 1.5x → 2.25x) */
  modifyCritDamage?: number; // multiplier applied to crit damage (e.g. 2.25 for Sniper)

  /** Triggered when this Pokemon is hit by a contact move */
  onContact?: (context: {
    attacker: BattlePokemon;
    defender: BattlePokemon;
  }) => ContactResult | null;
}

// --- Result Types ---

export interface ContactResult {
  status: StatusCondition;
  chance: number; // 0-1 probability
  message?: string;
}

export interface SwitchInResult {
  type: "stat_drop" | "weather" | "terrain";
  // stat_drop (Intimidate)
  stat?: "attack" | "spAtk";
  stages?: number;
  target?: "opponent";
  // weather (Drizzle, Drought, etc.)
  weather?: WeatherType;
  weatherTurns?: number;
  // terrain (Electric Surge, Grassy Surge, etc.)
  terrain?: TerrainType;
  terrainTurns?: number;
  message?: string;
}

export interface IncomingDamageResult {
  multiplier: number; // 0 = immune, 0.5 = halved, etc.
  healInstead?: boolean; // Water Absorb, Volt Absorb
  message?: string;
  flashFireBoost?: boolean; // Flash Fire special case
  statBoost?: { stat: string; stages: number }; // Lightning Rod, Storm Drain
}

export interface StatBoostResult {
  stat: "attack" | "defense" | "spAtk" | "spDef" | "speed" | "best";
  stages: number;
  message?: string;
}

export interface EndOfTurnResult {
  type: "speed_boost" | "heal";
  // speed_boost
  stat?: "speed";
  stages?: number;
  // heal (Poison Heal)
  healFraction?: number; // e.g. 1/8
  condition?: StatusCondition; // only heals if this status is active
  message?: string;
}

export interface SurvivalResult {
  surviveWithHp: number; // 1 = Sturdy (survive at 1 HP)
  message?: string;
}

export interface SwitchOutResult {
  type: "heal" | "cure_status";
  healFraction?: number; // e.g. 1/3 for Regenerator
  message?: string;
}

// --- Ability Registry ---

const ABILITY_REGISTRY: Record<string, AbilityHooks> = {
  // === onSwitchIn abilities ===

  intimidate: {
    onSwitchIn: ({ pokemon }) => ({
      type: "stat_drop",
      stat: "attack",
      stages: -1,
      target: "opponent",
      message: `${pokemon.slot.pokemon.name}'s Intimidate cuts the opponent's Attack!`,
    }),
  },

  drizzle: {
    onSwitchIn: ({ pokemon }) => ({
      type: "weather",
      weather: "rain",
      weatherTurns: 5,
      message: `${pokemon.slot.pokemon.name}'s Drizzle made it rain!`,
    }),
  },

  drought: {
    onSwitchIn: ({ pokemon }) => ({
      type: "weather",
      weather: "sun",
      weatherTurns: 5,
      message: `${pokemon.slot.pokemon.name}'s Drought intensified the sun!`,
    }),
  },

  "sand-stream": {
    onSwitchIn: ({ pokemon }) => ({
      type: "weather",
      weather: "sandstorm",
      weatherTurns: 5,
      message: `${pokemon.slot.pokemon.name}'s Sand Stream whipped up a sandstorm!`,
    }),
  },

  "snow-warning": {
    onSwitchIn: ({ pokemon }) => ({
      type: "weather",
      weather: "hail",
      weatherTurns: 5,
      message: `${pokemon.slot.pokemon.name}'s Snow Warning made it hail!`,
    }),
  },

  // === modifyIncomingDamage abilities ===

  levitate: {
    modifyIncomingDamage: ({ moveType }) => {
      if (moveType === "ground") {
        return { multiplier: 0, message: "It doesn't affect the Pokemon due to Levitate!" };
      }
      return null;
    },
  },

  "flash-fire": {
    modifyIncomingDamage: ({ moveType, defender }) => {
      if (moveType === "fire") {
        return {
          multiplier: 0,
          flashFireBoost: true,
          message: `${defender.slot.pokemon.name}'s Flash Fire powered up its Fire-type moves!`,
        };
      }
      return null;
    },
  },

  "water-absorb": {
    modifyIncomingDamage: ({ moveType, defender }) => {
      if (moveType === "water") {
        return {
          multiplier: 0,
          healInstead: true,
          message: `${defender.slot.pokemon.name}'s Water Absorb restored HP!`,
        };
      }
      return null;
    },
  },

  "volt-absorb": {
    modifyIncomingDamage: ({ moveType, defender }) => {
      if (moveType === "electric") {
        return {
          multiplier: 0,
          healInstead: true,
          message: `${defender.slot.pokemon.name}'s Volt Absorb restored HP!`,
        };
      }
      return null;
    },
  },

  "lightning-rod": {
    modifyIncomingDamage: ({ moveType, defender }) => {
      if (moveType === "electric") {
        return {
          multiplier: 0,
          statBoost: { stat: "spAtk", stages: 1 },
          message: `${defender.slot.pokemon.name}'s Lightning Rod drew in the move!`,
        };
      }
      return null;
    },
  },

  "storm-drain": {
    modifyIncomingDamage: ({ moveType, defender }) => {
      if (moveType === "water") {
        return {
          multiplier: 0,
          statBoost: { stat: "spAtk", stages: 1 },
          message: `${defender.slot.pokemon.name}'s Storm Drain drew in the move!`,
        };
      }
      return null;
    },
  },

  multiscale: {
    modifyIncomingDamage: ({ defender }) => {
      if (defender.currentHp === defender.maxHp) {
        return { multiplier: 0.5, message: `${defender.slot.pokemon.name}'s Multiscale halved the damage!` };
      }
      return null;
    },
  },

  // === modifyAttackStat abilities ===

  "huge-power": {
    modifyAttackStat: ({ isPhysical }) => isPhysical ? 2 : 1,
  },

  "pure-power": {
    modifyAttackStat: ({ isPhysical }) => isPhysical ? 2 : 1,
  },

  guts: {
    modifyAttackStat: ({ attacker, isPhysical }) => {
      if (attacker.status && isPhysical) return 1.5;
      return 1;
    },
  },

  technician: {
    modifyAttackStat: ({ movePower }) => {
      if (movePower <= 60) return 1.5;
      return 1;
    },
  },

  "iron-fist": {
    modifyAttackStat: ({ moveName }) => {
      // Iron Fist boosts punching moves — we check via move name patterns
      const punchMoves = [
        "thunder-punch", "ice-punch", "fire-punch", "drain-punch",
        "mach-punch", "mega-punch", "focus-punch", "sky-uppercut",
        "comet-punch", "shadow-punch", "bullet-punch", "hammer-arm",
        "power-up-punch", "plasma-fists", "surging-strikes",
        "wicked-blow", "rage-fist", "jet-punch",
      ];
      if (moveName && punchMoves.includes(moveName)) return 1.2;
      return 1;
    },
  },

  // === modifySTAB abilities ===

  adaptability: {
    modifySTAB: ({ stab }) => {
      if (stab === 1.5) return 2; // Boost regular STAB from 1.5x to 2x
      if (stab === 2) return 2.25; // Boost Tera double-STAB slightly
      return stab;
    },
  },

  // === preventStatus abilities ===

  immunity: {
    preventStatus: ({ status }) => status === "poison" || status === "toxic",
  },

  insomnia: {
    preventStatus: ({ status }) => status === "sleep",
  },

  "vital-spirit": {
    preventStatus: ({ status }) => status === "sleep",
  },

  limber: {
    preventStatus: ({ status }) => status === "paralyze",
  },

  "magma-armor": {
    preventStatus: ({ status }) => status === "freeze",
  },

  "water-veil": {
    preventStatus: ({ status }) => status === "burn",
  },

  // === onAfterKO abilities ===

  moxie: {
    onAfterKO: ({ attacker }) => ({
      stat: "attack",
      stages: 1,
      message: `${attacker.slot.pokemon.name}'s Moxie raised its Attack!`,
    }),
  },

  "beast-boost": {
    onAfterKO: ({ attacker }) => ({
      stat: "best", // boost highest stat
      stages: 1,
      message: `${attacker.slot.pokemon.name}'s Beast Boost raised its stats!`,
    }),
  },

  // === onEndOfTurn abilities ===

  "speed-boost": {
    onEndOfTurn: ({ pokemon }) => ({
      type: "speed_boost",
      stat: "speed",
      stages: 1,
      message: `${pokemon.slot.pokemon.name}'s Speed Boost raised its Speed!`,
    }),
  },

  "poison-heal": {
    onEndOfTurn: ({ pokemon }) => {
      if (pokemon.status === "poison" || pokemon.status === "toxic") {
        return {
          type: "heal",
          healFraction: 1 / 8,
          condition: pokemon.status,
          message: `${pokemon.slot.pokemon.name} restored HP with Poison Heal!`,
        };
      }
      return null;
    },
    preventIndirectDamage: false, // Poison Heal replaces poison damage, handled in onEndOfTurn
  },

  // === modifySurvival abilities ===

  sturdy: {
    modifySurvival: ({ pokemon, incomingDamage }) => {
      if (pokemon.currentHp === pokemon.maxHp && incomingDamage >= pokemon.currentHp) {
        return {
          surviveWithHp: 1,
          message: `${pokemon.slot.pokemon.name} endured the hit with Sturdy!`,
        };
      }
      return null;
    },
  },

  // === preventIndirectDamage abilities ===

  "magic-guard": {
    preventIndirectDamage: true,
  },

  // === modifyIncomingDamage — damage reduction abilities ===

  "thick-fat": {
    modifyIncomingDamage: ({ moveType, defender }) => {
      if (moveType === "fire" || moveType === "ice") {
        return { multiplier: 0.5, message: `${defender.slot.pokemon.name}'s Thick Fat weakened the attack!` };
      }
      return null;
    },
  },

  // === onStatDrop abilities (Defiant, Competitive) ===

  defiant: {
    onStatDrop: ({ pokemon }) => ({
      stat: "attack",
      stages: 2,
      message: `${pokemon.slot.pokemon.name}'s Defiant sharply raised its Attack!`,
    }),
  },

  competitive: {
    onStatDrop: ({ pokemon }) => ({
      stat: "spAtk",
      stages: 2,
      message: `${pokemon.slot.pokemon.name}'s Competitive sharply raised its Sp. Atk!`,
    }),
  },

  // === onTrapping abilities ===

  "arena-trap": {
    onTrapping: ({ opponent }) => {
      const oppTypes = opponent.slot.pokemon.types.map(t => t.type.name);
      // Flying types and Levitate are immune to trapping
      if (oppTypes.includes("flying")) return false;
      if (oppTypes.includes("ghost")) return false;
      const oppAbility = opponent.slot.ability?.toLowerCase().replace(/\s+/g, "-");
      if (oppAbility === "levitate") return false;
      return true;
    },
  },

  "shadow-tag": {
    onTrapping: ({ opponent }) => {
      const oppTypes = opponent.slot.pokemon.types.map(t => t.type.name);
      if (oppTypes.includes("ghost")) return false;
      const oppAbility = opponent.slot.ability?.toLowerCase().replace(/\s+/g, "-");
      if (oppAbility === "shadow-tag") return false;
      return true;
    },
  },

  "magnet-pull": {
    onTrapping: ({ opponent }) => {
      const oppTypes = opponent.slot.pokemon.types.map(t => t.type.name);
      return oppTypes.includes("steel");
    },
  },

  // === Additional common abilities ===

  // === Critical hit abilities ===

  "super-luck": {
    // Crit stage +1 handled in getCritStage; no hooks needed here
  },

  sniper: {
    modifyCritDamage: 2.25, // Sniper: crit damage is 2.25x instead of 1.5x
  },

  // === Damage modifier abilities (modifyAttackStat as power proxy) ===

  "sheer-force": {
    // 1.3x power on moves with secondary effects; secondary effect removal + Life Orb recoil skip
    // handled in battleExecutionDamage.ts applySecondaryEffects and applyRecoilDrain
    modifyAttackStat: ({ moveName }) => {
      const SECONDARY_EFFECT_MOVES = [
        "flamethrower", "ice-beam", "thunderbolt", "psychic", "shadow-ball",
        "fire-blast", "blizzard", "thunder", "focus-blast", "sludge-bomb",
        "sludge-wave", "earth-power", "moonblast", "flash-cannon",
        "scald", "lava-plume", "discharge", "tri-attack", "ancient-power",
        "rock-slide", "iron-head", "air-slash", "zen-headbutt", "waterfall",
        "fire-punch", "ice-punch", "thunder-punch", "poison-jab", "crunch",
        "fire-fang", "ice-fang", "thunder-fang", "play-rough", "body-slam",
        "headbutt", "stomp", "bite", "snore", "icicle-crash",
        "rock-tomb", "liquidation", "darkest-lariat", "dragon-rush",
        "sky-attack", "needle-arm", "blaze-kick", "bounce", "fake-out",
      ];
      if (moveName && SECONDARY_EFFECT_MOVES.includes(moveName)) return 1.3;
      return 1;
    },
  },

  reckless: {
    modifyAttackStat: ({ moveName }) => {
      const RECOIL_MOVES = [
        "brave-bird", "flare-blitz", "double-edge", "wild-charge",
        "take-down", "submission", "head-smash", "wood-hammer",
        "volt-tackle", "wave-crash", "light-of-ruin", "head-charge",
      ];
      if (moveName && RECOIL_MOVES.includes(moveName)) return 1.2;
      return 1;
    },
  },

  "tough-claws": {
    modifyAttackStat: ({ moveName }) => {
      // Contact moves — comprehensive list of common physical contact moves
      const CONTACT_MOVES = [
        "tackle", "body-slam", "double-edge", "take-down", "headbutt",
        "slam", "stomp", "mega-kick", "jump-kick", "hi-jump-kick",
        "low-kick", "karate-chop", "submission", "seismic-toss",
        "scratch", "slash", "fury-swipes", "cut", "x-scissor",
        "aerial-ace", "wing-attack", "brave-bird", "drill-peck", "fly",
        "peck", "acrobatics", "bounce", "sky-attack", "pluck",
        "waterfall", "aqua-tail", "crabhammer", "liquidation", "dive",
        "wave-crash", "flip-turn",
        "thunder-punch", "ice-punch", "fire-punch", "drain-punch",
        "mach-punch", "mega-punch", "focus-punch", "sky-uppercut",
        "shadow-punch", "bullet-punch", "hammer-arm", "power-up-punch",
        "close-combat", "superpower", "cross-chop",
        "crunch", "bite", "fire-fang", "ice-fang", "thunder-fang",
        "poison-fang", "psychic-fangs", "jaw-lock", "fishious-rend",
        "wild-charge", "volt-tackle", "spark", "nuzzle",
        "flare-blitz", "flame-charge", "blaze-kick", "fire-lash",
        "iron-head", "iron-tail", "meteor-mash", "steel-wing", "smart-strike",
        "zen-headbutt", "psycho-cut", "heart-stamp",
        "poison-jab", "cross-poison", "gunk-shot",
        "earthquake", "bulldoze", "drill-run", "stomping-tantrum",
        "rock-slide", "stone-edge", "rock-tomb", "head-smash",
        "shadow-claw", "shadow-sneak", "phantom-force",
        "dragon-claw", "dragon-rush", "outrage", "dragon-tail",
        "wood-hammer", "leaf-blade", "power-whip", "seed-bomb",
        "u-turn", "leech-life", "bug-bite", "megahorn", "lunge",
        "play-rough", "spirit-break",
        "knock-off", "sucker-punch", "darkest-lariat", "throat-chop",
        "icicle-crash", "ice-shard", "triple-axel",
        "return", "frustration", "facade", "extreme-speed", "quick-attack",
        "fake-out", "rapid-spin", "covet", "thief",
      ];
      if (moveName && CONTACT_MOVES.includes(moveName)) return 1.33;
      return 1;
    },
  },

  analytic: {
    // 1.3x power if moving last — approximated via modifyAttackStat
    // TODO: Consumer needs to pass turn order info for accurate check;
    // for now always applies since AI moves second in most scenarios
    modifyAttackStat: () => 1.3,
  },

  "mega-launcher": {
    modifyAttackStat: ({ moveName }) => {
      const PULSE_MOVES = [
        "dark-pulse", "water-pulse", "aura-sphere", "dragon-pulse",
        "heal-pulse", "origin-pulse", "terrain-pulse",
      ];
      if (moveName && PULSE_MOVES.includes(moveName)) return 1.5;
      return 1;
    },
  },

  "strong-jaw": {
    modifyAttackStat: ({ moveName }) => {
      const BITE_MOVES = [
        "bite", "crunch", "fire-fang", "ice-fang", "thunder-fang",
        "poison-fang", "psychic-fangs", "jaw-lock", "fishious-rend",
        "hyper-fang",
      ];
      if (moveName && BITE_MOVES.includes(moveName)) return 1.5;
      return 1;
    },
  },

  // === Type immunity abilities (via modifyIncomingDamage) ===

  "sap-sipper": {
    modifyIncomingDamage: ({ moveType, defender }) => {
      if (moveType === "grass") {
        return {
          multiplier: 0,
          statBoost: { stat: "attack", stages: 1 },
          message: `${defender.slot.pokemon.name}'s Sap Sipper raised its Attack!`,
        };
      }
      return null;
    },
  },

  "motor-drive": {
    modifyIncomingDamage: ({ moveType, defender }) => {
      if (moveType === "electric") {
        return {
          multiplier: 0,
          statBoost: { stat: "speed", stages: 1 },
          message: `${defender.slot.pokemon.name}'s Motor Drive raised its Speed!`,
        };
      }
      return null;
    },
  },

  "dry-skin": {
    modifyIncomingDamage: ({ moveType, defender }) => {
      if (moveType === "water") {
        return {
          multiplier: 0,
          healInstead: true,
          message: `${defender.slot.pokemon.name}'s Dry Skin absorbed the water!`,
        };
      }
      // TODO: Fire takes 1.25x damage — consumer damage loop only handles multiplier < 1;
      // needs update to applyDamageLoop to also apply multiplier > 1
      return null;
    },
  },

  // === Defensive abilities (via modifyIncomingDamage) ===

  "solid-rock": {
    // Super-effective reduction handled in damage.ts (line 187-192)
    // Registered here for completeness — the damage.ts consumer reads defenderAbility directly
  },

  filter: {
    // Super-effective reduction handled in damage.ts (line 187-192)
  },

  "fur-coat": {
    // Doubles Defense — only halves physical damage
    modifyIncomingDamage: ({ defender, isPhysical }) => {
      if (isPhysical === true) {
        return { multiplier: 0.5, message: `${defender.slot.pokemon.name}'s Fur Coat softened the blow!` };
      }
      return null;
    },
  },

  "ice-scales": {
    // Doubles Special Defense — only halves special damage
    modifyIncomingDamage: ({ defender, isPhysical }) => {
      if (isPhysical === false) {
        return { multiplier: 0.5, message: `${defender.slot.pokemon.name}'s Ice Scales weakened the attack!` };
      }
      return null;
    },
  },

  // === On-Switch abilities (terrain setters) ===

  "electric-surge": {
    onSwitchIn: ({ pokemon }) => ({
      type: "terrain",
      terrain: "electric",
      terrainTurns: 5,
      message: `${pokemon.slot.pokemon.name}'s Electric Surge electrified the battlefield!`,
    }),
  },

  "grassy-surge": {
    onSwitchIn: ({ pokemon }) => ({
      type: "terrain",
      terrain: "grassy",
      terrainTurns: 5,
      message: `${pokemon.slot.pokemon.name}'s Grassy Surge covered the field in grass!`,
    }),
  },

  "misty-surge": {
    onSwitchIn: ({ pokemon }) => ({
      type: "terrain",
      terrain: "misty",
      terrainTurns: 5,
      message: `${pokemon.slot.pokemon.name}'s Misty Surge covered the field in mist!`,
    }),
  },

  "psychic-surge": {
    onSwitchIn: ({ pokemon }) => ({
      type: "terrain",
      terrain: "psychic",
      terrainTurns: 5,
      message: `${pokemon.slot.pokemon.name}'s Psychic Surge set Psychic Terrain!`,
    }),
  },

  // === onContact abilities ===

  static: {
    onContact: ({ defender }) => ({
      status: "paralyze",
      chance: 0.3,
      message: `${defender.slot.pokemon.name}'s Static paralyzed the attacker!`,
    }),
  },

  "flame-body": {
    onContact: ({ defender }) => ({
      status: "burn",
      chance: 0.3,
      message: `${defender.slot.pokemon.name}'s Flame Body burned the attacker!`,
    }),
  },

  // === Status/Utility abilities ===

  // Prankster: +1 priority to status moves (implemented in battleHelpers.ts getMovePriority)
  prankster: {},

  // Gale Wings: +1 priority to Flying moves at full HP (implemented in battleHelpers.ts getMovePriority)
  "gale-wings": {},

  // Triage: +3 priority to healing moves (implemented in battleHelpers.ts getMovePriority)
  triage: {},

  // Serene Grace: doubles secondary effect chance — handled in battleExecutionDamage.ts applySecondaryEffects
  "serene-grace": {},

  // Mold Breaker: ignores opponent's defensive abilities
  // TODO: Consumer in damage.ts and battleExecutionDamage.ts need to check attacker ability
  // and skip defender ability hooks when this is active
  "mold-breaker": {},

  // === Switch-out abilities ===

  regenerator: {
    onSwitchOut: ({ pokemon }) => ({
      type: "heal",
      healFraction: 1 / 3,
      message: `${pokemon.slot.pokemon.name}'s Regenerator restored its HP!`,
    }),
  },

  "natural-cure": {
    onSwitchOut: ({ pokemon }) => {
      if (pokemon.status) {
        return {
          type: "cure_status",
          message: `${pokemon.slot.pokemon.name}'s Natural Cure cured its status!`,
        };
      }
      return null;
    },
  },
};

// --- Public API ---

export function getAbilityHooks(abilityName: string | undefined | null): AbilityHooks | null {
  if (!abilityName) return null;
  // Normalize: PokeAPI uses kebab-case, display names use spaces
  const normalized = abilityName.toLowerCase().replace(/\s+/g, "-");
  return ABILITY_REGISTRY[normalized] ?? null;
}

export function hasAbility(pokemon: BattlePokemon, abilityName: string): boolean {
  const ability = pokemon.slot.ability?.toLowerCase().replace(/\s+/g, "-");
  return ability === abilityName.toLowerCase().replace(/\s+/g, "-");
}

/** Get the best stat for Beast Boost */
export function getHighestStat(pokemon: BattlePokemon): "attack" | "defense" | "spAtk" | "spDef" | "speed" {
  const stats = pokemon.slot.pokemon.stats;
  const get = (name: string) => stats.find((s) => s.stat.name === name)?.base_stat ?? 0;
  const candidates: { key: "attack" | "defense" | "spAtk" | "spDef" | "speed"; value: number }[] = [
    { key: "attack", value: get("attack") },
    { key: "defense", value: get("defense") },
    { key: "spAtk", value: get("special-attack") },
    { key: "spDef", value: get("special-defense") },
    { key: "speed", value: get("speed") },
  ];
  return candidates.reduce((best, c) => c.value > best.value ? c : best, candidates[0]).key;
}
