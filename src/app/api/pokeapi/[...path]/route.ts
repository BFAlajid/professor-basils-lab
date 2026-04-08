export const runtime = "edge";

const ALLOWED_RESOURCES = new Set([
  "pokemon",
  "move",
  "pokemon-species",
  "ability",
  "type",
  "evolution-chain",
  "pokemon-form",
]);

const UPSTREAM_BASE = "https://pokeapi.co/api/v2";
const UPSTREAM_TIMEOUT_MS = 10_000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  if (!path || path.length === 0) {
    return Response.json({ error: "Invalid resource type" }, { status: 400 });
  }

  const resource = path[0];

  if (!ALLOWED_RESOURCES.has(resource)) {
    return Response.json({ error: "Invalid resource type" }, { status: 400 });
  }

  // Validate ALL path segments to prevent path traversal
  const SEGMENT_PATTERN = /^[a-z0-9-]+$/;
  for (const segment of path) {
    if (!SEGMENT_PATTERN.test(segment)) {
      return Response.json({ error: "Invalid path segment" }, { status: 400 });
    }
  }

  const ALLOWED_PARAMS = new Set(["limit", "offset"]);
  const { searchParams } = new URL(request.url);
  const upstreamUrl = new URL(`${UPSTREAM_BASE}/${path.join("/")}`);
  searchParams.forEach((value, key) => {
    if (!ALLOWED_PARAMS.has(key)) return;
    if (key === "limit") {
      const val = Math.min(Math.max(parseInt(value, 10) || 20, 1), 1025);
      upstreamUrl.searchParams.set(key, String(val));
    } else if (key === "offset") {
      const val = Math.max(parseInt(value, 10) || 0, 0);
      upstreamUrl.searchParams.set(key, String(val));
    } else {
      upstreamUrl.searchParams.set(key, value);
    }
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      signal: controller.signal,
    });

    if (!upstream.ok) {
      return Response.json({ error: "Upstream error" }, { status: 502 });
    }

    const data = await upstream.json();

    return Response.json(data, {
      status: 200,
      headers: {
        "Cache-Control":
          "public, s-maxage=86400, stale-while-revalidate=3600",
        "Content-Type": "application/json",
      },
    });
  } catch {
    return Response.json({ error: "Upstream error" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
