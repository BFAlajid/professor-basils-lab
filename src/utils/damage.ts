import { Pokemon, Move, BaseStats, EVSpread, IVSpread, Nature, StatusCondition, TypeName, WeatherType, BattlePokemon } from "@/types";
import { getDefensiveMultiplier } from "@/data/typeChart";
import { calculateAllStats, CalculatedStats, DEFAULT_EVS, DEFAULT_IVS } from "./stats";
import { getHeldItem } from "@/data/heldItems";
import { getAbilityHooks } from "@/data/abilities";
import { isNFE } from "@/data/nfeList";

export function extractBaseStats(pokemon: Pokemon): BaseStats {
  const get = (name: string) =>
    pokemon.stats.find((s) => s.stat.name === name)?.base_stat ?? 0;
  return {
    hp: get("hp"),
    attack: get("attack"),
    defense: get("defense"),
    spAtk: get("special-attack"),
    spDef: get("special-defense"),
    speed: get("speed"),
  };
}

export interface DamageCalcOptions {
  attackerEvs?: EVSpread;
  attackerIvs?: IVSpread;
  attackerNature?: Nature | null;
  attackerItem?: string | null;
  attackerStatus?: StatusCondition;
  defenderEvs?: EVSpread;
  defenderIvs?: IVSpread;
  defenderNature?: Nature | null;
  defenderItem?: string | null;
  isCritical?: boolean;
  attackerStatStage?: number;
  defenderStatStage?: number;
  // Generational mechanic extensions
  attackerEffectiveTypes?: TypeName[];
  defenderEffectiveTypes?: TypeName[];
  attackerOriginalTypes?: TypeName[];
  isTerastallized?: boolean;
  fieldWeather?: WeatherType | null;
  fieldTerrain?: "electric" | "grassy" | "misty" | "psychic" | null;
  defenderSideReflect?: boolean;
  defenderSideLightScreen?: boolean;
  activeStatOverride?: BaseStats | null;
  attackerAbility?: string | null;
  defenderAbility?: string | null;
  attackerBattlePokemon?: BattlePokemon;
}

export interface DamageResult {
  min: number;
  max: number;
  effectiveness: number;
  stab: boolean;
  isCritical: boolean;
}

