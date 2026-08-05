import { NextResponse } from "next/server";

// Simple in-memory store for drafts (simulating a database for this prototype)
// Note: In a real Cloudflare Workers setup, this would be D1 or KV.
// Since Next.js clears memory on hot reload, this is just for demonstration
// of the draft/publish cycle.
let currentDraftVersion = 0;
let currentDraftData: string | null = null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { html, version } = body;

    // Conflict detection
    if (typeof version === "number" && version < currentDraftVersion) {
      return NextResponse.json(
        { error: "conflict", message: "A newer version already exists on the server." },
        { status: 409 }
      );
    }

    // Save draft
    currentDraftVersion = (typeof version === "number" ? version : currentDraftVersion) + 1;
    currentDraftData = html;

    return NextResponse.json({
      saved: true,
      version: currentDraftVersion,
    });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
