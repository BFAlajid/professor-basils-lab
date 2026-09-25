import { TeamSlot } from "@/types";
import { STATUS_MOVE_EFFECTS, StatusMoveEffect } from "@/data/statusMoves";
import { getHeldItem } from "@/data/heldItems";
import { formatName, normalizeAbilityKey } from "@/utils/format";
import { extractBaseStats } from "@/utils/damageWasm";
import { calculateAllStats, DEFAULT_EVS, DEFAULT_IVS } from "@/utils/statsWasm";

// --- Public types ---

export type Archetype =
  | "hyper-offense"
  | "bulky-offense"
  | "balance"
  | "stall"
  | "rain"
  | "sun"
  | "sand"
  | "snow"
  | "trick-room"
  | "hazard-stack"
  | "weatherless";

export interface ArchetypeSignal {
  archetype: Archetype;
  /** 0..1 confidence for this specific signal. */
  score: number;
  /** Human-readable evidence that produced the score, e.g. ["Politoed: Drizzle"]. */
  evidence: string[];
}

export interface ArchetypeSetters {
  hazards: string[];
  weather: string[];
  terrain: string[];
  screens: string[];
}

export interface ArchetypeReport {
  primary: ArchetypeSignal;
  /** Other signals above the reporting threshold, sorted by score descending. */
  secondary: ArchetypeSignal[];
  speedProfile: "fast" | "mixed" | "slow";
  setters: ArchetypeSetters;
  /** Human-readable summary lines describing how the team is meant to win. */
  winCondition: string[];
  confidence: "high" | "medium" | "low" | "insufficient-data";
}

// --- Ability / item classification data ---
// Keys mirror the ability keys in `data/abilities.ts` and item keys in
// `data/heldItems.ts` so evidence stays traceable to the source data.

type WeatherArchetype = Extract<Archetype, "rain" | "sun" | "sand" | "snow">;

const WEATHER_SETTER_ABILITIES: Record<string, WeatherArchetype> = {
  drizzle: "rain",
  drought: "sun",
  "sand-stream": "sand",
  "snow-warning": "snow",
};

const WEATHER_PAYOFF_ABILITIES: Record<string, WeatherArchetype> = {
  "swift-swim": "rain",
  chlorophyll: "sun",
  "sand-rush": "sand",
  "slush-rush": "snow",
};

const WEATHER_ROCK_ITEMS: Record<string, WeatherArchetype> = {
  "damp-rock": "rain",
  "heat-rock": "sun",
  "smooth-rock": "sand",
  "icy-rock": "snow",
};

const TERRAIN_SETTER_ABILITIES = new Set([
  "electric-surge",
  "grassy-surge",
  "misty-surge",
  "psychic-surge",
]);

/**
 * Ability an alternate forme carries that PokeAPI's base-forme ability list
 * doesn't reflect. Resolved from a held mega stone's `formeApiName` or from
 * `TeamSlot.formeOverride`. Kept intentionally small — only formes reachable
 * through this app's own data (`data/megaStones.ts`, `data/formes.ts`).
 */
const FORME_ABILITY_OVERRIDES: Record<string, string> = {
  "charizard-mega-y": "drought",
};

const ATTACK_BOOST_ITEMS = new Set([
  "choice-band",
  "choice-specs",
  "choice-scarf",
  "life-orb",
]);

const BULK_ITEMS = new Set(["leftovers", "black-sludge"]);

// --- Scoring constants ---

const SECONDARY_THRESHOLD = 0.25;
const UNFOCUSED_MARGIN = 0.15;
const UNFOCUSED_MIN_SCORE = 0.4;
const HIGH_CONFIDENCE_MIN_SCORE = 0.65;
const HIGH_CONFIDENCE_MIN_TEAM_SIZE = 4;
const MEDIUM_CONFIDENCE_MIN_SCORE = 0.35;
const FAST_SPEED_THRESHOLD = 100;
const MIXED_SPEED_THRESHOLD = 65;

// --- Internal accumulator built from a single pass over the team ---

