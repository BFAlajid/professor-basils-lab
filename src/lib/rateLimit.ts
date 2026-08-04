import { kv } from "@vercel/kv";

/**
 * IP-keyed rate limiting only — deliberately crypto-free (unlike kv.ts, which
 * pulls in node's `crypto` for device-key hashing) so edge routes can import
 * this without dragging an unsupported node module into the edge bundle.
 */

function rateLimitKey(ip: string): string {
  return `rate:${ip}:leaderboard`;
}

function dailyRateLimitKey(ip: string): string {
  return `rate:${ip}:daily`;
}

export async function checkRateLimit(
  ip: string,
  maxPerHour: number
): Promise<boolean> {
  const key = rateLimitKey(ip);
  const current = await kv.incr(key);
  await kv.expire(key, 3600);
  return current <= maxPerHour;
}

export async function checkDailyRateLimit(
  ip: string,
  maxPerHour: number
): Promise<boolean> {
  const key = dailyRateLimitKey(ip);
  const current = await kv.incr(key);
  await kv.expire(key, 3600);
  return current <= maxPerHour;
}
