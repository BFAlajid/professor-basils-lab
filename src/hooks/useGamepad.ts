"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// GBA button names used by the hook's callbacks
export type GBAButton =
  | "A"
  | "B"
  | "L"
  | "R"
  | "START"
  | "SELECT"
  | "UP"
  | "DOWN"
  | "LEFT"
  | "RIGHT";

interface UseGamepadOptions {
  /** Called when a gamepad button is pressed */
  onButtonPress?: (button: GBAButton) => void;
  /** Called when a gamepad button is released */
  onButtonRelease?: (button: GBAButton) => void;
  /** Whether gamepad polling is active (default: true) */
  enabled?: boolean;
}

interface UseGamepadReturn {
  connected: boolean;
  controllerName: string | null;
}

/**
 * Standard Gamepad API button indices (standard mapping):
 *  0 = A (bottom)      / Cross (PS) / B (Switch)
 *  1 = B (right)       / Circle (PS) / A (Switch)
 *  2 = X (left)        / Square (PS) / Y (Switch)
 *  3 = Y (top)         / Triangle (PS) / X (Switch)
 *  4 = L1 / LB         / L (Switch)
 *  5 = R1 / RB         / R (Switch)
 *  6 = L2 / LT
 *  7 = R2 / RT
 *  8 = Select / Back / Share / Minus
 *  9 = Start / Forward / Options / Plus
 * 10 = Left Stick press
 * 11 = Right Stick press
 * 12 = D-pad Up
 * 13 = D-pad Down
 * 14 = D-pad Left
 * 15 = D-pad Right
 *
 * Standard Gamepad API axes:
 *  0 = Left stick X (-1 = left, +1 = right)
 *  1 = Left stick Y (-1 = up, +1 = down)
 */

// Map standard gamepad button indices to GBA button names
const BUTTON_MAP: Record<number, GBAButton> = {
  0: "A",       // A / Cross / B(Switch)
  1: "B",       // B / Circle / A(Switch)
  4: "L",       // L1 / LB
  5: "R",       // R1 / RB
  8: "SELECT",  // Select / Back / Share
  9: "START",   // Start / Options / Plus
  12: "UP",     // D-pad Up
  13: "DOWN",   // D-pad Down
  14: "LEFT",   // D-pad Left
  15: "RIGHT",  // D-pad Right
};

const ANALOG_DEADZONE = 0.5;

// Analog stick directions treated as virtual buttons
const ANALOG_BUTTONS = ["UP", "DOWN", "LEFT", "RIGHT"] as const;

export function useGamepad(options: UseGamepadOptions = {}): UseGamepadReturn {
  const { onButtonPress, onButtonRelease, enabled = true } = options;

  const [connected, setConnected] = useState(false);
  const [controllerName, setControllerName] = useState<string | null>(null);

  // Use refs for callbacks so the polling loop always sees latest values
  // without needing to restart the rAF loop
  const onPressRef = useRef(onButtonPress);
  const onReleaseRef = useRef(onButtonRelease);
  onPressRef.current = onButtonPress;
  onReleaseRef.current = onButtonRelease;

  // Track previous button states to detect edges (press/release)
  const prevButtonsRef = useRef<Record<string, boolean>>({});
  const rafIdRef = useRef<number>(0);

  const pollGamepads = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return;

    const gamepads = navigator.getGamepads();
    let activeGamepad: Gamepad | null = null;

    // Find the first connected gamepad
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        activeGamepad = gamepads[i];
        break;
      }
    }

    if (!activeGamepad) {
      if (connected) {
        setConnected(false);
        setControllerName(null);
        prevButtonsRef.current = {};
      }
      return;
    }

    // Update connection state
    if (!connected || controllerName !== activeGamepad.id) {
      setConnected(true);
      setControllerName(activeGamepad.id);
    }

    const currentButtons: Record<string, boolean> = {};
    const prev = prevButtonsRef.current;

    // Read physical button states
    for (const [indexStr, gbaButton] of Object.entries(BUTTON_MAP)) {
      const index = Number(indexStr);
      if (index < activeGamepad.buttons.length) {
        currentButtons[gbaButton] = activeGamepad.buttons[index].pressed;
      }
    }

    // Read analog stick and map to D-pad with deadzone
    if (activeGamepad.axes.length >= 2) {
      const axisX = activeGamepad.axes[0];
      const axisY = activeGamepad.axes[1];

      // Analog stick overrides D-pad buttons if pushed past deadzone.
      // If the physical D-pad already has the direction pressed, keep it.
      if (axisY < -ANALOG_DEADZONE) {
        currentButtons["UP"] = true;
      }
      if (axisY > ANALOG_DEADZONE) {
        currentButtons["DOWN"] = true;
      }
      if (axisX < -ANALOG_DEADZONE) {
        currentButtons["LEFT"] = true;
      }
      if (axisX > ANALOG_DEADZONE) {
        currentButtons["RIGHT"] = true;
      }

      // Ensure analog directions have explicit false if not set
      for (const dir of ANALOG_BUTTONS) {
        if (currentButtons[dir] === undefined) {
          currentButtons[dir] = false;
        }
      }
    }

    // Detect state changes (edges) and fire callbacks
    for (const [button, pressed] of Object.entries(currentButtons)) {
      const wasPressed = prev[button] ?? false;

      if (pressed && !wasPressed) {
        onPressRef.current?.(button as GBAButton);
      } else if (!pressed && wasPressed) {
        onReleaseRef.current?.(button as GBAButton);
      }
    }

    // Also check for buttons that were in prev but not in current
    // (in case a gamepad disconnects mid-press)
    for (const button of Object.keys(prev)) {
      if (prev[button] && currentButtons[button] === undefined) {
        onReleaseRef.current?.(button as GBAButton);
      }
    }

    prevButtonsRef.current = currentButtons;
  }, [connected, controllerName]);

  useEffect(() => {
    if (!enabled) {
      // Clean up when disabled: release any held buttons
      const prev = prevButtonsRef.current;
      for (const [button, pressed] of Object.entries(prev)) {
        if (pressed) {
          onReleaseRef.current?.(button as GBAButton);
        }
      }
      prevButtonsRef.current = {};
      return;
    }

    let running = true;

    const loop = () => {
      if (!running) return;
      pollGamepads();
      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    // Listen for connect/disconnect events for immediate feedback
    const handleConnect = (e: GamepadEvent) => {
      setConnected(true);
      setControllerName(e.gamepad.id);
    };

    const handleDisconnect = () => {
      setConnected(false);
      setControllerName(null);
      // Release all held buttons on disconnect
      const prev = prevButtonsRef.current;
      for (const [button, pressed] of Object.entries(prev)) {
        if (pressed) {
          onReleaseRef.current?.(button as GBAButton);
        }
      }
      prevButtonsRef.current = {};
    };

    window.addEventListener("gamepadconnected", handleConnect);
    window.addEventListener("gamepaddisconnected", handleDisconnect);

    return () => {
      running = false;
      cancelAnimationFrame(rafIdRef.current);
      window.removeEventListener("gamepadconnected", handleConnect);
      window.removeEventListener("gamepaddisconnected", handleDisconnect);
    };
  }, [enabled, pollGamepads]);

  return { connected, controllerName };
}
