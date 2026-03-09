import { ImageResponse } from "next/og";
import { POKEMON_IDS } from "@/data/pokemonIds";

export const runtime = "edge";

const SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pokemonParam = searchParams.get("pokemon");
  const title = (searchParams.get("title") || "Pokemon Team Builder").slice(0, 100);

  const names = pokemonParam
    ? pokemonParam
        .split(",")
        .slice(0, 6)
        .map((n) => n.trim().toLowerCase())
        .filter(Boolean)
    : [];

  const sprites = names.map((name) => {
    const id = POKEMON_IDS[name] || 1;
    return `${SPRITE_BASE}/${id}.png`;
  });

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "1200px",
          height: "630px",
          backgroundColor: "#1a1c2c",
          color: "#f0f0e8",
          fontFamily: "sans-serif",
          padding: "40px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: "48px",
            fontWeight: 700,
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          {title}
        </div>

        {names.length > 0 ? (
          <div
            style={{
              display: "flex",
              gap: "32px",
              marginTop: "20px",
            }}
          >
            {sprites.map((src, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  backgroundColor: "#262b44",
                  borderRadius: "12px",
                  padding: "16px",
                  border: "2px solid #3a4466",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  width={96}
                  height={96}
                  style={{ imageRendering: "pixelated" }}
                  alt={names[i]}
                />
                <div
                  style={{
                    display: "flex",
                    fontSize: "18px",
                    marginTop: "8px",
                    textTransform: "capitalize",
                  }}
                >
                  {names[i]?.replace(/-/g, " ") || ""}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              fontSize: "24px",
              color: "#8b8fa3",
              marginTop: "20px",
            }}
          >
            Build and share your dream team
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, s-maxage=86400" },
    }
  );
}