interface WeatherEvidence {
  setters: string[];
  payoffs: string[];
  rocks: string[];
}

interface TeamSignals {
  weather: Record<WeatherArchetype, WeatherEvidence>;
  terrain: string[];
  hazards: string[];
  screens: string[];
  trickRoom: string[];
  offensiveSetup: string[];
  recovery: string[];
  attackItems: string[];
  bulkItems: string[];
  phazing: string[];
  hasMoveOrItemData: boolean;
}

function emptyWeatherEvidence(): WeatherEvidence {
  return { setters: [], payoffs: [], rocks: [] };
}

function emptySignals(): TeamSignals {
  return {
    weather: {
      rain: emptyWeatherEvidence(),
      sun: emptyWeatherEvidence(),
      sand: emptyWeatherEvidence(),
      snow: emptyWeatherEvidence(),
    },
    terrain: [],
    hazards: [],
    screens: [],
    trickRoom: [],
    offensiveSetup: [],
    recovery: [],
    attackItems: [],
    bulkItems: [],
    phazing: [],
    hasMoveOrItemData: false,
  };
}

/** Resolve the ability actually in play, accounting for mega stones / formes. */
function resolveActiveAbility(slot: TeamSlot): string | null {
  try {
    const heldItem = slot.heldItem ? getHeldItem(slot.heldItem) : undefined;
    const formeApiName = heldItem?.formeApiName;
    if (formeApiName && FORME_ABILITY_OVERRIDES[formeApiName]) {
      return FORME_ABILITY_OVERRIDES[formeApiName];
    }
    if (slot.formeOverride && FORME_ABILITY_OVERRIDES[slot.formeOverride.toLowerCase()]) {
      return FORME_ABILITY_OVERRIDES[slot.formeOverride.toLowerCase()];
    }
    return slot.ability ?? null;
  } catch {
    return null;
  }
}

function safeSlotName(slot: TeamSlot): string {
  try {
    return formatName(slot.pokemon.name);
  } catch {
    return "Unknown";
  }
}

function safeCalculatedSpeed(slot: TeamSlot): number {
  try {
    const baseStats = extractBaseStats(slot.pokemon);
    const stats = calculateAllStats(
      baseStats,
      slot.ivs ?? DEFAULT_IVS,
      slot.evs ?? DEFAULT_EVS,
      slot.nature ?? null
    );
    return stats.speed;
  } catch {
    return 0;
  }
}

function statusEffectFor(moveKey: string): StatusMoveEffect | null {
  return STATUS_MOVE_EFFECTS[moveKey.toLowerCase()] ?? null;
}

function isOffensiveSetup(effect: StatusMoveEffect): boolean {
  const changes = effect.selfStatChanges;
  if (!changes) return false;
  const offensiveGain = (changes.attack ?? 0) + (changes.spAtk ?? 0) + (changes.speed ?? 0);
  return offensiveGain > 0;
}

function isRecoveryMove(effect: StatusMoveEffect): boolean {
  return effect.healPercent !== undefined || effect.wish === true;
}

