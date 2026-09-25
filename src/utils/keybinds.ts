// Shared keybind configuration for all emulators (GBA, NDS, 3DS)
// Persisted to localStorage so remaps survive page reloads
import { STORAGE_KEYS, readStorageValidated, writeStorage } from "@/utils/persistence";

export type EmulatorButton =
  | "A" | "B" | "X" | "Y"
  | "L" | "R"
  | "START" | "SELECT"
  | "UP" | "DOWN" | "LEFT" | "RIGHT";

export const ALL_BUTTONS: EmulatorButton[] = [
  "UP", "DOWN", "LEFT", "RIGHT",
  "A", "B", "X", "Y",
  "L", "R",
  "START", "SELECT",
];

// keyboard key (lowercase) -> emulator button
export const DEFAULT_KEYBINDS: Record<string, EmulatorButton> = {
  arrowup: "UP",
  arrowdown: "DOWN",
  arrowleft: "LEFT",
  arrowright: "RIGHT",
  z: "A",
  x: "B",
  c: "X",
  v: "Y",
  a: "L",
  s: "R",
  enter: "START",
  backspace: "SELECT",
};

function validateKeybinds(raw: unknown): Record<string, EmulatorButton> | null {
  if (raw == null || typeof raw !== "object") return null;
  const parsed = raw as Record<string, EmulatorButton>;
  const buttons = new Set(Object.values(parsed));
  if (ALL_BUTTONS.every((b) => buttons.has(b))) return parsed;
  return null;
}

export function loadKeybinds(): Record<string, EmulatorButton> {
  return readStorageValidated(STORAGE_KEYS.keybinds, { ...DEFAULT_KEYBINDS }, validateKeybinds);
}

export function saveKeybinds(binds: Record<string, EmulatorButton>): void {
  writeStorage(STORAGE_KEYS.keybinds, binds);
  window.dispatchEvent(new Event("keybinds-changed"));
}

export function resetKeybinds(): Record<string, EmulatorButton> {
  const defaults = { ...DEFAULT_KEYBINDS };
  saveKeybinds(defaults);
  return defaults;
}

// Inverted map: button -> display-friendly key name
export function getButtonToKey(
  binds: Record<string, EmulatorButton>
): Record<EmulatorButton, string> {
  const result = {} as Record<EmulatorButton, string>;
  for (const [key, button] of Object.entries(binds)) {
    result[button] = formatKeyName(key);
  }
  return result;
}

function formatKeyName(key: string): string {
  const map: Record<string, string> = {
    arrowup: "Up",
    arrowdown: "Down",
    arrowleft: "Left",
    arrowright: "Right",
    enter: "Enter",
    backspace: "Backspace",
    " ": "Space",
    escape: "Esc",
    tab: "Tab",
    control: "Ctrl",
    shift: "Shift",
    alt: "Alt",
    meta: "Meta",
  };
  return map[key] ?? key.toUpperCase();
}
