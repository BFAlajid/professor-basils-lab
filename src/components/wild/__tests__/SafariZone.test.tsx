import { render, screen, fireEvent } from "@testing-library/react";
import { mockCharizard } from "@/test/mocks/pokemon";
import type { SafariZoneState } from "@/types";

// SafariSummaryView (rendered by SafariZone on the summary phase) calls
// useLeaderboard, which fires an async submitScore on mount — unrelated to
// the add-to-box guard under test here, so it's stubbed out to keep the test
// focused and avoid unrelated act() warnings from its fetch-driven effect.
vi.mock("@/hooks/useLeaderboard", () => ({
  useLeaderboard: () => ({
    entries: [],
    playerRank: null,
    isLoading: false,
    error: null,
    submitScore: vi.fn().mockResolvedValue(undefined),
  }),
}));

import SafariZone from "../SafariZone";

// ---------------------------------------------------------------------------
// Fix 3: "collected" is derived from provider state (state.collected), not
// component-local state, so a stale summary screen (e.g. reopened via
// togglePanel after the trip was already collected) can't double-add.
// ---------------------------------------------------------------------------

function buildSummaryState(overrides?: Partial<SafariZoneState>): SafariZoneState {
  return {
    phase: "summary",
    ballsRemaining: 20,
    stepsRemaining: 100,
    currentPokemon: null,
    caughtPokemon: [{ pokemon: mockCharizard, level: 12, isShiny: false }],
    lastAction: null,
    lastResult: null,
    isCaught: false,
    isFled: false,
    region: "kanto",
    collected: false,
    ...overrides,
  };
}

const noop = () => {};

describe("SafariZone summary — add-to-box guard", () => {
  it("calls onAddAllToBox once when not yet collected", () => {
    const onAddAllToBox = vi.fn();
    render(
      <SafariZone
        state={buildSummaryState()}
        isSearching={false}
        onEnter={noop}
        onSearch={noop}
        onThrowBall={noop}
        onThrowRock={noop}
        onThrowBait={noop}
        onRun={noop}
        onContinue={noop}
        onExit={noop}
        onReset={noop}
        onAddAllToBox={onAddAllToBox}
        onClose={noop}
      />
    );

    fireEvent.click(screen.getByText("Add All to PC Box"));
    expect(onAddAllToBox).toHaveBeenCalledTimes(1);
  });

  it("does not call onAddAllToBox again once state.collected is true (stale remount)", () => {
    const onAddAllToBox = vi.fn();
    render(
      <SafariZone
        state={buildSummaryState({ collected: true })}
        isSearching={false}
        onEnter={noop}
        onSearch={noop}
        onThrowBall={noop}
        onThrowRock={noop}
        onThrowBait={noop}
        onRun={noop}
        onContinue={noop}
        onExit={noop}
        onReset={noop}
        onAddAllToBox={onAddAllToBox}
        onClose={noop}
      />
    );

    const button = screen.getByText("Added to PC Box!");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onAddAllToBox).not.toHaveBeenCalled();
  });
});
