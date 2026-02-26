// Singleton emulator instance manager
// Ensures only one emulator (GBA, NDS, or 3DS) runs at a time

export type EmulatorType = "gba" | "nds" | "ctr";

interface EmulatorCallbacks {
  shutdown: () => Promise<void>;
  pause: () => void;
  resume: () => void;
}

let activeEmulator: EmulatorType | null = null;
let activeCallbacks: EmulatorCallbacks | null = null;

export function getActiveEmulator(): EmulatorType | null {
  return activeEmulator;
}

export function isEmulatorActive(type: EmulatorType): boolean {
  return activeEmulator === type;
}

// Register as the active emulator, shutting down any previously active one
export async function registerEmulator(
  type: EmulatorType,
  callbacks: EmulatorCallbacks
): Promise<void> {
  if (activeEmulator && activeEmulator !== type && activeCallbacks) {
    await activeCallbacks.shutdown();
  }
  activeEmulator = type;
  activeCallbacks = callbacks;
}

// Update callbacks for an already-registered emulator (e.g. when refs change)
export function updateCallbacks(
  type: EmulatorType,
  callbacks: EmulatorCallbacks
): void {
  if (activeEmulator === type) {
    activeCallbacks = callbacks;
  }
}

export async function shutdownActive(): Promise<void> {
  if (activeCallbacks) {
    await activeCallbacks.shutdown();
  }
  activeEmulator = null;
  activeCallbacks = null;
}

// Clear registration without calling shutdown (for when hook already cleaned up)
export function unregister(type: EmulatorType): void {
  if (activeEmulator === type) {
    activeEmulator = null;
    activeCallbacks = null;
  }
}