/** Single defensive pass over the team, collecting evidence for every heuristic. */
function scanTeam(team: TeamSlot[]): TeamSignals {
  const signals = emptySignals();

  for (const slot of team) {
    try {
      const name = safeSlotName(slot);

      // Abilities (weather + terrain setters, weather payoffs)
      const abilityKey = normalizeAbilityKey(resolveActiveAbility(slot));
      if (abilityKey) {
        const setterWeather = WEATHER_SETTER_ABILITIES[abilityKey];
        if (setterWeather) {
          signals.weather[setterWeather].setters.push(`${name}: ${formatName(abilityKey)}`);
        }
        const payoffWeather = WEATHER_PAYOFF_ABILITIES[abilityKey];
        if (payoffWeather) {
          signals.weather[payoffWeather].payoffs.push(`${name}: ${formatName(abilityKey)}`);
        }
        if (TERRAIN_SETTER_ABILITIES.has(abilityKey)) {
          signals.terrain.push(`${name}: ${formatName(abilityKey)}`);
        }
      }

      // Held item (weather rocks, attack items, bulk items)
      const itemKey = slot.heldItem?.toLowerCase() ?? null;
      if (itemKey) {
        signals.hasMoveOrItemData = true;
        const rockWeather = WEATHER_ROCK_ITEMS[itemKey];
        if (rockWeather) {
          signals.weather[rockWeather].rocks.push(`${name}: ${formatName(itemKey)}`);
        }
        if (ATTACK_BOOST_ITEMS.has(itemKey)) {
          signals.attackItems.push(`${name}: ${formatName(itemKey)}`);
        }
        if (BULK_ITEMS.has(itemKey)) {
          signals.bulkItems.push(`${name}: ${formatName(itemKey)}`);
        }
      }

      // Moves (Trick Room, setup, recovery, hazards, screens, phazing)
      const moves = slot.selectedMoves ?? [];
      if (moves.length > 0) signals.hasMoveOrItemData = true;

      for (const moveName of moves) {
        if (!moveName) continue;
        const moveKey = moveName.toLowerCase();
        const effect = statusEffectFor(moveKey);
        if (!effect) continue;

        const label = `${name}: ${formatName(moveKey)}`;

        if (effect.fieldEffect === "trickRoom") {
          signals.trickRoom.push(label);
        }
        if (isOffensiveSetup(effect)) {
          signals.offensiveSetup.push(label);
        }
        if (isRecoveryMove(effect)) {
          signals.recovery.push(label);
        }
        if (effect.hazard !== undefined) {
          signals.hazards.push(label);
        }
        if (effect.reflect || effect.lightScreen || effect.auroraVeil !== undefined) {
          signals.screens.push(label);
        }
        if (effect.forceSwitch) {
          signals.phazing.push(label);
        }
      }
    } catch {
      // A single malformed slot must never break the whole report.
      continue;
    }
  }

  return signals;
}

