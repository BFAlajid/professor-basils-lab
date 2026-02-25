import { NextRequest, NextResponse } from "next/server";

const SECRET = process.env.HEARTBEAT_SECRET;

const TYPE_LIST = [
  "normal","fire","water","electric","grass","ice","fighting","poison",
  "ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy",
];

const M: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,.5,0,1,1,.5,1],
  [1,.5,.5,1,2,2,1,1,1,1,1,2,.5,1,.5,1,2,1],
  [1,2,.5,1,.5,1,1,1,2,1,1,1,2,1,.5,1,1,1],
  [1,1,2,.5,.5,1,1,1,0,2,1,1,1,1,.5,1,1,1],
  [1,.5,2,1,.5,1,1,.5,2,.5,1,.5,2,1,.5,1,.5,1],
  [1,.5,.5,1,2,.5,1,1,2,2,1,1,1,1,2,1,.5,1],
  [2,1,1,1,1,2,1,.5,1,.5,.5,.5,2,0,1,2,2,.5],
  [1,1,1,1,2,1,1,.5,.5,1,1,1,.5,.5,1,1,0,2],
  [1,2,1,2,.5,1,1,2,1,0,1,.5,2,1,1,1,2,1],
  [1,1,1,.5,2,1,2,1,1,1,1,2,.5,1,1,1,.5,1],
  [1,1,1,1,1,1,2,2,1,1,.5,1,1,1,1,0,.5,1],
  [1,.5,1,1,2,1,.5,.5,1,.5,2,1,1,.5,1,2,.5,.5],
  [1,2,1,1,1,2,.5,1,.5,2,1,2,1,1,1,1,.5,1],
  [0,1,1,1,1,1,1,1,1,1,2,1,1,2,1,.5,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,.5,0],
  [1,1,1,1,1,1,.5,1,1,1,2,1,1,2,1,.5,.5,.5],
  [1,.5,.5,.5,1,2,1,1,1,1,1,1,2,1,1,1,.5,2],
  [1,.5,1,1,1,1,2,.5,1,1,1,1,1,1,2,2,.5,1],
];

async function verifyHeartbeat(token: string): Promise<boolean> {
  if (!SECRET) return false;
  const [ts, sig] = token.split(":");
  if (!ts || !sig) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now - parseInt(ts) > 900) return false;

  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const expected = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ts));
  const expectedHex = Array.from(new Uint8Array(expected))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  return sig === expectedHex;
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-heartbeat");
  if (!token || !(await verifyHeartbeat(token))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { attackType, defenderTypes } = body as { attackType: string; defenderTypes: string[] };

  const atkIdx = TYPE_LIST.indexOf(attackType);
  if (atkIdx === -1) return NextResponse.json({ error: "invalid type" }, { status: 400 });

  let multiplier = 1;
  for (const defType of defenderTypes) {
    const defIdx = TYPE_LIST.indexOf(defType);
    if (defIdx === -1) continue;
    multiplier *= M[atkIdx][defIdx];
  }

  return NextResponse.json({ multiplier });
}
