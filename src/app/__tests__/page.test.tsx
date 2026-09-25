import { render, screen, act } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks — page.tsx pulls in a lot (team hooks, 3 contexts, the tab registry,
// WASM preloads); everything below is stubbed so this test isolates exactly
// the bug under test: activeTab/visibleTabs desync when a feature flag
// hides the currently-active tab.
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useTeam", () => ({
  useTeam: () => ({
    team: [],
    addPokemon: vi.fn(),
    removePokemon: vi.fn(),
    clearTeam: vi.fn(),
    isFull: false,
    setNature: vi.fn(),
    setEvs: vi.fn(),
    setIvs: vi.fn(),
    setAbility: vi.fn(),
    setHeldItem: vi.fn(),
    setMoves: vi.fn(),
    setTeraType: vi.fn(),
    setForme: vi.fn(),
    setTeam: vi.fn(),
  }),
  encodeTeam: vi.fn(() => ""),
}));

vi.mock("@/hooks/useTeamFromUrl", () => ({
  useTeamFromUrl: vi.fn(),
}));

vi.mock("@/contexts/PokedexContext", () => ({
  usePokedexContext: () => ({ markSeen: vi.fn() }),
}));

vi.mock("@/contexts/AchievementsContext", () => ({
  useAchievementsContext: () => ({ incrementStat: vi.fn() }),
}));

const { featuresRef } = vi.hoisted(() => ({
  featuresRef: {
    current: {
      enableSharing: true,
      enableLeaderboards: true,
      enableGated: true,
      enableMultiplayer: true,
      maintenanceMode: false,
    } as Record<string, boolean>,
  },
}));

vi.mock("@/contexts/FeatureFlagsContext", () => ({
  useFeatureFlagsContext: () => ({
    features: featuresRef.current,
    announcement: { banner: null, bannerType: "info" },
  }),
}));

vi.mock("@/app/tabRegistry", () => ({
  TAB_REGISTRY: [
    {
      id: "team",
      label: "Team",
      short: "Team",
      fallbackLabel: "Team crashed",
      panel: () => <div data-testid="panel-team">Team Panel</div>,
    },
    {
      id: "gated",
      label: "Gated",
      short: "Gate",
      fallbackLabel: "Gated crashed",
      // keepMounted mirrors the real "emulator" tab — the only TAB_REGISTRY
      // entry with a `visible` gate today (Wave 7 review, finding #9).
      keepMounted: true,
      visible: (features: Record<string, boolean>) => !!features.enableGated,
      panel: () => <div data-testid="panel-gated">Gated Panel</div>,
    },
  ],
}));

vi.mock("@/components/ErrorBoundary", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/AudioPlayer", () => ({ default: () => null }));
vi.mock("@/components/TypeReference", () => ({ default: () => null }));
vi.mock("@/components/DataManagerButton", () => ({ default: () => null }));

import Home from "../page";

// Regression (Wave 7 review, finding #9): activeEntry used to resolve from
// TAB_REGISTRY (which always has every tab) instead of visibleTabs, and
// nothing reset activeTab when the active tab's feature flag flipped off.
// For a keepMounted+gated tab like "emulator", that left BOTH render paths
// skipping it — content area goes blank with no tab selected.
describe("Home — active tab vs visibleTabs", () => {
  beforeEach(() => {
    featuresRef.current = {
      enableSharing: true,
      enableLeaderboards: true,
      enableGated: true,
      enableMultiplayer: true,
      maintenanceMode: false,
    };
  });

  it("resets off a tab that disappears when its feature flag flips off", async () => {
    const { rerender } = render(<Home />);

    // The button's accessible name concatenates both responsive <span>
    // labels (jsdom doesn't apply the Tailwind hidden/md:inline CSS), so
    // match on a substring rather than the exact visible label.
    const gatedTab = screen.getByRole("tab", { name: /Gated/i });
    await act(async () => {
      gatedTab.click();
    });
    expect(screen.getByTestId("panel-gated")).toBeInTheDocument();

    // Flip the flag off mid-session and force a re-render, exactly like a
    // live Edge Config update flowing through FeatureFlagsContext.
    featuresRef.current = { ...featuresRef.current, enableGated: false };
    await act(async () => {
      rerender(<Home />);
    });

    // The gated tab's button is gone from the tab list...
    expect(screen.queryByRole("tab", { name: /Gated/i })).not.toBeInTheDocument();
    // ...and the content area must not be left blank — it falls back to the
    // first visible tab instead of rendering nothing.
    expect(screen.getByTestId("panel-team")).toBeInTheDocument();
    expect(screen.queryByTestId("panel-gated")).not.toBeInTheDocument();
  });

  it("keeps the tab list and content in sync when no flag changes", () => {
    render(<Home />);
    expect(screen.getByTestId("panel-team")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Gated/i })).toBeInTheDocument();
  });
});
