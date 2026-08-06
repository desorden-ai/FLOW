import { NextResponse } from "next/server";
import {
  clearEditorSession,
  getEditorPassword,
  isEditorAuthenticated,
  setEditorSession,
} from "../../../lib/editor-server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET() {
  return NextResponse.json({ authenticated: await isEditorAuthenticated() });
}

export async function POST(request: Request) {
  const contentLengthHeader = request.headers.get("content-length");
  if (!contentLengthHeader) return NextResponse.json({ error: "Length Required" }, { status: 411 });
  const contentLength = Number(contentLengthHeader);
  if (!Number.isSafeInteger(contentLength) || contentLength > 2048) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  try {
    const body: unknown = await request.json();
    if (!isRecord(body) || typeof body.password !== "string" || body.password.length > 256) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const validPassword = getEditorPassword();
    if (!validPassword) {
      return NextResponse.json(
        { error: "Editor authentication is not configured" },
        { status: 503 },
      );
    }

    if (body.password !== validPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    if (!(await setEditorSession())) {
      return NextResponse.json(
        { error: "Editor session is not configured" },
        { status: 503 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE() {
  await clearEditorSession();
  return NextResponse.json({ success: true });
}
