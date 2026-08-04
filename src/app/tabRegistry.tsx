"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import SkeletonLoader from "@/components/SkeletonLoader";
import { capitalize } from "@/utils/format";
import type {
  TeamSlot,
  Pokemon,
  Nature,
  EVSpread,
  IVSpread,
  TypeName,
} from "@/types";

// Lightweight — keep eager (used inside panels below)
import TeamRoster from "@/components/TeamRoster";
import TypeCoverage from "@/components/TypeCoverage";
import TeamWeaknessPanel from "@/components/TeamWeaknessPanel";
import TeamSuggestions from "@/components/TeamSuggestions";
import TeamSummary from "@/components/TeamSummary";

// Heavy — lazy load (code-split per tab, unchanged from previous page.tsx)
const StatRadar = dynamic(() => import("@/components/StatRadar"), {
  loading: () => <SkeletonLoader label="Loading stats..." lines={2} />,
});
const DamageCalculator = dynamic(() => import("@/components/DamageCalculator"), {
  loading: () => <SkeletonLoader label="Loading calculator..." lines={3} />,
});
const BattleTab = dynamic(() => import("@/components/battle/BattleTab"), {
  loading: () => <SkeletonLoader label="Loading battle..." lines={4} />,
});
const WildTab = dynamic(() => import("@/components/wild/WildTab"), {
  loading: () => <SkeletonLoader label="Loading wild area..." lines={4} />,
});
const PokedexTracker = dynamic(() => import("@/components/PokedexTracker"), {
  loading: () => <SkeletonLoader label="Loading Pokédex..." lines={4} />,
});
const AchievementPanel = dynamic(() => import("@/components/AchievementPanel"), {
  loading: () => <SkeletonLoader label="Loading achievements..." lines={3} />,
});
const SpeedTierChart = dynamic(() => import("@/components/SpeedTierChart"), {
  loading: () => <SkeletonLoader label="Loading speed chart..." lines={2} />,
});
const SpeedOptimizer = dynamic(() => import("@/components/SpeedOptimizer"), {
  loading: () => <SkeletonLoader label="Loading speed optimizer..." lines={2} />,
});
const PokemonComparison = dynamic(() => import("@/components/PokemonComparison"), {
  loading: () => <SkeletonLoader label="Loading comparison..." lines={3} />,
});
const TierWarnings = dynamic(() => import("@/components/TierWarnings"), {
  loading: () => <SkeletonLoader label="Loading tier validation..." lines={2} />,
});
const DamageMatrix = dynamic(() => import("@/components/DamageMatrix"), {
  loading: () => <SkeletonLoader label="Loading damage matrix..." lines={3} />,
});
const TeamTemplates = dynamic(() => import("@/components/TeamTemplates"), {
  loading: () => <SkeletonLoader label="Loading templates..." lines={2} />,
});
const CoverageGrid = dynamic(() => import("@/components/CoverageGrid"), {
  loading: () => <SkeletonLoader label="Loading coverage grid..." lines={2} />,
});
const MovePoolBrowser = dynamic(() => import("@/components/MovePoolBrowser"), {
  loading: () => <SkeletonLoader label="Loading move pool..." lines={3} />,
});
const EvolutionTreeViewer = dynamic(() => import("@/components/EvolutionTreeViewer"), {
  loading: () => <SkeletonLoader label="Loading evolution tree..." lines={2} />,
});
const UnifiedEmulatorTab = dynamic(() => import("@/components/emulator/UnifiedEmulatorTab"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <p className="text-[#8b9bb4] font-pixel text-xs animate-pulse">Loading emulator...</p>
    </div>
  ),
});
const TeamArchetype = dynamic(() => import("@/components/TeamArchetype"), {
  loading: () => <SkeletonLoader label="Loading archetype..." lines={3} />,
});
const DamageQuiz = dynamic(() => import("@/components/DamageQuiz"), {
  loading: () => <SkeletonLoader label="Loading damage trainer..." lines={3} />,
});
const DailyChallenge = dynamic(() => import("@/components/DailyChallenge"), {
  loading: () => <SkeletonLoader label="Loading daily challenge..." lines={4} />,
});

export type Tab =
  | "team"
  | "analysis"
  | "stats"
  | "damage"
  | "battle"
  | "wild"
  | "emulator"
  | "pokedex"
  | "achievements"
  | "daily";

/** Shared props every tab panel needs, assembled once per render in page.tsx. */
export interface TabPanelContext {
  team: TeamSlot[];
  teamPokemon: Pokemon[];
  addPokemon: (pokemon: Pokemon) => void;
  removePokemon: (position: number) => void;
  isFull: boolean;
  setNature: (position: number, nature: Nature) => void;
  setEvs: (position: number, evs: EVSpread) => void;
  setIvs: (position: number, ivs: IVSpread) => void;
  setAbility: (position: number, ability: string) => void;
  setHeldItem: (position: number, item: string) => void;
  setMoves: (position: number, moves: string[]) => void;
  setTeraType: (position: number, teraType: TypeName) => void;
  setForme: (position: number, forme: string | null) => void;
  setTeam: (slots: TeamSlot[]) => void;
  handleLoadTemplate: (showdownPaste: string) => Promise<void>;
  selectedTeamPokemonIdx: number;
  setSelectedTeamPokemonIdx: (idx: number) => void;
  /** True while the emulator tab is the active tab — drives its pause/resume wiring. */
  isEmulatorTabActive: boolean;
}

