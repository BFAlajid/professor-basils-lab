import { render, screen, fireEvent } from "@testing-library/react";
import { mockCharizard } from "@/test/mocks/pokemon";
import type { BreedingEgg } from "@/types";

vi.mock("@/hooks/useDayCare", () => ({
  useDayCare: vi.fn(),
}));

import DayCare from "../DayCare";
import { useDayCare } from "@/hooks/useDayCare";

// ---------------------------------------------------------------------------
// Fix 2: breeding -> box wiring. hatchEgg already produces egg.hatchedPokemon
// (tested elsewhere); this covers the missing delivery path: an "Add to Box"
// button that deposits it and removes the egg, plus a confirm gate on Remove
// since it permanently discards the bred Pokemon.
// ---------------------------------------------------------------------------

function buildHatchedEgg(overrides?: Partial<BreedingEgg>): BreedingEgg {
  return {
    id: "egg-1",
    parent1: {
      pokemon: mockCharizard,
      caughtWith: "poke-ball",
      caughtInArea: "Day Care",
      caughtDate: new Date().toISOString(),
      level: 20,
      nature: { name: "adamant", increased: "attack", decreased: "spAtk" },
      ivs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
      ability: "blaze",
    },
    parent2: {
      pokemon: mockCharizard,
      caughtWith: "poke-ball",
      caughtInArea: "Day Care",
      caughtDate: new Date().toISOString(),
      level: 20,
      nature: { name: "adamant", increased: "attack", decreased: "spAtk" },
      ivs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
      ability: "blaze",
    },
    speciesId: 6,
    speciesName: "charizard",
    stepsRequired: 1000,
    stepsCompleted: 1000,
    isHatched: true,
    hatchedPokemon: {
      pokemon: mockCharizard,
      caughtWith: "poke-ball",
      caughtInArea: "Day Care",
      caughtDate: new Date().toISOString(),
      level: 1,
      nature: { name: "adamant", increased: "attack", decreased: "spAtk" },
      ivs: { hp: 31, attack: 31, defense: 31, spAtk: 31, spDef: 31, speed: 31 },
      ability: "blaze",
    },
    inheritedIVs: [],
    inheritedNature: "random",
    inheritedAbility: "blaze",
    eggMoves: [],
    ...overrides,
  };
}

function mockHookReturn(eggs: BreedingEgg[], removeEgg = vi.fn()) {
  vi.mocked(useDayCare).mockReturnValue({
    state: {
      currentPair: null,
      eggs,
      isCompatible: false,
      compatibilityMessage: "Select two Pokemon to check compatibility.",
    },
    isCheckingCompat: false,
    setPair: vi.fn(),
    clearPair: vi.fn(),
    collectEgg: vi.fn(),
    hatchEgg: vi.fn(),
    removeEgg,
  });
}

describe("DayCare — hatch to box delivery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("Add to Box deposits the hatched Pokemon and removes the egg", () => {
    const removeEgg = vi.fn();
    const egg = buildHatchedEgg();
    mockHookReturn([egg], removeEgg);
    const onAddToBox = vi.fn();

    render(<DayCare box={[]} onAddToBox={onAddToBox} />);

    fireEvent.click(screen.getByText("Add to Box"));

    expect(onAddToBox).toHaveBeenCalledWith(egg.hatchedPokemon);
    expect(removeEgg).toHaveBeenCalledWith(0);
  });

  it("gates Remove behind window.confirm since it permanently discards the bred Pokemon", () => {
    const removeEgg = vi.fn();
    const egg = buildHatchedEgg();
    mockHookReturn([egg], removeEgg);

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<DayCare box={[]} onAddToBox={vi.fn()} />);

    fireEvent.click(screen.getByText("Remove"));

    expect(confirmSpy).toHaveBeenCalled();
    expect(removeEgg).not.toHaveBeenCalled();
  });

  it("removes the egg when the user confirms Remove", () => {
    const removeEgg = vi.fn();
    const egg = buildHatchedEgg();
    mockHookReturn([egg], removeEgg);

    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<DayCare box={[]} onAddToBox={vi.fn()} />);

    fireEvent.click(screen.getByText("Remove"));

    expect(removeEgg).toHaveBeenCalledWith(0);
  });

  it("does not show Add to Box for an unhatched egg", () => {
    const egg = buildHatchedEgg({ isHatched: false, hatchedPokemon: null, stepsCompleted: 500 });
    mockHookReturn([egg]);

    render(<DayCare box={[]} onAddToBox={vi.fn()} />);

    expect(screen.queryByText("Add to Box")).not.toBeInTheDocument();
  });
});
