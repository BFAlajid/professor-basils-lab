/** Trainer identity helpers for leaderboard submissions. */

import { STORAGE_KEYS, readStorageString, writeStorageString, removeStorage } from "@/utils/persistence";

const DEVICE_KEY_BYTES = 32;

// The leaderboard/daily APIs require trainerId to be 5-10 digits (see
// TRAINER_ID_PATTERN in api/leaderboard/route.ts and api/daily/route.ts) —
// widened from a strict 5 digits (~90k values, collision-prone past a few
// hundred submitters) to 9 digits for newly-generated ids. The 5-digit floor
// stays so ids issued before this change keep validating (byte-compatible
// upgrade — no silent identity reset for existing players).
const TRAINER_ID_PATTERN = /^\d{5,10}$/;

function generateTrainerId(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return String(100000000 + (arr[0] % 900000000));
  }
  return String(100000000 + Math.floor(Math.random() * 900000000));
}

function generateDeviceKey(): string {
  const arr = new Uint8Array(DEVICE_KEY_BYTES);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getTrainerId(): string {
  const id = readStorageString(STORAGE_KEYS.trainerId, "");
  if (id && TRAINER_ID_PATTERN.test(id)) return id;
  const newId = generateTrainerId();
  writeStorageString(STORAGE_KEYS.trainerId, newId);
  return newId;
}

/**
 * Discard the stored trainerId and issue a fresh one. Used when the server
 * reports the current id is already owned by a different device (a
 * collision) — the id space is wide enough that this should be rare, but
 * unlike before, a colliding player now has a recovery path instead of being
 * locked out of the leaderboard permanently.
 *
 * trainerId is a single, global identity shared by every leaderboard type and
 * the daily challenge — regenerating it is a global reset. A 403 on one board
 * orphans the player's already-submitted entries under the old id on every
 * *other* board and on the daily challenge too, not just the one that
 * collided. That tradeoff is accepted because a collision is rare and the
 * alternative (no recovery) is a permanent lockout.
 */
export function regenerateTrainerId(): string {
  removeStorage(STORAGE_KEYS.trainerId);
  return getTrainerId();
}

export function getTrainerName(): string {
  return readStorageString(STORAGE_KEYS.trainerName, "") || "Trainer";
}

/**
 * Per-device secret sent with leaderboard submissions. The server hashes
 * this and binds it to a trainerId on first submit, rejecting later writes
 * to the same trainerId whose device key doesn't match — this is what
 * prevents another client from overwriting your leaderboard entry.
 */
export function getDeviceKey(): string {
  const key = readStorageString(STORAGE_KEYS.deviceKey, "");
  if (key && key.length >= DEVICE_KEY_BYTES) return key;
  const newKey = generateDeviceKey();
  writeStorageString(STORAGE_KEYS.deviceKey, newKey);
  return newKey;
}
