import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Regression test for NDS bottom-screen touchscreen input.
//
// Bug: melonDS was configured with `melonds_touch_mode = "Touch"`, which only
// responds to RETRO_DEVICE_POINTER (mobile touchscreens). On desktop browsers,
// mouse clicks on the bottom half of the canvas did nothing — the user could
// see in-game touch buttons but clicking them had no effect.
//
// Fix: use `"Mouse"` so RetroArch's Emscripten frontend routes DOM mouse events
// on the canvas to the core's RETRO_DEVICE_MOUSE handler.
//
// Valid values extracted from public/nds/melonds_libretro.wasm core options:
//   "Touch mode; disabled|Mouse|Touch|Joystick"
//
// This test locks the source-level constant so a future edit back to "Touch"
// (or any other value that breaks desktop input) fails CI.
describe("useNDSEmulator — melonDS touch_mode config", () => {
  const sourcePath = resolve(__dirname, "../useNDSEmulator.ts");
  const source = readFileSync(sourcePath, "utf-8");

  it("sets melonds_touch_mode to \"Mouse\" so desktop clicks register as stylus input", () => {
    // The core option file is written to
    //   /home/web_user/retroarch/userdata/config/melonDS/melonDS.opt
    // via the MELONDS_OPT constant. "Mouse" is required for desktop; "Touch"
    // only handles pointer/touchscreen devices and breaks the bottom screen.
    expect(source).toMatch(/melonds_touch_mode\s*=\s*"Mouse"/);
    expect(source).not.toMatch(/melonds_touch_mode\s*=\s*"Touch"/);
  });

  it("only uses a melonds_touch_mode value the core recognizes", () => {
    // disabled | Mouse | Touch | Joystick — from the WASM core options.
    const match = source.match(/melonds_touch_mode\s*=\s*"([^"]+)"/);
    expect(match).not.toBeNull();
    const value = match![1];
    expect(["disabled", "Mouse", "Touch", "Joystick"]).toContain(value);
  });
});

// Regression test for: "real mouse clicks on bottom screen don't trigger game
// touch input" (after Mouse mode was enabled).
//
// Root cause of the regression: an earlier `blockTopScreenMouse` helper called
// stopImmediatePropagation() on capture-phase mousedown/mousemove/mouseup for
// the top half of the canvas. SDL's rwebinput driver inside melonds_libretro
// registers mousedown/up/move on the SAME "#canvas" element via
// emscripten_set_mousedown_callback — so even bottom-half clicks were at risk
// of being suppressed by any ancestor listener quirk, and registering three
// broad-match blockers on the very element the core listens on is too invasive.
//
// The fix: narrow the blocker to mousemove ONLY, and shadow movementX/movementY
// to 0 (what Mouse mode actually reads) instead of stopImmediatePropagation.
// mousedown/mouseup always flow through to SDL untouched, so real clicks work.
describe("useNDSEmulator — top-screen motion gate must not block clicks", () => {
  const sourcePath = resolve(__dirname, "../useNDSEmulator.ts");
  const source = readFileSync(sourcePath, "utf-8");

  it("does not call stopImmediatePropagation on any mouse event", () => {
    // stopImmediatePropagation at the canvas level can suppress SDL's own
    // canvas-level listener (registered via rwebinput) — including for
    // bottom-half clicks if capture-phase ordering changes. Don't do it.
    expect(source).not.toMatch(/stopImmediatePropagation/);
  });

  it("does not register a capture-phase mousedown/mouseup blocker on the canvas", () => {
    // These two events are what register stylus presses in Mouse mode. They
    // must reach SDL untouched. mousemove is the only event whose delta can
    // drift the stylus while the user is over the (non-touchable) top screen,
    // so only mousemove should be intercepted.
    expect(source).not.toMatch(/addEventListener\(\s*["']mousedown["'][^)]*,\s*true\s*\)/);
    expect(source).not.toMatch(/addEventListener\(\s*["']mouseup["'][^)]*,\s*true\s*\)/);
  });
});
