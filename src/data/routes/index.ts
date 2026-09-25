import { RouteArea } from "@/types";
import { KANTO_ROUTES } from "./kanto";
import { JOHTO_ROUTES } from "./johto";
import { HOENN_ROUTES } from "./hoenn";
import { SINNOH_ROUTES } from "./sinnoh";
import { UNOVA_ROUTES } from "./unova";
import { KALOS_ROUTES } from "./kalos";
import { ALOLA_ROUTES } from "./alola";
import { GALAR_ROUTES } from "./galar";
import { PALDEA_ROUTES } from "./paldea";

export {
  KANTO_ROUTES,
  JOHTO_ROUTES,
  HOENN_ROUTES,
  SINNOH_ROUTES,
  UNOVA_ROUTES,
  KALOS_ROUTES,
  ALOLA_ROUTES,
  GALAR_ROUTES,
  PALDEA_ROUTES,
};

export const REGIONS = [
  { id: "kanto", name: "Kanto", color: "#e8433f", mapUrl: "/maps/kanto.png" },
  { id: "johto", name: "Johto", color: "#3b82f6", mapUrl: "/maps/johto.png" },
  { id: "hoenn", name: "Hoenn", color: "#22c55e", mapUrl: "/maps/hoenn.png" },
  { id: "sinnoh", name: "Sinnoh", color: "#a855f7", mapUrl: "/maps/sinnoh.png" },
  { id: "unova", name: "Unova", color: "#6366f1", mapUrl: "/maps/unova.png" },
  { id: "kalos", name: "Kalos", color: "#ec4899", mapUrl: "/maps/kalos.png" },
  { id: "alola", name: "Alola", color: "#f59e0b", mapUrl: "/maps/alola.png" },
  { id: "galar", name: "Galar", color: "#14b8a6", mapUrl: "/maps/galar.png" },
  { id: "paldea", name: "Paldea", color: "#f97316", mapUrl: "/maps/paldea.png" },
] as const;

export type RegionId = (typeof REGIONS)[number]["id"];

export const ROUTE_AREAS: RouteArea[] = [
  ...KANTO_ROUTES,
  ...JOHTO_ROUTES,
  ...HOENN_ROUTES,
  ...SINNOH_ROUTES,
  ...UNOVA_ROUTES,
  ...KALOS_ROUTES,
  ...ALOLA_ROUTES,
  ...GALAR_ROUTES,
  ...PALDEA_ROUTES,
];

const AREAS_BY_REGION = new Map<string, RouteArea[]>();
const AREAS_BY_ID = new Map<string, RouteArea>();
for (const area of ROUTE_AREAS) {
  const existing = AREAS_BY_REGION.get(area.region);
  if (existing) existing.push(area);
  else AREAS_BY_REGION.set(area.region, [area]);
  AREAS_BY_ID.set(area.id, area);
}

export function getAreasForRegion(regionId: string): RouteArea[] {
  return AREAS_BY_REGION.get(regionId) ?? [];
}

export function getAreaById(areaId: string): RouteArea | undefined {
  return AREAS_BY_ID.get(areaId);
}
