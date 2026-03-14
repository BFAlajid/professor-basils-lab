/** Trainer identity helpers for leaderboard submissions. */

const NAME_KEY = "pokemon-trainer-name";
const ID_KEY = "pokemon-trainer-id";

function generateTrainerId(): string {
  return String(10000 + Math.floor(Math.random() * 90000)); // 5-digit
}

export function getTrainerId(): string {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id || id.length !== 5) {
      id = generateTrainerId();
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return generateTrainerId();
  }
}

export function getTrainerName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || "Trainer";
  } catch {
    return "Trainer";
  }
}
