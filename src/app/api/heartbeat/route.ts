import { NextRequest, NextResponse } from "next/server";

const SECRET = process.env.HEARTBEAT_SECRET;

const ALLOWED_ORIGINS = ["https://professor-basils-lab.vercel.app"];

function isLocalOrigin(origin: string): boolean {
  try {
    const h = new URL(origin).hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const hostname = new URL(origin).hostname;
    return hostname.endsWith(".vercel.app") && hostname.includes("professor-basils-lab");
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin") || request.headers.get("referer") || "";

  if (!isLocalOrigin(origin) && !isAllowedOrigin(origin)) {
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
