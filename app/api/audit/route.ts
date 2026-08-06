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
const RATE_LIMIT = 4;
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
    // La caché es una optimización; no debe invalidar una auditoría correcta.
  }
}

async function enforceRateLimit(
  request: Request,
  kv: AuditKVNamespace | undefined,
): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  if (!kv) return { allowed: true };

  const clientIp = request.headers.get("cf-connecting-ip") ?? "unknown";
  const key = `instagram-audit:rate:${await digest(clientIp)}`;
  const now = Math.floor(Date.now() / 1000);

  try {
    const stored = await kv.get(key);
    const current = stored ? (JSON.parse(stored) as RateRecord) : null;

    if (current && current.resetAt > now && current.count >= RATE_LIMIT) {
      return { allowed: false, retryAfter: Math.max(1, current.resetAt - now) };
    }

    const next: RateRecord = current && current.resetAt > now
      ? { count: current.count + 1, resetAt: current.resetAt }
      : { count: 1, resetAt: now + RATE_WINDOW_SECONDS };

    await kv.put(key, JSON.stringify(next), {
      expirationTtl: Math.max(60, next.resetAt - now),
    });
  } catch {
    // Si KV falla, el proveedor sigue protegido por los límites de coste.
  }

  return { allowed: true };
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

  const rate = await enforceRateLimit(request, bindings.EDITOR_KV);
  if (!rate.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "Has arribat al límit temporal d’auditories. Torna-ho a provar més tard.",
      { "Retry-After": String(rate.retryAfter) },
    );
  }

  const apiKey = bindings.APIFY_API_KEY;
  if (!apiKey) {
    return jsonError(
      503,
      "AUDIT_PROVIDER_NOT_CONFIGURED",
      "L’auditoria encara no està connectada al proveïdor de dades.",
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
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    if (message === "PRIVATE_PROFILE") {
      return jsonError(
        422,
        "PRIVATE_PROFILE",
        "El perfil és privat i no es pot auditar amb dades públiques.",
      );
    }

    if (message === "PROFILE_NOT_FOUND" || message.startsWith("PROVIDER_PROFILE_ERROR:")) {
      return jsonError(
        404,
        "PROFILE_NOT_FOUND",
        "No s’ha trobat un perfil públic amb aquest usuari.",
      );
    }

    if (error instanceof DOMException && error.name === "TimeoutError") {
      return jsonError(
        504,
        "PROVIDER_TIMEOUT",
        "El proveïdor de dades ha superat el temps d’espera. Torna-ho a provar.",
      );
    }

    console.error(JSON.stringify({ event: "instagram_audit_failed", username, message }));
    return jsonError(
      502,
      "AUDIT_PROVIDER_ERROR",
      "No s’ha pogut completar l’auditoria amb dades públiques.",
    );
  }
}
