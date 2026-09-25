"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTeam, encodeTeam } from "@/hooks/useTeam";
import { useTeamFromUrl } from "@/hooks/useTeamFromUrl";
import { usePokedexContext } from "@/contexts/PokedexContext";
import { useAchievementsContext } from "@/contexts/AchievementsContext";
import { useFeatureFlagsContext } from "@/contexts/FeatureFlagsContext";
import { TOAST_DURATION } from "@/data/constants";
import { importFromShowdown } from "@/utils/showdownFormatWasm";
import ErrorBoundary from "@/components/ErrorBoundary";
import AudioPlayer from "@/components/AudioPlayer";
import TypeReference from "@/components/TypeReference";
import DataManagerButton from "@/components/DataManagerButton";
import { TAB_REGISTRY, type Tab, type TabPanelContext } from "@/app/tabRegistry";

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
  const { features, announcement } = useFeatureFlagsContext();
  const prevTeamSize = useRef(0);
  const shouldReduceMotion = useReducedMotion();

  // Load team from URL params on mount (?add=<id>, ?team=<encoded>)
  useTeamFromUrl(addPokemon, setTeam);

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

  // Preload WASM modules after the page is idle to avoid blocking mobile
  useEffect(() => {
    const load = () => {
      Promise.allSettled([
        import("@/utils/damageWasm").then((m) => m.ensureWasmReady()),
        import("@/utils/statsWasm").then((m) => m.ensureWasmReady()),
        import("@/utils/teamAnalysisWasm").then((m) => m.ensureWasmReady()),
        import("@/utils/aiWasm").then((m) => m.ensureWasmReady()),
        import("@/utils/catchRateWasm").then((m) => m.ensureWasmReady()),
        import("@/utils/breedingWasm").then((m) => m.ensureWasmReady()),
        import("@/utils/showdownFormatWasm").then((m) => m.ensureWasmReady()),
      ]);
    };
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(load);
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(load, 2000);
    return () => clearTimeout(t);
  }, []);

  const handleShare = useCallback(() => {
    if (team.length === 0) return;
    const encoded = encodeTeam(team);
    const url = `${window.location.origin}${window.location.pathname}?team=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareMessage("Link copied!");
      setTimeout(() => setShareMessage(""), TOAST_DURATION);
    });
  }, [team]);

  const handleLoadTemplate = useCallback(async (showdownPaste: string) => {
    const slots = await importFromShowdown(showdownPaste);
    if (slots.length > 0) setTeam(slots);
  }, [setTeam]);

  const [selectedTeamPokemonIdx, setSelectedTeamPokemonIdx] = useState(0);

  useEffect(() => {
    if (selectedTeamPokemonIdx >= team.length && team.length > 0) {
      setSelectedTeamPokemonIdx(team.length - 1);
    }
  }, [team.length, selectedTeamPokemonIdx]);

  const visibleTabs = useMemo(
    () => TAB_REGISTRY.filter((tab) => !tab.visible || tab.visible(features)),
    [features]
  );

  // If the active tab disappears (a feature flag flips off mid-session), fall
  // back to the first visible tab instead of leaving activeTab pointing at an
  // entry that's no longer in visibleTabs — see activeEntry below.
  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === activeTab)) {
      const next = visibleTabs[0];
      if (next) setActiveTab(next.id);
    }
  }, [visibleTabs, activeTab]);

  // Ctrl+1..9 keyboard shortcuts for tab switching, plus Ctrl+0 for the 10th
  // tab — there's no "Ctrl+10", so 0 is the conventional stand-in once the
  // registry grows past 9 entries (it currently has 10, incl. Daily).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const digit = parseInt(e.key, 10);
      if (Number.isNaN(digit)) return;
      const tabNumber = digit === 0 ? 10 : digit;
      if (tabNumber >= 1 && tabNumber <= visibleTabs.length) {
        e.preventDefault();
        setActiveTab(visibleTabs[tabNumber - 1].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visibleTabs]);

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, tabId: Tab) => {
      const idx = visibleTabs.findIndex((t) => t.id === tabId);
      let nextIdx = -1;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextIdx = (idx + 1) % visibleTabs.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextIdx = (idx - 1 + visibleTabs.length) % visibleTabs.length;
      }
      if (nextIdx >= 0) {
        setActiveTab(visibleTabs[nextIdx].id);
        document.getElementById(`tab-${visibleTabs[nextIdx].id}`)?.focus();
      }
    },
    [visibleTabs]
  );

  const teamPokemon = useMemo(() => team.map((s) => s.pokemon), [team]);
  const motionDuration = shouldReduceMotion ? 0 : 0.2;

  // Bundles the props every tab panel needs — built once per render, passed to the registry.
  const panelContext: TabPanelContext = useMemo(
    () => ({
      team,
      teamPokemon,
      addPokemon,
      removePokemon,
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
      handleLoadTemplate,
      selectedTeamPokemonIdx,
      setSelectedTeamPokemonIdx,
      isEmulatorTabActive: activeTab === "emulator",
    }),
    [
      team,
      teamPokemon,
      addPokemon,
      removePokemon,
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
      handleLoadTemplate,
      selectedTeamPokemonIdx,
      activeTab,
    ]
  );

  if (features.maintenanceMode) {
    return (
      <div className="min-h-screen bg-[#1a1c2c] flex items-center justify-center">
        <div className="rounded-xl border border-[#3a4466] bg-[#262b44] p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-[#f0f0e8] font-pixel mb-4">
            Under Maintenance
          </h1>
          <p className="text-[#8b9bb4] font-pixel text-sm">
            Check back soon
          </p>
        </div>
      </div>
    );
  }

  const tabpanelId = `tabpanel-${activeTab}`;
  // Resolve from visibleTabs, not TAB_REGISTRY — a tab hidden by a feature flag
  // must not render its panel just because TAB_REGISTRY still has the entry.
  const activeEntry = visibleTabs.find((t) => t.id === activeTab);

  return (
    <div className="min-h-screen bg-[#1a1c2c]">
      {/* Announcement Banner */}
      {announcement.banner && (
        <div className={`px-4 py-2 text-center font-[family-name:var(--font-pixel-body)] text-sm ${
          announcement.bannerType === "error" ? "bg-red-900/50 text-red-200" :
          announcement.bannerType === "warning" ? "bg-yellow-900/50 text-yellow-200" :
          "bg-blue-900/50 text-blue-200"
        }`}>
          {announcement.banner}
        </div>
      )}

      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-[#e8433f] focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-pixel focus:text-sm"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="border-b border-[#3a4466] bg-[#262b44]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 gap-2 flex-wrap sm:flex-nowrap">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-[#f0f0e8] font-pixel truncate">
              Pokemon Team Builder
            </h1>
            <p className="text-sm text-[#8b9bb4] hidden sm:block">
              Build, analyze, and simulate battles
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <AudioPlayer />
            {team.length > 0 && (
              <>
                {features.enableSharing && (
                  <button
                    onClick={handleShare}
                    aria-label="Share team link"
                    className="rounded-lg bg-[#3a4466] px-4 py-2 text-base text-[#f0f0e8] hover:bg-[#4a5577] transition-colors"
                  >
                    {shareMessage || "Share Team"}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (window.confirm("Clear your entire team?")) clearTeam();
                  }}
                  aria-label="Clear all team members"
                  className="rounded-lg bg-[#3a4466] px-4 py-2 text-base text-[#8b9bb4] hover:bg-[#e8433f] hover:text-[#f0f0e8] transition-colors"
                >
                  Clear
                </button>
              </>
            )}
            <DataManagerButton />
            <span className="text-base text-[#8b9bb4]" aria-live="polite">
              {team.length}/6
            </span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-[#3a4466]" aria-label="Main navigation">
        <div className="mx-auto flex max-w-[1400px] px-6 overflow-x-auto" role="tablist" aria-label="App sections">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              {...{ "aria-selected": activeTab === tab.id }}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
              className={`relative px-4 py-3 text-base font-medium font-pixel transition-colors whitespace-nowrap ${
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

      {/* Content — id="main-content" is a stable target for the skip link above;
          the dynamic tabpanel id/role/aria-labelledby move onto whichever inner
          wrapper is currently showing (keep-mounted tab or the animated one). */}
      <main id="main-content" className="mx-auto max-w-[1400px] px-6 py-8">
        {/* Keep-mounted tabs (e.g. emulator) stay in the DOM so internal state — like
            WASM/audio — survives switching away from and back to this tab. */}
        {TAB_REGISTRY.filter(
          (entry) => entry.keepMounted && (!entry.visible || entry.visible(features))
        ).map((entry) => (
          <div
            key={entry.id}
            id={activeTab === entry.id ? tabpanelId : undefined}
            role={activeTab === entry.id ? "tabpanel" : undefined}
            aria-labelledby={activeTab === entry.id ? `tab-${entry.id}` : undefined}
            style={{ display: activeTab === entry.id ? "block" : "none" }}
          >
            <ErrorBoundary fallbackLabel={entry.fallbackLabel}>
              {entry.panel(panelContext)}
            </ErrorBoundary>
          </div>
        ))}

        <AnimatePresence mode="wait">
          {activeEntry && !activeEntry.keepMounted && (
            <motion.div
              key={activeTab}
              id={tabpanelId}
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: motionDuration }}
            >
              <ErrorBoundary fallbackLabel={activeEntry.fallbackLabel}>
                {activeEntry.panel(panelContext)}
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <TypeReference />
    </div>
  );
}
