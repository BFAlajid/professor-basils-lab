import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { POKEMON_IDS } from "@/data/pokemonIds";
import { TYPE_COLORS } from "@/data/typeColors";

export const revalidate = 86400;

interface PokemonData {
  id: number;
  name: string;
  types: { slot: number; type: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
  abilities: { ability: { name: string }; is_hidden: boolean }[];
  sprites: { other: { "official-artwork": { front_default: string | null } }; front_default: string | null };
  height: number;
  weight: number;
}

interface SpeciesData {
  flavor_text_entries: { flavor_text: string; language: { name: string }; version: { name: string } }[];
  genera: { genus: string; language: { name: string } }[];
}

const STAT_COLORS: Record<string, string> = {
  hp: "#ef4444",
  attack: "#f97316",
  defense: "#eab308",
  "special-attack": "#3b82f6",
  "special-defense": "#22c55e",
  speed: "#ec4899",
};

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Atk",
  defense: "Def",
  "special-attack": "SpA",
  "special-defense": "SpD",
  speed: "Spe",
};

async function fetchPokemon(name: string): Promise<PokemonData | null> {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchSpecies(name: string): Promise<SpeciesData | null> {
  try {
    const res = await fetch(
      `https://pokeapi.co/api/v2/pokemon-species/${name}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function getFlavorText(species: SpeciesData): string {
  const entries = species.flavor_text_entries.filter(
    (e) => e.language.name === "en"
  );
  if (entries.length === 0) return "";
  const text = entries[entries.length - 1].flavor_text;
  return text.replace(/[\f\n\r]/g, " ").replace(/\s+/g, " ").trim();
}

function getGenus(species: SpeciesData): string {
  const entry = species.genera.find((g) => g.language.name === "en");
  return entry?.genus || "";
}

export async function generateStaticParams() {
  return Object.keys(POKEMON_IDS).map((name) => ({ name }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const displayName = name.replace(/-/g, " ");
  const capitalName =
    displayName.charAt(0).toUpperCase() + displayName.slice(1);
  const id = POKEMON_IDS[name.toLowerCase()] || null;
  const idStr = id ? ` #${String(id).padStart(3, "0")}` : "";

  return {
    title: `${capitalName}${idStr} | Pokemon Team Builder`,
    description: `View ${capitalName}'s stats, abilities, and type matchups. Add ${capitalName} to your team in Pokemon Team Builder.`,
    openGraph: {
      title: `${capitalName}${idStr} | Pokemon Team Builder`,
      description: `View ${capitalName}'s stats, abilities, and type matchups.`,
    },
  };
}

export default async function PokemonPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: rawName } = await params;
  const name = rawName.toLowerCase();
  if (!/^[a-z0-9-]+$/.test(name)) {
    notFound();
  }

  const [pokemon, species] = await Promise.all([
    fetchPokemon(name),
    fetchSpecies(name),
  ]);

  if (!pokemon) {
    notFound();
  }

  const displayName = name.replace(/-/g, " ");
  const spriteUrl =
    pokemon.sprites.other["official-artwork"].front_default ||
    pokemon.sprites.front_default ||
    "";
  const flavorText = species ? getFlavorText(species) : "";
  const genus = species ? getGenus(species) : "";
  const maxStat = 255;

  return (
    <main
      className="min-h-screen p-4 md:p-8"
      style={{ backgroundColor: "#1a1c2c", color: "#f0f0e8" }}
    >
      <div className="mx-auto max-w-3xl">
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
          style={{ color: "#8b8fa3", fontFamily: "var(--font-pixel-body)" }}
        >
          &larr; Back to Team Builder
        </Link>

        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* Sprite */}
          <div
            className="flex-shrink-0 rounded-2xl p-6"
            style={{
              backgroundColor: "#262b44",
              border: "2px solid #3a4466",
            }}
          >
            {spriteUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={spriteUrl}
                alt={displayName}
                width={192}
                height={192}
                style={{ imageRendering: "pixelated" }}
              />
            ) : (
              <div
                className="flex items-center justify-center"
                style={{ width: 192, height: 192, color: "#3a4466" }}
              >
                No sprite
              </div>
            )}
          </div>

          {/* Name, number, types */}
          <div className="flex flex-col gap-3 text-center sm:text-left">
            <p
              className="text-sm"
              style={{
                color: "#8b8fa3",
                fontFamily: "var(--font-pixel-body)",
              }}
            >
              #{String(pokemon.id).padStart(3, "0")}
            </p>
            <h1
              className="text-3xl capitalize"
              style={{ fontFamily: "var(--font-pixel)" }}
            >
              {displayName}
            </h1>
            {genus && (
              <p
                className="text-sm"
                style={{
                  color: "#8b8fa3",
                  fontFamily: "var(--font-pixel-body)",
                }}
              >
                {genus}
              </p>
            )}

            {/* Types */}
            <div className="flex gap-2">
              {pokemon.types.map((t) => (
                <span
                  key={t.type.name}
                  className="rounded-full px-4 py-1 text-sm font-semibold capitalize"
                  style={{
                    backgroundColor: TYPE_COLORS[t.type.name] || "#666",
                    fontFamily: "var(--font-pixel-body)",
                  }}
                >
                  {t.type.name}
                </span>
              ))}
            </div>

            {/* Height / Weight */}
            <div
              className="mt-2 flex gap-6 text-sm"
              style={{
                color: "#8b8fa3",
                fontFamily: "var(--font-pixel-body)",
              }}
            >
              <span>Height: {(pokemon.height / 10).toFixed(1)} m</span>
              <span>Weight: {(pokemon.weight / 10).toFixed(1)} kg</span>
            </div>
          </div>
        </div>

        {/* Flavor text */}
        {flavorText && (
          <div
            className="mb-8 rounded-xl p-4"
            style={{
              backgroundColor: "#262b44",
              border: "2px solid #3a4466",
              fontFamily: "var(--font-pixel-body)",
              lineHeight: 1.6,
            }}
          >
            <p className="italic">&ldquo;{flavorText}&rdquo;</p>
          </div>
        )}

        {/* Base Stats */}
        <section className="mb-8">
          <h2
            className="mb-4 text-lg"
            style={{ fontFamily: "var(--font-pixel)" }}
          >
            Base Stats
          </h2>
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: "#262b44",
              border: "2px solid #3a4466",
            }}
          >
            <div className="flex flex-col gap-3">
              {pokemon.stats.map((s) => {
                const pct = Math.round((s.base_stat / maxStat) * 100);
                const color = STAT_COLORS[s.stat.name] || "#888";
                const label = STAT_LABELS[s.stat.name] || s.stat.name;
                return (
                  <div key={s.stat.name} className="flex items-center gap-3">
                    <span
                      className="w-10 text-right text-sm"
                      style={{
                        fontFamily: "var(--font-pixel-body)",
                        color: "#8b8fa3",
                      }}
                    >
                      {label}
                    </span>
                    <span
                      className="w-10 text-right text-sm font-bold"
                      style={{ fontFamily: "var(--font-pixel-body)" }}
                    >
                      {s.base_stat}
                    </span>
                    <div
                      className="h-4 flex-1 overflow-hidden rounded-full"
                      style={{ backgroundColor: "#1a1c2c" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: color,
                          minWidth: "4px",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <div
                className="mt-1 flex items-center gap-3 border-t pt-3"
                style={{ borderColor: "#3a4466" }}
              >
                <span
                  className="w-10 text-right text-sm"
                  style={{
                    fontFamily: "var(--font-pixel-body)",
                    color: "#8b8fa3",
                  }}
                >
                  Tot
                </span>
                <span
                  className="w-10 text-right text-sm font-bold"
                  style={{ fontFamily: "var(--font-pixel-body)" }}
                >
                  {pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Abilities */}
        <section className="mb-8">
          <h2
            className="mb-4 text-lg"
            style={{ fontFamily: "var(--font-pixel)" }}
          >
            Abilities
          </h2>
          <div
            className="flex flex-wrap gap-2 rounded-xl p-4"
            style={{
              backgroundColor: "#262b44",
              border: "2px solid #3a4466",
            }}
          >
            {pokemon.abilities.map((a) => (
              <span
                key={a.ability.name}
                className="rounded-lg px-3 py-1.5 text-sm capitalize"
                style={{
                  backgroundColor: "#1a1c2c",
                  border: a.is_hidden
                    ? "1px dashed #3a4466"
                    : "1px solid #3a4466",
                  fontFamily: "var(--font-pixel-body)",
                  color: a.is_hidden ? "#8b8fa3" : "#f0f0e8",
                }}
              >
                {a.ability.name.replace(/-/g, " ")}
                {a.is_hidden && (
                  <span
                    className="ml-1 text-xs"
                    style={{ color: "#6366f1" }}
                  >
                    (HA)
                  </span>
                )}
              </span>
            ))}
          </div>
        </section>

        {/* Add to Team */}
        <div className="flex justify-center">
          <Link
            href={`/?add=${encodeURIComponent(name)}`}
            className="rounded-xl px-8 py-3 text-sm font-bold transition-transform hover:scale-105 active:scale-95"
            style={{
              backgroundColor: "#6366f1",
              color: "#f0f0e8",
              fontFamily: "var(--font-pixel)",
            }}
          >
            Add to Team
          </Link>
        </div>
      </div>
    </main>
  );
}
