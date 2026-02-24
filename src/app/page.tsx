"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTeam, encodeTeam, decodeTeam, type DecodedTeamData } from "@/hooks/useTeam";
import { fetchPokemon } from "@/hooks/usePokemon";
import { usePokedexContext } from "@/contexts/PokedexContext";
import { useAchievementsContext } from "@/contexts/AchievementsContext";
import { NATURES } from "@/data/natures";
import { DEFAULT_EVS, DEFAULT_IVS } from "@/utils/stats";
import type { TeamSlot } from "@/types";
import dynamic from "next/dynamic";
import SkeletonLoader from "@/components/SkeletonLoader";

// Lightweight — keep eager
import TeamRoster from "@/components/TeamRoster";
import TypeCoverage from "@/components/TypeCoverage";
import TeamWeaknessPanel from "@/components/TeamWeaknessPanel";
import TeamSummary from "@/components/TeamSummary";
import AudioPlayer from "@/components/AudioPlayer";

// Heavy — lazy load
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
const GBAEmulatorTab = dynamic(() => import("@/components/gba/GBAEmulatorTab"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <p className="text-[#8b9bb4] font-pixel text-xs animate-pulse">Loading emulator...</p>
    </div>
  ),
});

type Tab = "team" | "analysis" | "stats" | "damage" | "battle" | "wild" | "gba" | "pokedex" | "achievements";

const tabs: { id: Tab; label: string; short: string }[] = [
  { id: "team", label: "Team", short: "TM" },
  { id: "analysis", label: "Coverage", short: "CV" },
  { id: "stats", label: "Stats", short: "ST" },
  { id: "damage", label: "Damage", short: "DM" },
  { id: "battle", label: "Battle", short: "BT" },
  { id: "wild", label: "Wild", short: "WD" },
  { id: "gba", label: "GBA", short: "GBA" },
  { id: "pokedex", label: "Pokédex", short: "PD" },
  { id: "achievements", label: "Badges", short: "BD" },
];

