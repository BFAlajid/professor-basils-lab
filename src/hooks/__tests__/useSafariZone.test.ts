import { renderHook, act } from "@testing-library/react";
import { useSafariZone } from "../useSafariZone";

// ---------------------------------------------------------------------------
// Fix 3: safari re-add duplication guard lives in provider (reducer) state,
// not component state, so it survives the panel unmounting/remounting.
// ---------------------------------------------------------------------------

describe("useSafariZone", () => {
  it("starts with collected=false", () => {
    const { result } = renderHook(() => useSafariZone());
    expect(result.current.state.collected).toBe(false);
  });

  it("markCollected flips collected to true and it stays true across rerenders", () => {
    const { result, rerender } = renderHook(() => useSafariZone());

    act(() => {
      result.current.markCollected();
    });
    expect(result.current.state.collected).toBe(true);

    // Simulate the panel unmounting/remounting via togglePanel: this hook lives
    // at the WildTabProvider level, so a rerender of the consumer (not the hook
    // itself unmounting) must not lose the flag.
    rerender();
    expect(result.current.state.collected).toBe(true);
  });

  it("resets collected to false when a new safari trip starts", () => {
    const { result } = renderHook(() => useSafariZone());

    act(() => {
      result.current.markCollected();
    });
    expect(result.current.state.collected).toBe(true);

    act(() => {
      result.current.enterSafari("kanto");
    });
    expect(result.current.state.collected).toBe(false);
  });

  it("resets collected to false on RESET", () => {
    const { result } = renderHook(() => useSafariZone());

    act(() => {
      result.current.markCollected();
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.state.collected).toBe(false);
  });
});
