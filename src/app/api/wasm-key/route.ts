import { NextRequest, NextResponse } from "next/server";

const KEY = process.env.WASM_ENCRYPTION_KEY;

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

  if (!KEY) {
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  return NextResponse.json({ key: KEY }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