export function calculateDamage(
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  options?: DamageCalcOptions
): DamageResult {
  if (move.power === null || move.damage_class.name === "status") {
    return { min: 0, max: 0, effectiveness: 1, stab: false, isCritical: false };
  }

  const isCritical = options?.isCritical ?? false;
  const isPhysical = move.damage_class.name === "physical";

  let atk: number;
  let def: number;

  if (options && (options.attackerEvs || options.attackerNature || options.defenderEvs || options.defenderNature)) {
    // Use calculated stats with EVs/IVs/Nature
    const attackerBase = extractBaseStats(attacker);
    const defenderBase = extractBaseStats(defender);

    const attackerCalc = calculateAllStats(
      attackerBase,
      options.attackerIvs ?? DEFAULT_IVS,
      options.attackerEvs ?? DEFAULT_EVS,
      options.attackerNature ?? null
    );
    const defenderCalc = calculateAllStats(
      defenderBase,
      options.defenderIvs ?? DEFAULT_IVS,
      options.defenderEvs ?? DEFAULT_EVS,
      options.defenderNature ?? null
    );

    atk = isPhysical ? attackerCalc.attack : attackerCalc.spAtk;
    def = isPhysical ? defenderCalc.defense : defenderCalc.spDef;

    // Apply stat stages
    if (options.attackerStatStage) {
      atk = applyStatStage(atk, isCritical ? Math.max(0, options.attackerStatStage) : options.attackerStatStage);
    }
    if (options.defenderStatStage) {
      def = applyStatStage(def, isCritical ? Math.min(0, options.defenderStatStage) : options.defenderStatStage);
    }

    // Apply assault vest boost to SpDef
    if (options.defenderItem && !isPhysical) {
      const defItem = getHeldItem(options.defenderItem);
      if (defItem?.battleModifier?.type === "stat_boost" && defItem.battleModifier.condition === "spDef") {
        def = Math.floor(def * (defItem.battleModifier.value ?? 1));
      }
    }

    // Eviolite: +50% Def and SpDef for non-fully-evolved Pokemon
    if (options.defenderItem === "eviolite" && defender) {
      if (isNFE(defender.id)) {
        def = Math.floor(def * 1.5);
      }
    }
  } else {
    // Fallback to raw base stats (backward compatible)
    const attackerStats = extractBaseStats(attacker);
    const defenderStats = extractBaseStats(defender);
    atk = isPhysical ? attackerStats.attack : attackerStats.spAtk;
    def = isPhysical ? defenderStats.defense : defenderStats.spDef;
  }

  // Ability: modifyAttackStat (Huge Power, Guts, Technician, etc.)
  const abilityHooks = options?.attackerAbility ? getAbilityHooks(options.attackerAbility) : null;
  const gutsActive = abilityHooks?.modifyAttackStat && options?.attackerBattlePokemon?.status && options.attackerAbility?.toLowerCase().replace(/\s+/g, "-") === "guts";

  // Burn halves physical attack (Guts ignores burn penalty)
  if (options?.attackerStatus === "burn" && isPhysical && !gutsActive) {
    atk = Math.floor(atk * 0.5);
  }

  // Apply ability attack modifier
  if (abilityHooks?.modifyAttackStat && options?.attackerBattlePokemon) {
    const atkMod = abilityHooks.modifyAttackStat({
      attacker: options.attackerBattlePokemon,
      movePower: move.power,
      isPhysical,
    });
    if (atkMod !== 1) {
      atk = Math.floor(atk * atkMod);
    }
  }

  // Use effective types if provided (for Mega/Tera overrides)
  const attackerTypes = options?.attackerEffectiveTypes ?? attacker.types.map((t) => t.type.name);
  const defenderTypes = options?.defenderEffectiveTypes ?? defender.types.map((t) => t.type.name);

  // STAB calculation — Tera STAB stacking
  let stab = 1;
  if (attackerTypes.includes(move.type.name as TypeName)) {
    if (options?.isTerastallized && options?.attackerOriginalTypes?.includes(move.type.name as TypeName)) {
      stab = 2; // Tera + original type = 2x STAB
    } else {
      stab = 1.5;
    }
  } else if (options?.isTerastallized && options?.attackerOriginalTypes?.includes(move.type.name as TypeName)) {
    stab = 1.5; // Original type still gets STAB even after Tera
  }

  // Ability: modifySTAB (Adaptability: 1.5x → 2x)
  if (stab > 1 && abilityHooks?.modifySTAB && options?.attackerBattlePokemon) {
    stab = abilityHooks.modifySTAB({ attacker: options.attackerBattlePokemon, stab });
  }

  let typeEff = getDefensiveMultiplier(move.type.name, defenderTypes);

  // Scrappy: Normal and Fighting moves hit Ghost types
  if (options?.attackerAbility) {
    const abilityKey = options.attackerAbility.toLowerCase().replace(/\s+/g, "-");
    if (abilityKey === "scrappy" && typeEff === 0) {
      const moveType = move.type.name;
      if (moveType === "normal" || moveType === "fighting") {
        typeEff = 1;
      }
    }
    // Tinted Lens: double not-very-effective damage
    if (abilityKey === "tinted-lens" && typeEff > 0 && typeEff < 1) {
      typeEff *= 2;
    }
  }

  // Filter / Solid Rock: reduce super-effective damage by 25%
  if (typeEff > 1 && options?.defenderAbility) {
    const defAbilityKey = options.defenderAbility.toLowerCase().replace(/\s+/g, "-");
    if (defAbilityKey === "filter" || defAbilityKey === "solid-rock" || defAbilityKey === "prism-armor") {
      typeEff *= 0.75;
    }
  }

  const level = 50;
  const baseDamage =
    (((2 * level) / 5 + 2) * move.power * (atk / def)) / 50 + 2;

  let modifiedDamage = baseDamage * stab * typeEff;

  // Weather modifiers
  if (options?.fieldWeather) {
    const moveType = move.type.name;
    if (options.fieldWeather === "sun") {
      if (moveType === "fire") modifiedDamage *= 1.5;
      else if (moveType === "water") modifiedDamage *= 0.5;
    } else if (options.fieldWeather === "rain") {
      if (moveType === "water") modifiedDamage *= 1.5;
      else if (moveType === "fire") modifiedDamage *= 0.5;
    }
  }

  // Terrain modifiers (grounded attackers only — assumes grounded for now)
  if (options?.fieldTerrain) {
    const moveType = move.type.name;
    if (options.fieldTerrain === "electric" && moveType === "electric") modifiedDamage *= 1.3;
    else if (options.fieldTerrain === "grassy" && moveType === "grass") modifiedDamage *= 1.3;
    else if (options.fieldTerrain === "psychic" && moveType === "psychic") modifiedDamage *= 1.3;
    else if (options.fieldTerrain === "misty" && moveType === "dragon") modifiedDamage *= 0.5;
  }

  // Reflect / Light Screen damage reduction
  if (options?.defenderSideReflect && isPhysical && !isCritical) {
    modifiedDamage *= 0.5;
  }
  if (options?.defenderSideLightScreen && !isPhysical && !isCritical) {
    modifiedDamage *= 0.5;
  }

  // Critical hit multiplier
  if (isCritical) {
    modifiedDamage *= 1.5;
  }

  // Item damage modifier
  if (options?.attackerItem) {
    const item = getHeldItem(options.attackerItem);
    if (item?.battleModifier?.type === "damage_boost") {
      const mod = item.battleModifier;
      let applies = false;

      if (!mod.condition) {
        applies = true;
      } else if (mod.condition === "physical" && isPhysical) {
        applies = true;
      } else if (mod.condition === "special" && !isPhysical) {
        applies = true;
      } else if (mod.condition === "super_effective" && typeEff > 1) {
        applies = true;
      } else if (mod.condition.startsWith("type:")) {
        const itemType = mod.condition.replace("type:", "");
        applies = move.type.name === itemType;
      }

      if (applies && mod.value) {
        modifiedDamage *= mod.value;
      }
    }
  }

  // Random factor ranges from 0.85 to 1.0
  const min = Math.floor(modifiedDamage * 0.85);
  const max = Math.floor(modifiedDamage);

  return {
    min: Math.max(0, min),
    max: Math.max(0, max),
    effectiveness: typeEff,
    stab: stab > 1,
    isCritical,
  };
}

function applyStatStage(stat: number, stage: number): number {
  if (stage >= 0) {
    return Math.floor(stat * (2 + stage) / 2);
  }
  return Math.floor(stat * 2 / (2 - stage));
}

export function getEffectivenessText(effectiveness: number): string {
  if (effectiveness === 0) return "has no effect";
  if (effectiveness < 1) return "not very effective";
  if (effectiveness > 1) return "super effective!";
  return "neutral";
}