export interface TabEntry {
  id: Tab;
  label: string;
  short: string;
  /** Shown to the ErrorBoundary wrapping this panel. */
  fallbackLabel: string;
  /** Stays mounted (display:none when inactive) so internal state — e.g. emulator WASM — survives tab switches. */
  keepMounted?: boolean;
  /** Omit to always show; return false to hide behind a feature flag. */
  visible?: (features: Record<string, boolean>) => boolean;
  panel: (ctx: TabPanelContext) => ReactNode;
}

export const TAB_REGISTRY: TabEntry[] = [
  {
    id: "team",
    label: "Team",
    short: "Team",
    fallbackLabel: "Team builder crashed",
    panel: (ctx) => (
      <div className="space-y-6">
        <TeamRoster
          team={ctx.team}
          onAdd={ctx.addPokemon}
          onRemove={ctx.removePokemon}
          isFull={ctx.isFull}
          onSetNature={ctx.setNature}
          onSetEvs={ctx.setEvs}
          onSetIvs={ctx.setIvs}
          onSetAbility={ctx.setAbility}
          onSetHeldItem={ctx.setHeldItem}
          onSetMoves={ctx.setMoves}
          onSetTeraType={ctx.setTeraType}
          onSetForme={ctx.setForme}
          onSetTeam={ctx.setTeam}
        />
        <TierWarnings team={ctx.team} />
        <TeamTemplates onLoadTeam={ctx.handleLoadTemplate} />
      </div>
    ),
  },
  {
    id: "analysis",
    label: "Coverage",
    short: "Cover",
    fallbackLabel: "Coverage analysis crashed",
    panel: (ctx) => (
      <div className="space-y-6">
        <TypeCoverage team={ctx.team} />
        {ctx.team.length >= 1 && <CoverageGrid team={ctx.team} />}
        <TeamWeaknessPanel team={ctx.team} />
        {ctx.team.length < 6 && (
          <TeamSuggestions team={ctx.team} onAddPokemon={ctx.addPokemon} />
        )}
        <TeamArchetype team={ctx.team} />
      </div>
    ),
  },
  {
    id: "stats",
    label: "Stats",
    short: "Stats",
    fallbackLabel: "Stats view crashed",
    panel: (ctx) => (
      <div className="space-y-6">
        <StatRadar team={ctx.team} />
        <SpeedTierChart team={ctx.team} />
        <SpeedOptimizer team={ctx.team} />
        <PokemonComparison team={ctx.team} />
        <TeamSummary team={ctx.teamPokemon} />
        {ctx.team.length > 0 && (
          <>
            <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-bold text-[#f0f0e8] font-pixel">Move Pool</h3>
                <div className="flex gap-1">
                  {ctx.team.map((s, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => ctx.setSelectedTeamPokemonIdx(i)}
                      className={`px-2 py-0.5 text-[10px] font-pixel rounded transition-colors ${
                        ctx.selectedTeamPokemonIdx === i
                          ? "bg-[#e8433f] text-[#f0f0e8]"
                          : "bg-[#3a4466] text-[#8b9bb4] hover:text-[#f0f0e8]"
                      }`}
                      aria-label={`View moves for ${s.pokemon.name}`}
                    >
                      {capitalize(s.pokemon.name).slice(0, 6)}
                    </button>
                  ))}
                </div>
              </div>
              <MovePoolBrowser pokemon={ctx.team[ctx.selectedTeamPokemonIdx]?.pokemon} />
            </div>
            <EvolutionTreeViewer pokemonId={ctx.team[ctx.selectedTeamPokemonIdx]?.pokemon.id} />
          </>
        )}
      </div>
    ),
  },
  {
    id: "damage",
    label: "Damage",
    short: "Dmg",
    fallbackLabel: "Damage calculator crashed",
    panel: (ctx) => (
      <div className="space-y-6">
        <DamageCalculator team={ctx.team} />
        <DamageMatrix team={ctx.team} />
        <DamageQuiz team={ctx.team} />
      </div>
    ),
  },
  {
    id: "battle",
    label: "Battle",
    short: "Battle",
    fallbackLabel: "Battle system crashed",
    panel: (ctx) => <BattleTab team={ctx.team} />,
  },
  {
    id: "wild",
    label: "Wild",
    short: "Wild",
    fallbackLabel: "Wild area crashed",
    panel: (ctx) => (
      <WildTab
        team={ctx.team}
        onAddToTeam={ctx.addPokemon}
        onSetEvs={ctx.setEvs}
        onSetMoves={ctx.setMoves}
      />
    ),
  },
  {
    id: "emulator",
    label: "Emulator",
    short: "Emu",
    fallbackLabel: "Emulator failed to load",
    keepMounted: true,
    visible: (features) => !!features.enableEmulator,
    panel: (ctx) => <UnifiedEmulatorTab isActiveTab={ctx.isEmulatorTabActive} />,
  },
  {
    id: "pokedex",
    label: "Pokédex",
    short: "Dex",
    fallbackLabel: "Pokedex crashed",
    panel: () => <PokedexTracker />,
  },
  {
    id: "achievements",
    label: "Badges",
    short: "Badge",
    fallbackLabel: "Achievements crashed",
    panel: (ctx) => <AchievementPanel team={ctx.team} />,
  },
  {
    id: "daily",
    label: "Daily",
    short: "Daily",
    fallbackLabel: "Daily challenge crashed",
    panel: () => <DailyChallenge />,
  },
];
