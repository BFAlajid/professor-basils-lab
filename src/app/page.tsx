"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTeam, encodeTeam, decodeTeam } from "@/hooks/useTeam";
import { fetchPokemon } from "@/hooks/usePokemon";
import TeamRoster from "@/components/TeamRoster";
import TypeCoverage from "@/components/TypeCoverage";
import StatRadar from "@/components/StatRadar";
import DamageCalculator from "@/components/DamageCalculator";
import TeamSummary from "@/components/TeamSummary";
import BattleTab from "@/components/battle/BattleTab";
import WildTab from "@/components/wild/WildTab";
import AudioPlayer from "@/components/AudioPlayer";
import TeamWeaknessPanel from "@/components/TeamWeaknessPanel";
import PokedexTracker from "@/components/PokedexTracker";
import AchievementPanel from "@/components/AchievementPanel";
import dynamic from "next/dynamic";
const GBAEmulatorTab = dynamic(() => import("@/components/gba/GBAEmulatorTab"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <p className="text-[#8b9bb4] font-pixel text-xs animate-pulse">Loading emulator...</p>
    </div>
  ),
});

type Tab = "team" | "analysis" | "stats" | "damage" | "battle" | "wild" | "gba" | "pokedex" | "achievements";

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

  // Load team from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("team");
    if (encoded) {
      const ids = decodeTeam(encoded);
      ids.forEach(async (id) => {
        try {
          const pokemon = await fetchPokemon(id);
          addPokemon(pokemon);
        } catch {
          // skip invalid
        }
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleShare = useCallback(() => {
    if (team.length === 0) return;
    const encoded = encodeTeam(team);
    const url = `${window.location.origin}${window.location.pathname}?team=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareMessage("Link copied!");
      setTimeout(() => setShareMessage(""), 2000);
    });
  }, [team]);

  const teamPokemon = team.map((s) => s.pokemon);

  const tabs: { id: Tab; label: string }[] = [
    { id: "team", label: "Team" },
    { id: "analysis", label: "Coverage" },
    { id: "stats", label: "Stats" },
    { id: "damage", label: "Damage" },
    { id: "battle", label: "Battle" },
    { id: "wild", label: "Wild" },
    { id: "gba", label: "GBA" },
    { id: "pokedex", label: "Pokédex" },
    { id: "achievements", label: "Badges" },
  ];

  return (
    <div className="min-h-screen bg-[#1a1c2c]">
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
                  className="rounded-lg bg-[#3a4466] px-3 py-1.5 text-sm text-[#f0f0e8] hover:bg-[#4a5577] transition-colors"
                >
                  {shareMessage || "Share Team"}
                </button>
                <button
                  onClick={clearTeam}
                  className="rounded-lg bg-[#3a4466] px-3 py-1.5 text-sm text-[#8b9bb4] hover:bg-[#e8433f] hover:text-[#f0f0e8] transition-colors"
                >
                  Clear
                </button>
              </>
            )}
            <span className="text-sm text-[#8b9bb4]">
              {team.length}/6
            </span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-[#3a4466]">
        <div className="mx-auto flex max-w-6xl px-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-3 py-3 text-sm font-medium font-pixel transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "text-[#f0f0e8]"
                  : "text-[#8b9bb4] hover:text-[#f0f0e8]"
              }`}
            >
              {tab.label}
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
      <main className="mx-auto max-w-6xl px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
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
            {activeTab === "gba" && (
              <GBAEmulatorTab />
            )}
            {activeTab === "pokedex" && (
              <PokedexTracker />
            )}
            {activeTab === "achievements" && (
              <AchievementPanel />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
