import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = ["professor-basils-lab.vercel.app"];

const BUILD_TS = parseInt(process.env.NEXT_PUBLIC_BUILD_TIMESTAMP || "0");
const MAX_AGE_DAYS = 180;

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0];

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return NextResponse.next();
  }

  if (!ALLOWED_HOSTS.includes(hostname) && !hostname.endsWith(".vercel.app")) {
    return new NextResponse("Unavailable", { status: 451 });
  }

  if (BUILD_TS > 0) {
    const ageDays = (Date.now() - BUILD_TS) / 86_400_000;
    if (ageDays > MAX_AGE_DAYS) {
      return new NextResponse("Build expired. Redeploy required.", { status: 410 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|wasm/|mgba/|nds/).*)"],
};
