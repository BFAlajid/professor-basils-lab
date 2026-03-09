import { ImageResponse } from "next/og";
import { POKEMON_IDS } from "@/data/pokemonIds";
import { TYPE_COLORS } from "@/data/typeColors";

export const runtime = "edge";
export const alt = "Pokemon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";

export default async function Image({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;

  const id = POKEMON_IDS[name.toLowerCase()] || 1;
  const spriteUrl = `${SPRITE_BASE}/${id}.png`;

  let types: string[] = [];
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`, {
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const data = await res.json();
      types = data.types.map(
        (t: { type: { name: string } }) => t.type.name
      );
    }
  } catch {
    // Fall back to no types displayed
  }

  const displayName = name.replace(/-/g, " ");

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          width: "1200px",
          height: "630px",
          backgroundColor: "#1a1c2c",
          color: "#f0f0e8",
          fontFamily: "sans-serif",
          gap: "60px",
          padding: "60px",
        }}
      >
        <div
          style={{
            display: "flex",
            backgroundColor: "#262b44",
            borderRadius: "24px",
            padding: "32px",
            border: "3px solid #3a4466",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={spriteUrl}
            width={256}
            height={256}
            alt={displayName}
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "20px",
              color: "#8b8fa3",
            }}
          >
            #{String(id).padStart(3, "0")}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "56px",
              fontWeight: 700,
              textTransform: "capitalize",
            }}
          >
            {displayName}
          </div>
          {types.length > 0 && (
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              {types.map((type) => (
                <div
                  key={type}
                  style={{
                    display: "flex",
                    backgroundColor: TYPE_COLORS[type] || "#666",
                    padding: "8px 24px",
                    borderRadius: "20px",
                    fontSize: "22px",
                    fontWeight: 600,
                    textTransform: "capitalize",
                  }}
                >
                  {type}
                </div>
              ))}
            </div>
          )}
          <div
            style={{
              display: "flex",
              fontSize: "20px",
              color: "#8b8fa3",
              marginTop: "12px",
            }}
          >
            Pokemon Team Builder
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