function computeSpeedProfile(team: TeamSlot[]): "fast" | "mixed" | "slow" {
  if (team.length === 0) return "mixed";
  const total = team.reduce((sum, slot) => sum + safeCalculatedSpeed(slot), 0);
  const avg = total / team.length;
  if (avg >= FAST_SPEED_THRESHOLD) return "fast";
  if (avg >= MIXED_SPEED_THRESHOLD) return "mixed";
  return "slow";
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// --- Per-archetype scorers ---

function scoreWeather(archetype: WeatherArchetype, signals: TeamSignals): ArchetypeSignal {
  const { setters, payoffs, rocks } = signals.weather[archetype];
  let score = 0;
  if (setters.length >= 1) score += 0.55;
  if (setters.length >= 2) score += 0.15;
  if (payoffs.length >= 1) score += 0.25;
  if (payoffs.length >= 2) score += 0.1;
  if (rocks.length >= 1) score += 0.1;
  return { archetype, score: clamp01(score), evidence: [...setters, ...payoffs, ...rocks] };
}

function scoreTrickRoom(signals: TeamSignals, speedProfile: "fast" | "mixed" | "slow"): ArchetypeSignal {
  if (signals.trickRoom.length === 0) {
    return { archetype: "trick-room", score: 0, evidence: [] };
  }
  let score = 0.5;
  const evidence = [...signals.trickRoom];
  if (speedProfile === "slow") {
    score += 0.35;
    evidence.push("Team speed profile: slow (favors Trick Room)");
  } else if (speedProfile === "mixed") {
    score += 0.15;
  }
  return { archetype: "trick-room", score: clamp01(score), evidence };
}

function scoreHazardStack(signals: TeamSignals): ArchetypeSignal {
  const score = clamp01(signals.hazards.length * 0.32);
  return { archetype: "hazard-stack", score, evidence: [...signals.hazards] };
}

function scoreHyperOffense(
  signals: TeamSignals,
  speedProfile: "fast" | "mixed" | "slow"
): ArchetypeSignal {
  let score = 0;
  score += Math.min(0.4, signals.offensiveSetup.length * 0.15);
  score += Math.min(0.3, signals.attackItems.length * 0.1);
  if (speedProfile === "fast") score += 0.2;
  else if (speedProfile === "mixed") score += 0.05;
  if (signals.recovery.length === 0) {
    score += 0.1;
  } else {
    score -= Math.min(0.25, signals.recovery.length * 0.08);
  }
  const evidence = [...signals.offensiveSetup, ...signals.attackItems];
  return { archetype: "hyper-offense", score: clamp01(score), evidence };
}

function scoreStall(
  signals: TeamSignals,
  speedProfile: "fast" | "mixed" | "slow"
): ArchetypeSignal {
  let score = 0;
  score += Math.min(0.35, signals.recovery.length * 0.12);
  score += Math.min(0.2, signals.bulkItems.length * 0.1);
  score += Math.min(0.2, signals.hazards.length * 0.1);
  score += Math.min(0.15, signals.phazing.length * 0.15);
  if (speedProfile !== "fast") score += 0.1;
  const evidence = [...signals.recovery, ...signals.bulkItems, ...signals.phazing];
  return { archetype: "stall", score: clamp01(score), evidence };
}

function scoreBulkyOffense(signals: TeamSignals): ArchetypeSignal {
  const hasOffense = signals.offensiveSetup.length > 0 || signals.attackItems.length > 0;
  const hasBulk = signals.recovery.length > 0 || signals.bulkItems.length > 0;
  let score = 0;
  const evidence: string[] = [];
  if (hasOffense && hasBulk) {
    const offenseCount = signals.offensiveSetup.length + signals.attackItems.length;
    const bulkCount = signals.recovery.length + signals.bulkItems.length;
    score = 0.3 + Math.min(0.3, offenseCount * 0.06) + Math.min(0.3, bulkCount * 0.06);
    evidence.push(...signals.offensiveSetup, ...signals.attackItems, ...signals.recovery, ...signals.bulkItems);
  }
  return { archetype: "bulky-offense", score: clamp01(score), evidence };
}

function scoreBalance(extremity: number, team: TeamSlot[]): ArchetypeSignal {
  const score = team.length === 0 ? 0 : clamp01(0.5 - extremity * 0.35);
  return { archetype: "balance", score, evidence: [] };
}

function scoreWeatherless(maxWeatherScore: number): ArchetypeSignal {
  const score = maxWeatherScore < 0.2 ? 0.3 : 0;
  return {
    archetype: "weatherless",
    score,
    evidence: score > 0 ? ["No weather-setting abilities or items detected"] : [],
  };
}

// --- Win condition text ---

const WIN_CONDITION_TEMPLATES: Record<Archetype, string> = {
  rain: "Rain boosts Water-type power and lets Swift Swim-style sweepers outrun the field before it clears.",
  sun: "Sun powers up Fire-type attacks and Chlorophyll speed control aims to close the game before it clears.",
  sand: "Sandstorm chip damage wears the opponent down while Sand Rush sweepers pick off weakened threats.",
  snow: "Hail/snow chip damage and Slush Rush speed control aim to close games once the field is set.",
  "trick-room": "Trick Room flips the speed order so slow, hard-hitting attackers move first and clean up.",
  "hyper-offense":
    "Overwhelm the opponent before they can respond — setup sweepers backed by Choice/Life Orb power look to end games fast.",
  "bulky-offense": "Pressure the opponent with attackers bulky enough to take a hit, recover, and keep swinging.",
  stall: "Outlast the opponent — recovery and hazards wear them down over a long game.",
  "hazard-stack": "Stack entry hazards to punish switches and force chip damage that adds up over the game.",
  balance: "No single win condition — mix offense and defense and adapt the game plan to the matchup.",
  weatherless: "Win on raw type coverage and matchup play rather than a field-condition gimmick.",
};

function buildWinCondition(
  primary: ArchetypeSignal,
  setters: ArchetypeSetters,
  unfocused: boolean,
  secondaryTop: ArchetypeSignal | undefined
): string[] {
  const lines: string[] = [WIN_CONDITION_TEMPLATES[primary.archetype]];

  if (setters.hazards.length > 0 && primary.archetype !== "hazard-stack") {
    lines.push(`Entry hazards back the plan: ${setters.hazards.join(", ")}.`);
  }

  if (unfocused && secondaryTop) {
    lines.push(
      `Signals are split between ${formatName(primary.archetype)} and ${formatName(
        secondaryTop.archetype
      )} — the team may lack a single clear game plan.`
    );
  }

  return lines;
}

// --- Main export ---

export function detectArchetype(team: TeamSlot[]): ArchetypeReport {
  if (!Array.isArray(team) || team.length === 0) {
    return {
      primary: { archetype: "balance", score: 0, evidence: [] },
      secondary: [],
      speedProfile: "mixed",
      setters: { hazards: [], weather: [], terrain: [], screens: [] },
      winCondition: [],
      confidence: "insufficient-data",
    };
  }

  try {
    const signals = scanTeam(team);
    const speedProfile = computeSpeedProfile(team);

    const weatherSignals = (["rain", "sun", "sand", "snow"] as WeatherArchetype[]).map((w) =>
      scoreWeather(w, signals)
    );
    const maxWeatherScore = Math.max(0, ...weatherSignals.map((s) => s.score));

    const trickRoomSignal = scoreTrickRoom(signals, speedProfile);
    const hazardStackSignal = scoreHazardStack(signals);
    const hyperOffenseSignal = scoreHyperOffense(signals, speedProfile);
    const stallSignal = scoreStall(signals, speedProfile);
    const bulkyOffenseSignal = scoreBulkyOffense(signals);

    const extremity = Math.max(
      hyperOffenseSignal.score,
      stallSignal.score,
      bulkyOffenseSignal.score,
      hazardStackSignal.score,
      trickRoomSignal.score,
      maxWeatherScore
    );
    const balanceSignal = scoreBalance(extremity, team);
    const weatherlessSignal = scoreWeatherless(maxWeatherScore);

    const allSignals: ArchetypeSignal[] = [
      ...weatherSignals,
      trickRoomSignal,
      hazardStackSignal,
      hyperOffenseSignal,
      stallSignal,
      bulkyOffenseSignal,
      balanceSignal,
      weatherlessSignal,
    ]
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    const primary: ArchetypeSignal =
      allSignals[0] ?? { archetype: "balance", score: 0, evidence: [] };
    const secondary = allSignals
      .slice(1)
      .filter((s) => s.score >= SECONDARY_THRESHOLD);

    const topSecondary = secondary[0];
    const unfocused =
      !!topSecondary &&
      primary.score >= UNFOCUSED_MIN_SCORE &&
      topSecondary.score >= UNFOCUSED_MIN_SCORE &&
      primary.score - topSecondary.score <= UNFOCUSED_MARGIN;

    const setters: ArchetypeSetters = {
      hazards: signals.hazards,
      weather: [
        ...signals.weather.rain.setters,
        ...signals.weather.sun.setters,
        ...signals.weather.sand.setters,
        ...signals.weather.snow.setters,
      ],
      terrain: signals.terrain,
      screens: signals.screens,
    };

    let confidence: ArchetypeReport["confidence"];
    if (!signals.hasMoveOrItemData) {
      confidence = "low";
    } else if (unfocused) {
      confidence = "medium";
    } else if (primary.score >= HIGH_CONFIDENCE_MIN_SCORE && team.length >= HIGH_CONFIDENCE_MIN_TEAM_SIZE) {
      confidence = "high";
    } else if (primary.score >= MEDIUM_CONFIDENCE_MIN_SCORE) {
      confidence = "medium";
    } else {
      confidence = "low";
    }

    const winCondition = buildWinCondition(primary, setters, unfocused, topSecondary);

    return {
      primary,
      secondary,
      speedProfile,
      setters,
      winCondition,
      confidence,
    };
  } catch {
    return {
      primary: { archetype: "balance", score: 0, evidence: [] },
      secondary: [],
      speedProfile: "mixed",
      setters: { hazards: [], weather: [], terrain: [], screens: [] },
      winCondition: [],
      confidence: "low",
    };
  }
}
