/**
 * Resolve the client IP from a trusted signal for rate limiting.
 *
 * On Vercel, `x-real-ip` is set by the edge network from the actual TCP
 * connection and cannot be spoofed by the client. `x-forwarded-for` CAN
 * contain a client-supplied prefix — Vercel appends the real client IP as
 * the last entry rather than replacing the header, so the leftmost entry
 * is attacker-controlled and must never be trusted alone. We prefer
 * `x-real-ip` and fall back to the last `x-forwarded-for` entry.
 *
 * Falls back to "unknown" (a single shared bucket) in local dev or when
 * neither header is present.
 */
export function getTrustedClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const parts = forwardedFor
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return "unknown";
}
