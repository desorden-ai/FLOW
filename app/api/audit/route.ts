import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import {
  createInstagramAudit,
  normalizeInstagramUsername,
  type InstagramAuditResult,
} from "../../../lib/instagram-audit";

const APIFY_ACTOR_ID = "apify~instagram-profile-scraper";
const CACHE_TTL_SECONDS = 60 * 60 * 6;
const RATE_WINDOW_SECONDS = 60 * 10;
const RATE_LIMIT = 12;
const RATE_KEY_VERSION = "v2";
const MAX_REQUEST_BYTES = 1_024;

interface AuditKVNamespace {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
}

interface AuditBindings {
  APIFY_API_KEY?: string;
  EDITOR_KV?: AuditKVNamespace;
}

type RateRecord = {
  count: number;
  resetAt: number;
};

type RateResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; remaining: 0; resetAt: number; retryAfter: number };

type RequestBody = {
  username?: unknown;
  website?: unknown;
};

const bindings = env as unknown as AuditBindings;

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(request.url).origin;
}

function jsonError(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Cache-Control", "no-store");

  return NextResponse.json(
    { error: { code, message } },
    { status, headers: responseHeaders },
  );
}

function rateHeaders(rate: RateResult): HeadersInit {
  return {
    "X-RateLimit-Limit": String(RATE_LIMIT),
    "X-RateLimit-Remaining": String(rate.remaining),
    "X-RateLimit-Reset": String(rate.resetAt),
  };
}

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readCachedAudit(
  kv: AuditKVNamespace | undefined,
  username: string,
): Promise<InstagramAuditResult | null> {
  if (!kv) return null;

  try {
    const stored = await kv.get(`instagram-audit:cache:${username}`);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as InstagramAuditResult;
    if (!parsed || parsed.username !== username || typeof parsed.score !== "number") return null;

    return { ...parsed, source: "cache" };
  } catch {
    return null;
  }
}

async function writeCachedAudit(
  kv: AuditKVNamespace | undefined,
  result: InstagramAuditResult,
): Promise<void> {
  if (!kv) return;

  try {
    await kv.put(
      `instagram-audit:cache:${result.username}`,
      JSON.stringify(result),
      { expirationTtl: CACHE_TTL_SECONDS },
    );
  } catch {
    // La caché es una optimització i no ha d'invalidar una auditoria correcta.
  }
}

async function enforceRateLimit(
  request: Request,
  kv: AuditKVNamespace | undefined,
): Promise<RateResult> {
  const now = Math.floor(Date.now() / 1_000);

  if (!kv) {
    return {
      allowed: true,
      remaining: RATE_LIMIT,
      resetAt: now + RATE_WINDOW_SECONDS,
    };
  }

  const clientIp = request.headers.get("cf-connecting-ip");
  if (!clientIp) {
    return {
      allowed: true,
      remaining: RATE_LIMIT,
      resetAt: now + RATE_WINDOW_SECONDS,
    };
  }

  const key = `instagram-audit:rate:${RATE_KEY_VERSION}:${await digest(clientIp)}`;

  try {
    const stored = await kv.get(key);
    const current = stored ? (JSON.parse(stored) as RateRecord) : null;

    if (current && current.resetAt > now && current.count >= RATE_LIMIT) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: current.resetAt,
        retryAfter: Math.max(1, current.resetAt - now),
      };
    }

    const next: RateRecord = current && current.resetAt > now
      ? { count: current.count + 1, resetAt: current.resetAt }
      : { count: 1, resetAt: now + RATE_WINDOW_SECONDS };

    await kv.put(key, JSON.stringify(next), {
      expirationTtl: Math.max(60, next.resetAt - now),
    });

    return {
      allowed: true,
      remaining: Math.max(0, RATE_LIMIT - next.count),
      resetAt: next.resetAt,
    };
  } catch {
    // Si KV falla, el proveïdor continua protegit pel límit de cost d'Apify.
    return {
      allowed: true,
      remaining: RATE_LIMIT,
      resetAt: now + RATE_WINDOW_SECONDS,
    };
  }
}

async function fetchInstagramProfile(username: string, apiKey: string): Promise<unknown> {
  const endpoint = new URL(
    `https://api.apify.com/v2/actors/${APIFY_ACTOR_ID}/run-sync-get-dataset-items`,
  );
  endpoint.searchParams.set("timeout", "60");
  endpoint.searchParams.set("maxItems", "1");
  endpoint.searchParams.set("maxTotalChargeUsd", "0.05");
  endpoint.searchParams.set("limit", "1");
  endpoint.searchParams.set("clean", "true");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ usernames: [username] }),
    signal: AbortSignal.timeout(65_000),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "error" in payload
        ? JSON.stringify(payload)
        : `HTTP ${response.status}`;
    throw new Error(`PROVIDER_REQUEST_FAILED:${detail}`);
  }

  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  return payload[0];
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return jsonError(403, "INVALID_ORIGIN", "Origen de la petició no permès.");
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonError(413, "REQUEST_TOO_LARGE", "La petició és massa gran.");
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "La petició no conté JSON vàlid.");
  }

  if (typeof body.website === "string" && body.website.trim() !== "") {
    return jsonError(400, "BOT_DETECTED", "No s’ha pogut validar la petició.");
  }

  const username = normalizeInstagramUsername(body.username);
  if (!username) {
    return jsonError(
      400,
      "INVALID_USERNAME",
      "Introdueix un usuari o una URL pública d’Instagram vàlida.",
    );
  }

  const cached = await readCachedAudit(bindings.EDITOR_KV, username);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "private, max-age=0, no-store",
        "X-Audit-Source": "cache",
      },
    });
  }

  const apiKey = bindings.APIFY_API_KEY;
  if (!apiKey) {
    return jsonError(
      503,
      "AUDIT_PROVIDER_NOT_CONFIGURED",
      "L’auditoria encara no està connectada al proveïdor de dades.",
    );
  }

  const rate = await enforceRateLimit(request, bindings.EDITOR_KV);
  if (!rate.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Has arribat al límit temporal d’auditories. Torna-ho a provar en uns minuts.",
      {
        ...rateHeaders(rate),
        "Retry-After": String(rate.retryAfter),
      },
    );
  }

  try {
    const profile = await fetchInstagramProfile(username, apiKey);
    const result = createInstagramAudit(profile, username);
    await writeCachedAudit(bindings.EDITOR_KV, result);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=0, no-store",
        "X-Audit-Source": "live",
        ...rateHeaders(rate),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const headers = rateHeaders(rate);

    if (message === "PRIVATE_PROFILE") {
      return jsonError(
        422,
        "PRIVATE_PROFILE",
        "El perfil és privat i no es pot auditar amb dades públiques.",
        headers,
      );
    }

    if (message === "PROFILE_NOT_FOUND" || message.startsWith("PROVIDER_PROFILE_ERROR:")) {
      return jsonError(
        404,
        "PROFILE_NOT_FOUND",
        "No s’ha trobat un perfil públic amb aquest usuari.",
        headers,
      );
    }

    if (error instanceof DOMException && error.name === "TimeoutError") {
      return jsonError(
        504,
        "PROVIDER_TIMEOUT",
        "El proveïdor de dades ha superat el temps d’espera. Torna-ho a provar.",
        headers,
      );
    }

    console.error(JSON.stringify({ event: "instagram_audit_failed", username, message }));
    return jsonError(
      502,
      "AUDIT_PROVIDER_ERROR",
      "No s’ha pogut completar l’auditoria amb dades públiques.",
      headers,
    );
  }
}
