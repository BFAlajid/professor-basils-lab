import { Pokemon } from "@/types";

let currentAudio: HTMLAudioElement | null = null;

const CRY_BASE_URL =
  "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest";

/**
 * Play a Pokemon's cry audio from PokeAPI's cries repository.
 * Uses the `cries.latest` URL from the Pokemon data, falling back to
 * a constructed URL based on the Pokemon's ID.
 */
export function playCry(pokemon: Pokemon, volume = 0.3): void {
  // Stop any currently playing cry
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  const url = pokemon.cries?.latest ?? `${CRY_BASE_URL}/${pokemon.id}.ogg`;

  try {
    const audio = new Audio(url);
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.play().catch(() => {
      // Audio playback blocked (autoplay policy) — silently ignore
    });
    currentAudio = audio;

    // Clean up reference when done
    audio.addEventListener("ended", () => {
      if (currentAudio === audio) currentAudio = null;
    });
  } catch {
    // Audio creation failed — not critical
  }
}

/** Stop any currently playing cry. */
export function stopCry(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}
