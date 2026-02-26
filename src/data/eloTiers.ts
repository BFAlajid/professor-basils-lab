export interface ELOTier {
  name: string;
  minRating: number;
  color: string;
  icon: string;
}

export const ELO_TIERS: ELOTier[] = [
  { name: "Poke Ball", minRating: 0, color: "#e8433f", icon: "\u25CF" },
  { name: "Great Ball", minRating: 1000, color: "#6390F0", icon: "\u25C6" },
  { name: "Ultra Ball", minRating: 1200, color: "#f7a838", icon: "\u2605" },
  { name: "Master Ball", minRating: 1400, color: "#7B62A1", icon: "\u2726" },
];

export function getCurrentTier(rating: number): ELOTier {
  for (let i = ELO_TIERS.length - 1; i >= 0; i--) {
    if (rating >= ELO_TIERS[i].minRating) return ELO_TIERS[i];
  }
  return ELO_TIERS[0];
}
