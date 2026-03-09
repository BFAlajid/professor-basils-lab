import { list } from "@vercel/blob";
import type { StoredShare } from "@/types/share";

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || !/^[a-f0-9]{12}$/.test(id)) {
    return Response.json({ error: "Invalid share ID" }, { status: 400 });
  }

  const { blobs } = await list({ prefix: `shares/meta/${id}.json` });
  if (blobs.length === 0) {
    return Response.json({ error: "Share not found" }, { status: 404 });
  }

  const metaRes = await fetch(blobs[0].url);
  if (!metaRes.ok) {
    return Response.json({ error: "Share not found" }, { status: 404 });
  }

  const meta = (await metaRes.json()) as StoredShare;

  if (new Date(meta.expiresAt) < new Date()) {
    return Response.json(
      { error: "Share has expired" },
      { status: 410 }
    );
  }

  return Response.json(meta, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
