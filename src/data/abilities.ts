import { BattlePokemon, TypeName, WeatherType, StatusCondition } from "@/types";

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
  }) => IncomingDamageResult | null;

  /** Modify the attack stat during damage calc */
  modifyAttackStat?: (context: {
    attacker: BattlePokemon;
    movePower: number;
    isPhysical: boolean;
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

  /** Check if this ability traps the opponent (Arena Trap, Shadow Tag, Magnet Pull) */
  onTrapping?: (context: {
    pokemon: BattlePokemon;
    opponent: BattlePokemon;
  }) => boolean; // true = opponent is trapped
}

// --- Result Types ---

export interface SwitchInResult {
  type: "stat_drop" | "weather";
  // stat_drop (Intimidate)
  stat?: "attack" | "spAtk";
  stages?: number;
  target?: "opponent";
  // weather (Drizzle, Drought, etc.)
  weather?: WeatherType;
  weatherTurns?: number;
  message?: string;
}

export interface IncomingDamageResult {
  multiplier: number; // 0 = immune, 0.5 = halved, etc.
  healInstead?: boolean; // Water Absorb, Volt Absorb
  message?: string;
  flashFireBoost?: boolean; // Flash Fire special case
}

export interface StatBoostResult {
  stat: "attack" | "spAtk" | "speed" | "best";
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
    modifyAttackStat: ({ attacker }) => {
      // Iron Fist boosts punching moves — we check via move name patterns
      const punchMoves = [
        "thunder-punch", "ice-punch", "fire-punch", "drain-punch",
        "mach-punch", "mega-punch", "focus-punch", "sky-uppercut",
        "comet-punch", "shadow-punch", "bullet-punch", "hammer-arm",
        "power-up-punch", "plasma-fists", "meteor-mash",
      ];
      const lastMove = attacker.lastMoveUsed;
      if (lastMove && punchMoves.includes(lastMove)) return 1.2;
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

  filter: {
    modifyIncomingDamage: ({ defender, attacker, moveType }) => {
      // Applied in damage calc based on type effectiveness, but we use a flat 0.75x for SE here
      return null; // Handled via damage calc to check effectiveness
    },
  },

  "solid-rock": {
    modifyIncomingDamage: ({ defender }) => {
      // Same as Filter — handled via damage calc
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
export function getHighestStat(pokemon: BattlePokemon): "attack" | "spAtk" | "speed" {
  const stats = pokemon.slot.pokemon.stats;
  const get = (name: string) => stats.find((s) => s.stat.name === name)?.base_stat ?? 0;
  const atk = get("attack");
  const spAtk = get("special-attack");
  const speed = get("speed");
  if (atk >= spAtk && atk >= speed) return "attack";
  if (spAtk >= atk && spAtk >= speed) return "spAtk";
  return "speed";
}
