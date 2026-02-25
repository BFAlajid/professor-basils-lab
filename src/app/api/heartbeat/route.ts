import { NextRequest, NextResponse } from "next/server";

const SECRET = process.env.HEARTBEAT_SECRET;

const ALLOWED_ORIGINS = ["https://professor-basils-lab.vercel.app"];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    return new URL(origin).hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin") || request.headers.get("referer") || "";

  if (!origin.includes("localhost") && !isAllowedOrigin(origin)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!SECRET) {
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(String(timestamp)));
  const token = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return NextResponse.json({ t: timestamp, s: token, ttl: 900 });
}
