import { NextResponse } from "next/server";
import { uploadShare, uploadShareMeta } from "@/lib/blob";
import { checkRateLimit } from "@/lib/kv";
import {
  SHARE_MAX_TRAINER_CARD,
  SHARE_MAX_REPLAY,
  SHARE_MAX_CHALLENGE,
  SHARE_EXPIRY_DAYS,
  SHARE_RATE_LIMIT_PER_HOUR,
} from "@/data/constants";
import type {
  SharePayload,
  ShareResponse,
  ShareType,
  StoredShare,
} from "@/types/share";

export const runtime = "nodejs";

const VALID_TYPES = new Set<ShareType>(["trainer-card", "replay", "challenge"]);

const SIZE_LIMITS: Record<ShareType, number> = {
  "trainer-card": SHARE_MAX_TRAINER_CARD,
  replay: SHARE_MAX_REPLAY,
  challenge: SHARE_MAX_CHALLENGE,
};

function isValidPayload(body: unknown): body is SharePayload {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.type !== "string" || !VALID_TYPES.has(b.type as ShareType))
    return false;
  if (typeof b.data !== "string" || b.data.length === 0) return false;
  if (typeof b.metadata !== "object" || b.metadata === null) return false;
  const m = b.metadata as Record<string, unknown>;
  if (typeof m.title !== "string" || m.title.length === 0) return false;
  if (m.title.length > 100) return false;
  if (typeof m.trainerName === "string" && m.trainerName.length > 50) return false;
  if (Array.isArray(m.pokemonNames) && m.pokemonNames.length > 6) return false;
  if (typeof m.createdAt !== "string") return false;

  // H1: Validate PNG magic bytes for trainer-card uploads
  const p = body as Record<string, unknown>;
  if (p.type === "trainer-card") {
    const PNG_MAGIC = "iVBORw0KGgo"; // base64 of PNG header bytes
    if (typeof p.data !== "string" || !p.data.startsWith(PNG_MAGIC)) {
      return false;
    }
  }

  return true;
}

export async function POST(request: Request) {
  // Rate limit by IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  try {
    const allowed = await checkRateLimit(`share:${ip}`, SHARE_RATE_LIMIT_PER_HOUR);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
  } catch {
    // KV unavailable — fail closed for uploads
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Invalid share payload" },
      { status: 400 }
    );
  }

  const dataSize = new Blob([body.data]).size;
  const limit = SIZE_LIMITS[body.type];
  if (dataSize > limit) {
    return NextResponse.json(
      {
        error: `Data exceeds size limit for ${body.type} (${Math.round(limit / 1024)}KB)`,
      },
      { status: 400 }
    );
  }

  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

  const expiresAt = new Date(
    Date.now() + SHARE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  try {
    const blobUrl = await uploadShare(id, body.type, body.data);

    const storedMeta: StoredShare = {
      type: body.type,
      blobUrl,
      metadata: body.metadata,
      expiresAt,
    };
    await uploadShareMeta(id, storedMeta);

    const response: ShareResponse = {
      id,
      url: `/share/${id}`,
      expiresAt,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("Share upload failed:", err);
    return NextResponse.json(
      { error: "Failed to store share" },
      { status: 500 }
    );
  }
}
