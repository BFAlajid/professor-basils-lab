let token: { t: number; s: string; ttl: number } | null = null;
let interval: ReturnType<typeof setInterval> | null = null;

function isDev(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  );
}

async function fetchHeartbeat(): Promise<boolean> {
  try {
    const res = await fetch("/api/heartbeat");
    if (!res.ok) return false;
    token = await res.json();
    return true;
  } catch {
    return false;
  }
}

export function startHeartbeat(): void {
  if (isDev()) return;
  fetchHeartbeat();
  if (interval) clearInterval(interval);
  interval = setInterval(fetchHeartbeat, 10 * 60 * 1000);
}

export function isHeartbeatValid(): boolean {
  if (isDev()) return true;
  if (!token) return false;
  const now = Math.floor(Date.now() / 1000);
  return now - token.t < token.ttl;
}

export function getHeartbeatToken(): string | null {
  if (!token) return null;
  return `${token.t}:${token.s}`;
}
