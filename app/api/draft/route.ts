import { NextResponse } from "next/server";
import {
  EDITOR_DOCUMENT_ID,
  parseEditorDocument,
  parseStoredEditorDocument,
  type StoredEditorDocument,
} from "../../../lib/editor-model";
import { getEditorKV, isEditorAuthenticated } from "../../../lib/editor-server";

const DRAFT_KEY = `editor:${EDITOR_DOCUMENT_ID}:draft`;
const MAX_DOCUMENT_BYTES = 200_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(request.url).origin;
}

function emptyDraft(): StoredEditorDocument {
  return {
    documentId: EDITOR_DOCUMENT_ID,
    version: 0,
    data: {},
    updatedAt: new Date(0).toISOString(),
  };
}

async function readDraft(): Promise<StoredEditorDocument> {
  const kv = getEditorKV();
  if (!kv) return emptyDraft();

  const stored = await kv.get(DRAFT_KEY);
  return parseStoredEditorDocument(stored) ?? emptyDraft();
}

export async function HEAD() {
  return new NextResponse(null, {
    status: (await isEditorAuthenticated()) ? 200 : 401,
  });
}

export async function GET() {
  if (!(await isEditorAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kv = getEditorKV();
  if (!kv) {
    return NextResponse.json({ error: "EDITOR_KV is not configured" }, { status: 503 });
  }

  try {
    return NextResponse.json({ draft: await readDraft() });
  } catch {
    return NextResponse.json({ error: "Unable to read draft" }, { status: 500 });
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
  if (!Number.isSafeInteger(contentLength) || contentLength > MAX_DOCUMENT_BYTES * 2) {
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
      body.version < 0
    ) {
      return NextResponse.json({ error: "Invalid version" }, { status: 400 });
    }

    const data = parseEditorDocument(body.editMap);
    const serializedData = JSON.stringify(data);
    if (new TextEncoder().encode(serializedData).byteLength > MAX_DOCUMENT_BYTES) {
      return NextResponse.json({ error: "Draft is too large" }, { status: 413 });
    }

    const currentDraft = await readDraft();
    if (body.version !== currentDraft.version) {
      return NextResponse.json(
        {
          error: "VERSION_CONFLICT",
          currentVersion: currentDraft.version,
          remoteDraft: currentDraft,
        },
        { status: 409 },
      );
    }

    const nextDraft: StoredEditorDocument = {
      documentId: EDITOR_DOCUMENT_ID,
      version: currentDraft.version + 1,
      data,
      updatedAt: new Date().toISOString(),
    };

    await kv.put(DRAFT_KEY, JSON.stringify(nextDraft));

    return NextResponse.json({
      saved: true,
      version: nextDraft.version,
      draft: nextDraft,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