export default function Home() {
  const {
    team,
    addPokemon,
    removePokemon,
    clearTeam,
    isFull,
    setNature,
    setEvs,
    setIvs,
    setAbility,
    setHeldItem,
    setMoves,
    setTeraType,
    setForme,
    setTeam,
  } = useTeam();
  const [activeTab, setActiveTab] = useState<Tab>("team");
  const [shareMessage, setShareMessage] = useState("");
  const { markSeen } = usePokedexContext();
  const { incrementStat } = useAchievementsContext();
  const prevTeamSize = useRef(0);
  const shouldReduceMotion = useReducedMotion();

  // Load team from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("team");
    if (encoded) {
      const decoded = decodeTeam(encoded);
      if (decoded.length === 0) return;

      if (typeof decoded[0] === "number") {
        // Old format — just IDs
        (decoded as number[]).forEach(async (id) => {
          try {
            const pokemon = await fetchPokemon(id);
            addPokemon(pokemon);
          } catch {
            // skip invalid
          }
        });
      } else {
        // New format — full team data
        const slots = decoded as DecodedTeamData;
        Promise.all(
          slots.map(async (s) => {
            try {
              const pokemon = await fetchPokemon(s.id);
              const nature = s.n ? NATURES.find((n) => n.name === s.n) ?? null : null;
              return {
                pokemon,
                position: 0,
                nature,
                evs: s.e ? { hp: s.e[0], attack: s.e[1], defense: s.e[2], spAtk: s.e[3], spDef: s.e[4], speed: s.e[5] } : { ...DEFAULT_EVS },
                ivs: s.i ? { hp: s.i[0], attack: s.i[1], defense: s.i[2], spAtk: s.i[3], spDef: s.i[4], speed: s.i[5] } : { ...DEFAULT_IVS },
                ability: s.a ?? pokemon.abilities?.[0]?.ability.name ?? null,
                heldItem: s.h ?? null,
                selectedMoves: s.m ?? [],
                teraConfig: s.t ? { teraType: s.t as string } : undefined,
                formeOverride: s.f ?? undefined,
              } as TeamSlot;
            } catch {
              return null;
            }
          })
        ).then((results) => {
          const validSlots = results
            .filter((s): s is TeamSlot => s !== null)
            .map((s, i) => ({ ...s, position: i }));
          if (validSlots.length > 0) setTeam(validSlots);
        });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-register team Pokemon in Pokedex + track totalTeamsBuilt
  useEffect(() => {
    for (const slot of team) {
      markSeen(slot.pokemon.id, slot.pokemon.name, "team");
    }
    if (team.length === 6 && prevTeamSize.current < 6) {
      incrementStat("totalTeamsBuilt");
    }
    prevTeamSize.current = team.length;
  }, [team, markSeen, incrementStat]);

  const handleShare = useCallback(() => {
    if (team.length === 0) return;
    const encoded = encodeTeam(team);
    const url = `${window.location.origin}${window.location.pathname}?team=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareMessage("Link copied!");
      setTimeout(() => setShareMessage(""), 2000);
    });
  }, [team]);

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, tabId: Tab) => {
      const idx = tabs.findIndex((t) => t.id === tabId);
      let nextIdx = -1;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextIdx = (idx + 1) % tabs.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextIdx = (idx - 1 + tabs.length) % tabs.length;
      }
      if (nextIdx >= 0) {
        setActiveTab(tabs[nextIdx].id);
        document.getElementById(`tab-${tabs[nextIdx].id}`)?.focus();
      }
    },
    []
  );

  const teamPokemon = team.map((s) => s.pokemon);
  const motionDuration = shouldReduceMotion ? 0 : 0.2;

  return (
    <div className="min-h-screen bg-[#1a1c2c]">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-[#e8433f] focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-pixel focus:text-sm"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="border-b border-[#3a4466] bg-[#262b44]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 gap-2 flex-wrap sm:flex-nowrap">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-[#f0f0e8] font-pixel truncate">
              Pokemon Team Builder
            </h1>
            <p className="text-xs text-[#8b9bb4] hidden sm:block">
              Build, analyze, and simulate battles
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <AudioPlayer />
            {team.length > 0 && (
              <>
                <button
                  onClick={handleShare}
                  aria-label="Share team link"
                  className="rounded-lg bg-[#3a4466] px-3 py-1.5 text-sm text-[#f0f0e8] hover:bg-[#4a5577] transition-colors"
                >
                  {shareMessage || "Share Team"}
                </button>
                <button
                  onClick={clearTeam}
                  aria-label="Clear all team members"
                  className="rounded-lg bg-[#3a4466] px-3 py-1.5 text-sm text-[#8b9bb4] hover:bg-[#e8433f] hover:text-[#f0f0e8] transition-colors"
                >
                  Clear
                </button>
              </>
            )}
            <span className="text-sm text-[#8b9bb4]" aria-live="polite">
              {team.length}/6
            </span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-[#3a4466]" aria-label="Main navigation">
        <div className="mx-auto flex max-w-6xl px-4 overflow-x-auto" role="tablist" aria-label="App sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              {...{ "aria-selected": activeTab === tab.id }}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
              className={`relative px-3 py-3 text-sm font-medium font-pixel transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "text-[#f0f0e8]"
                  : "text-[#8b9bb4] hover:text-[#f0f0e8]"
              }`}
            >
              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">{tab.short}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e8433f]"
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main
        id="main-content"
        className="mx-auto max-w-6xl px-4 py-6"
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {/* GBA emulator stays mounted to preserve WASM state across tab switches */}
        <div style={{ display: activeTab === "gba" ? "block" : "none" }}>
          <GBAEmulatorTab />
        </div>

        <AnimatePresence mode="wait">
          {activeTab !== "gba" && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: motionDuration }}
            >
              {activeTab === "team" && (
                <TeamRoster
                  team={team}
                  onAdd={addPokemon}
                  onRemove={removePokemon}
                  isFull={isFull}
                  onSetNature={setNature}
                  onSetEvs={setEvs}
                  onSetIvs={setIvs}
                  onSetAbility={setAbility}
                  onSetHeldItem={setHeldItem}
                  onSetMoves={setMoves}
                  onSetTeraType={setTeraType}
                  onSetForme={setForme}
                  onSetTeam={setTeam}
                />
              )}
              {activeTab === "analysis" && (
                <div className="space-y-6">
                  <TypeCoverage team={teamPokemon} />
                  <TeamWeaknessPanel team={team} />
                </div>
              )}
              {activeTab === "stats" && (
                <div className="space-y-6">
                  <StatRadar team={team} />
                  <TeamSummary team={teamPokemon} />
                </div>
              )}
              {activeTab === "damage" && (
                <DamageCalculator team={teamPokemon} />
              )}
              {activeTab === "battle" && (
                <BattleTab team={team} />
              )}
              {activeTab === "wild" && (
                <WildTab team={team} onAddToTeam={addPokemon} />
              )}
              {activeTab === "pokedex" && (
                <PokedexTracker />
              )}
              {activeTab === "achievements" && (
                <AchievementPanel />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
