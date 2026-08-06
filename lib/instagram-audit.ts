export type AuditStatus = "strong" | "solid" | "improvable" | "critical";

export type InstagramAuditResult = {
  username: string;
  followers: number;
  postsAnalyzed: number;
  engagementRate: number | null;
  videoRatio: number | null;
  hasCta: boolean;
  score: number;
  status: AuditStatus;
  statusLabel: string;
  recommendations: string[];
  generatedAt: string;
  source: "live" | "cache";
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstNumber(record: UnknownRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function firstString(record: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return "";
}

function firstBoolean(record: UnknownRecord, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
  }
  return null;
}

function firstArray(record: UnknownRecord, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function postInteractions(post: UnknownRecord): number | null {
  const likes = firstNumber(post, ["likesCount", "likeCount", "like_count", "likes"]);
  const comments = firstNumber(post, ["commentsCount", "commentCount", "comment_count", "comments"]);

  if (likes === null && comments === null) return null;
  return Math.max(0, likes ?? 0) + Math.max(0, comments ?? 0);
}

function isVideoPost(post: UnknownRecord): boolean {
  const productType = firstString(post, ["productType", "product_type"]).toLowerCase();
  const mediaType = firstString(post, ["mediaType", "media_type", "type"]).toLowerCase();
  const explicitVideo = firstBoolean(post, ["isVideo", "is_video", "isReel", "is_reel"]);

  return (
    explicitVideo === true ||
    productType === "clips" ||
    productType === "reels" ||
    mediaType === "video" ||
    mediaType === "graphvideo" ||
    mediaType === "reel"
  );
}

function biographyHasLink(biography: string): boolean {
  return /(?:https?:\/\/|www\.|wa\.me\/|linktr\.ee\/|beacons\.ai\/|msha\.ke\/)/i.test(biography);
}

function getStatus(score: number): { status: AuditStatus; label: string } {
  if (score >= 75) return { status: "strong", label: "Perfil fort" };
  if (score >= 55) return { status: "solid", label: "Base sòlida" };
  if (score >= 35) return { status: "improvable", label: "Millorable" };
  return { status: "critical", label: "Crític" };
}

function buildRecommendations(
  engagementRate: number | null,
  videoRatio: number | null,
  hasCta: boolean,
  postsAnalyzed: number,
): string[] {
  const recommendations: string[] = [];

  if (engagementRate === null) {
    recommendations.push("Publica contingut amb mètriques visibles per poder mesurar la resposta real de l’audiència.");
  } else if (engagementRate < 1) {
    recommendations.push("Reformula els primers 2 segons i tanca cada peça amb una pregunta concreta per activar comentaris.");
  } else if (engagementRate < 3) {
    recommendations.push("Mantén la freqüència i prova sèries recurrents per convertir interaccions puntuals en hàbit.");
  }

  if (videoRatio === null || videoRatio < 35) {
    recommendations.push("Augmenta el pes del vídeo vertical: objectiu mínim, 4 de cada 10 publicacions en format Reel.");
  } else if (videoRatio < 60) {
    recommendations.push("Consolida una línia de Reels recognoscible amb portada, ritme i estructura constants.");
  }

  if (!hasCta) {
    recommendations.push("Afegeix un enllaç directe a WhatsApp o a una landing amb una única acció principal.");
  }

  if (postsAnalyzed < 6) {
    recommendations.push("La mostra pública és limitada; repeteix l’auditoria quan hi hagi almenys 6 publicacions recents.");
  }

  if (recommendations.length === 0) {
    recommendations.push("El perfil té una base sòlida: centra el següent cicle en conversió, retenció i contingut seriable.");
  }

  return recommendations.slice(0, 3);
}

export function normalizeInstagramUsername(rawValue: unknown): string | null {
  if (typeof rawValue !== "string") return null;

  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  let candidate = trimmed.replace(/^@+/, "");

  try {
    if (/^https?:\/\//i.test(candidate)) {
      const url = new URL(candidate);
      if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;
      candidate = url.pathname.split("/").filter(Boolean)[0] ?? "";
    }
  } catch {
    return null;
  }

  candidate = candidate.replace(/^@+/, "").replace(/\/$/, "").toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(candidate) ? candidate : null;
}

export function createInstagramAudit(
  profileValue: unknown,
  requestedUsername: string,
  generatedAt = new Date().toISOString(),
): InstagramAuditResult {
  if (!isRecord(profileValue)) {
    throw new Error("INVALID_PROFILE_DATA");
  }

  const providerError = firstString(profileValue, ["error", "errorDescription", "message"]);
  if (providerError) {
    throw new Error(`PROVIDER_PROFILE_ERROR:${providerError}`);
  }

  const isPrivate = firstBoolean(profileValue, ["private", "isPrivate", "is_private"]);
  if (isPrivate === true) {
    throw new Error("PRIVATE_PROFILE");
  }

  const username =
    normalizeInstagramUsername(firstString(profileValue, ["username", "instagramUsername"])) ??
    requestedUsername;
  const followers = Math.max(
    0,
    Math.round(firstNumber(profileValue, ["followersCount", "followerCount", "followers_count"]) ?? 0),
  );

  const posts = firstArray(profileValue, ["latestPosts", "latest_posts", "posts"])
    .filter(isRecord)
    .slice(0, 12);

  const interactionValues = posts
    .map(postInteractions)
    .filter((value): value is number => value !== null);

  const engagementRate =
    followers > 0 && interactionValues.length > 0
      ? round(
          (interactionValues.reduce((total, value) => total + value, 0) /
            interactionValues.length /
            followers) *
            100,
        )
      : null;

  const videoRatio = posts.length > 0
    ? Math.round((posts.filter(isVideoPost).length / posts.length) * 100)
    : null;

  const biography = firstString(profileValue, ["biography", "bio"]);
  const externalUrl = firstString(profileValue, ["externalUrl", "externalUrlShimmed", "website"]);
  const externalUrls = firstArray(profileValue, ["externalUrls", "bioLinks"]);
  const hasCta = Boolean(externalUrl || externalUrls.length > 0 || biographyHasLink(biography));

  let score = 20;

  if (engagementRate !== null) {
    if (engagementRate >= 4) score += 35;
    else if (engagementRate >= 2.5) score += 28;
    else if (engagementRate >= 1) score += 18;
    else score += 6;
  }

  if (videoRatio !== null) {
    if (videoRatio >= 60) score += 30;
    else if (videoRatio >= 35) score += 22;
    else if (videoRatio >= 15) score += 12;
    else score += 4;
  }

  if (hasCta) score += 15;
  if (biography.length >= 20) score += 5;
  if (posts.length >= 6) score += 5;

  score = Math.min(100, score);
  const health = getStatus(score);

  return {
    username,
    followers,
    postsAnalyzed: posts.length,
    engagementRate,
    videoRatio,
    hasCta,
    score,
    status: health.status,
    statusLabel: health.label,
    recommendations: buildRecommendations(engagementRate, videoRatio, hasCta, posts.length),
    generatedAt,
    source: "live",
  };
}
