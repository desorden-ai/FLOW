import { NextResponse } from "next/server";
import {
  EDITOR_DOCUMENT_ID,
  parseStoredEditorDocument,
  type StoredEditorDocument,
} from "../../../lib/editor-model";
import { getEditorKV, isEditorAuthenticated } from "../../../lib/editor-server";

const DRAFT_KEY = `editor:${EDITOR_DOCUMENT_ID}:draft`;
const PUBLISHED_KEY = `editor:${EDITOR_DOCUMENT_ID}:published`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(request.url).origin;
}

function emptyPublishedDocument(): StoredEditorDocument {
  return {
    documentId: EDITOR_DOCUMENT_ID,
    version: 0,
    data: {},
    updatedAt: new Date(0).toISOString(),
    publishedAt: new Date(0).toISOString(),
  };
}

export async function GET() {
  const kv = getEditorKV();
  if (!kv) {
    return NextResponse.json({ published: emptyPublishedDocument() });
  }

  try {
    const stored = await kv.get(PUBLISHED_KEY);
    const published = parseStoredEditorDocument(stored) ?? emptyPublishedDocument();
    return NextResponse.json({ published });
  } catch {
    return NextResponse.json({ published: emptyPublishedDocument() });
  }
}

export async function POST(request: Request) {
  if (!(await isEditorAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const kv = getEditorKV();
  if (!kv) {
    return NextResponse.json({ error: "EDITOR_KV is not configured" }, { status: 503 });
  }

  const contentLengthHeader = request.headers.get("content-length");
  if (!contentLengthHeader) return NextResponse.json({ error: "Length Required" }, { status: 411 });
  const contentLength = Number(contentLengthHeader);
  if (!Number.isSafeInteger(contentLength) || contentLength > 5120) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (body.documentId !== EDITOR_DOCUMENT_ID) {
      return NextResponse.json({ error: "Invalid document" }, { status: 400 });
    }

    if (
      typeof body.version !== "number" ||
      !Number.isSafeInteger(body.version) ||
      body.version < 1
    ) {
      return NextResponse.json({ error: "Invalid version" }, { status: 400 });
    }

    const storedDraft = await kv.get(DRAFT_KEY);
    const draft = parseStoredEditorDocument(storedDraft);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    if (body.version !== draft.version) {
      return NextResponse.json(
        {
          error: "VERSION_CONFLICT",
          currentVersion: draft.version,
        },
        { status: 409 },
      );
    }

    const publishedAt = new Date().toISOString();
    const published: StoredEditorDocument = {
      ...draft,
      publishedAt,
      updatedAt: publishedAt,
    };

    await kv.put(PUBLISHED_KEY, JSON.stringify(published));

    return NextResponse.json({
      published: true,
      version: published.version,
      publishedAt,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
