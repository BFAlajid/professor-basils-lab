/**
 * Authenticated API client for the NestJS backend.
 *
 * Access token lives in memory only — never localStorage or cookies.
 * Refresh token is in an HttpOnly cookie managed by the browser.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

let accessToken: string | null = null;
let refreshPromise: Promise<void> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function doRefresh(): Promise<void> {
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include', // sends the HttpOnly refresh_token cookie
  });

  if (!res.ok) {
    accessToken = null;
    throw new Error('Session expired. Please log in again.');
  }

  const data = (await res.json()) as { accessToken: string };
  accessToken = data.accessToken;
}

/**
 * Singleton refresh — if two concurrent requests trigger a refresh at the
 * same time, they await the same promise instead of sending two refresh requests.
 */
async function ensureValidToken(): Promise<void> {
  if (accessToken) return;

  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  await refreshPromise;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function buildRequest(init: RequestInit): Promise<RequestInit> {
  await ensureValidToken();
  return {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken ?? ''}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  };
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let requestInit = await buildRequest(init);
  let res = await fetch(`${BASE}${path}`, requestInit);

  // One silent refresh attempt on 401 (token may have just expired)
  if (res.status === 401) {
    accessToken = null;
    try {
      await ensureValidToken();
    } catch {
      throw new ApiError('Session expired. Please log in again.', 'UNAUTHORIZED', 401);
    }
    requestInit = await buildRequest(init);
    res = await fetch(`${BASE}${path}`, requestInit);
  }

  if (!res.ok) {
    let code = 'UNKNOWN';
    let message = 'Request failed';
    try {
      const err = (await res.json()) as { code?: string; message?: string };
      code = err.code ?? code;
      message = err.message ?? message;
    } catch {
      // ignore parse error
    }
    throw new ApiError(message, code, res.status);
  }

  // 204 No Content — return empty object
  if (res.status === 204) return {} as T;

  return res.json() as Promise<T>;
}

export const api = {
  get: <T = unknown>(path: string): Promise<T> =>
    apiFetch<T>(path, { method: 'GET' }),

  post: <T = unknown>(path: string, body?: unknown): Promise<T> =>
    apiFetch<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T = unknown>(path: string, body?: unknown): Promise<T> =>
    apiFetch<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(path: string): Promise<T> =>
    apiFetch<T>(path, { method: 'DELETE' }),
};
