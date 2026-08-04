import { renderHook, act, waitFor } from "@testing-library/react";
import type { TeamSlot, Move } from "@/types";
import { mockCharizard, mockBlastoise, createMockTeamSlot } from "@/test/mocks/pokemon";

// Force the (large, static) Smogon candidate pool to empty so every generated
// question is built from the caller's own `team` argument — deterministic and
// fetch-free for the "team" source (only `fetchMoveData` is needed to resolve
// a move's damage class/power for the caller's own selectedMoves).
vi.mock("@/data/smogonSets", () => ({ SMOGON_SETS: [] }));

const fetchMoveDataMock = vi.fn((slug: string): Promise<Move> =>
  Promise.resolve({
    id: 1,
    name: slug,
    power: 40,
    accuracy: 100,
    pp: 35,
    priority: 0,
    type: { name: "normal" },
    damage_class: { name: "physical" },
  })
);

vi.mock("@/utils/pokeApiClient", () => ({
  fetchPokemonData: vi.fn(),
  fetchMoveData: (slug: string) => fetchMoveDataMock(slug),
}));

import { useDamageQuiz } from "../useDamageQuiz";

function makeTeam(): TeamSlot[] {
  const charizard = createMockTeamSlot(mockCharizard, 0);
  const blastoise = createMockTeamSlot(mockBlastoise, 1);
  return [charizard, blastoise];
}

afterEach(() => {
  fetchMoveDataMock.mockClear();
});

describe("useDamageQuiz — question loading", () => {
  it("loads a ready question on mount, built from the caller's team", async () => {
    const { result } = renderHook(() => useDamageQuiz(makeTeam()));

    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    const q = result.current.state.question!;
    expect(["charizard", "blastoise"]).toContain(q.attacker.pokemon.name);
    expect(["charizard", "blastoise"]).toContain(q.defender.pokemon.name);
    expect(q.attacker.pokemon.name).not.toBe(q.defender.pokemon.name);
    expect(q.buckets).toHaveLength(4);
    expect(q.correctIndex).toBeGreaterThanOrEqual(0);
    expect(q.correctIndex).toBeLessThan(4);
    expect(result.current.state.score).toBe(0);
    expect(result.current.state.streak).toBe(0);
    expect(result.current.state.bestStreak).toBe(0);
  });

  it("transitions to the error status when no candidate Pokemon are available", async () => {
    // No team passed, and the Smogon pool is mocked empty — the pool is empty.
    const { result } = renderHook(() => useDamageQuiz());

    await waitFor(() => expect(result.current.state.status).toBe("error"));

    expect(result.current.state.error).toBeTruthy();
  });
});

describe("useDamageQuiz — answer", () => {
  it("a correct guess marks correct=true, awards points, and increments the streak", async () => {
    const { result } = renderHook(() => useDamageQuiz(makeTeam()));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    const correctIndex = result.current.state.question!.correctIndex;

    act(() => result.current.answer(correctIndex));

    expect(result.current.state.answered).toBe(true);
    expect(result.current.state.correct).toBe(true);
    expect(result.current.state.guessIndex).toBe(correctIndex);
    expect(result.current.state.streak).toBe(1);
    expect(result.current.state.score).toBe(10);
    expect(result.current.state.bestStreak).toBe(1);
  });

  it("a wrong guess marks correct=false, awards no points, and resets the streak", async () => {
    const { result } = renderHook(() => useDamageQuiz(makeTeam()));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    const correctIndex = result.current.state.question!.correctIndex;
    const wrongIndex = (correctIndex + 1) % 4;

    act(() => result.current.answer(wrongIndex));

    expect(result.current.state.correct).toBe(false);
    expect(result.current.state.streak).toBe(0);
    expect(result.current.state.score).toBe(0);
  });

  it("bestStreak is a high-water mark that survives a later wrong answer resetting the current streak", async () => {
    const { result } = renderHook(() => useDamageQuiz(makeTeam()));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    act(() => result.current.answer(result.current.state.question!.correctIndex));
    expect(result.current.state.streak).toBe(1);
    expect(result.current.state.bestStreak).toBe(1);

    act(() => result.current.next());
    await waitFor(() => expect(result.current.state.status).toBe("ready"));

    const wrongIndex = (result.current.state.question!.correctIndex + 1) % 4;
    act(() => result.current.answer(wrongIndex));

    expect(result.current.state.streak).toBe(0);
    expect(result.current.state.bestStreak).toBe(1); // unchanged, not reset
  });

  it("a second answer call is a no-op once the question has already been answered", async () => {
    const { result } = renderHook(() => useDamageQuiz(makeTeam()));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    const correctIndex = result.current.state.question!.correctIndex;
    const wrongIndex = (correctIndex + 1) % 4;

    act(() => result.current.answer(correctIndex));
    expect(result.current.state.score).toBe(10);

    act(() => result.current.answer(wrongIndex));

    // Still reflects the first (correct) answer — the second call was ignored.
    expect(result.current.state.guessIndex).toBe(correctIndex);
    expect(result.current.state.correct).toBe(true);
    expect(result.current.state.score).toBe(10);
  });
});

describe("useDamageQuiz — next/retry", () => {
  it("next() loads a fresh question and resets answered/guessIndex/correct", async () => {
    const { result } = renderHook(() => useDamageQuiz(makeTeam()));
    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    act(() => result.current.answer(result.current.state.question!.correctIndex));
    expect(result.current.state.answered).toBe(true);

    act(() => result.current.next());

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state.answered).toBe(false);
    expect(result.current.state.guessIndex).toBeNull();
    expect(result.current.state.correct).toBeNull();
    // Score/streak from the previous question are preserved across next().
    expect(result.current.state.score).toBe(10);
  });

  it("retry() re-attempts question generation after an error", async () => {
    const { result, rerender } = renderHook(
      ({ team }: { team?: TeamSlot[] }) => useDamageQuiz(team),
      { initialProps: { team: undefined as TeamSlot[] | undefined } }
    );
    await waitFor(() => expect(result.current.state.status).toBe("error"));

    // Give the hook a usable team, then retry — the hook reads team via a ref
    // updated on every render, so the next generation attempt picks it up.
    rerender({ team: makeTeam() });
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.state.status).toBe("ready"));
    expect(result.current.state.question).not.toBeNull();
  });
});
