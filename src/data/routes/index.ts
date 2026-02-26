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

export function getAreasForRegion(regionId: string): RouteArea[] {
  return ROUTE_AREAS.filter((area) => area.region === regionId);
}

export function getAreaById(areaId: string): RouteArea | undefined {
  return ROUTE_AREAS.find((area) => area.id === areaId);
}
