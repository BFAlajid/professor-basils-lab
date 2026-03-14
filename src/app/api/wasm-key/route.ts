import { NextRequest, NextResponse } from "next/server";

const KEY = process.env.WASM_ENCRYPTION_KEY;

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

  if (!KEY) {
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  return NextResponse.json({ key: KEY }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
