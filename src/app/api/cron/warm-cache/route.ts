import { timingSafeEqual } from "crypto";

export const maxDuration = 300;

const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 100;
const DEFAULT_APP_URL = "https://pokemon-team-builder.vercel.app";

interface PokemonListResponse {
  results: Array<{ name: string; url: string }>;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  const expectedFull = `Bearer ${expected}`;
  if (!expected || !authHeader || authHeader.length !== expectedFull.length || !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedFull))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || DEFAULT_APP_URL;
  const start = Date.now();
  const failed: string[] = [];
  let warmed = 0;

  let listResponse: Response;
  try {
    listResponse = await fetch(
      `${baseUrl}/api/pokeapi/pokemon?limit=386`
    );
  } catch {
    return Response.json(
      { error: "Failed to fetch pokemon list" },
      { status: 502 }
    );
  }

  if (!listResponse.ok) {
    return Response.json(
      { error: "Failed to fetch pokemon list" },
      { status: 502 }
    );
  }

  const listData: PokemonListResponse = await listResponse.json();
  const names = listData.results.map((p) => p.name);

  for (let i = 0; i < names.length; i += BATCH_SIZE) {
    const batch = names.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.flatMap((name) => [
        fetch(`${baseUrl}/api/pokeapi/pokemon/${name}`),
        fetch(`${baseUrl}/api/pokeapi/pokemon-species/${name}`),
      ])
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const pokemonIndex = Math.floor(j / 2);
      const name = batch[pokemonIndex];
      const endpoint = j % 2 === 0 ? "pokemon" : "pokemon-species";

      if (result.status === "fulfilled") {
        if (result.value.ok) {
          warmed++;
        } else {
          const label = `${endpoint}/${name}`;
          if (!failed.includes(label)) {
            failed.push(label);
          }
        }
        // Drain response body to release TCP connection
        result.value.body?.cancel();
      } else {
        const label = `${endpoint}/${name}`;
        if (!failed.includes(label)) {
          failed.push(label);
        }
      }
    }

    if (i + BATCH_SIZE < names.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  const durationMs = Date.now() - start;

  return Response.json({ warmed, failedCount: failed.length, durationMs });
}
