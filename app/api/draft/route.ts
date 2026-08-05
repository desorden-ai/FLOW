import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function getKV() {
  return (process.env.EDITOR_KV || (globalThis as any).EDITOR_KV) as any;
}

export async function GET() {
  try {
    const kv = getKV();
    if (!kv) {
      console.warn("KV namespace not found");
      return NextResponse.json({ draft_data: "{}" });
    }
    const data = await kv.get("draft_data");
    return NextResponse.json({ draft_data: data || "{}" });
  } catch (error) {
    return NextResponse.json({ draft_data: "{}" });
  }
}

export async function HEAD() {
  const session = cookies().get("editor_session");
  if (!session || session.value !== "authenticated") {
    return new NextResponse(null, { status: 401 });
  }
  return new NextResponse(null, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const session = cookies().get("editor_session");
    if (!session || session.value !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { editMap, version } = body;

    const kv = getKV();
    if (!kv) {
      return NextResponse.json({ error: "KV namespace not configured" }, { status: 500 });
    }

    // Atomic version check could be implemented using metadata, but for now we trust the client or just save.
    const currentVersionRaw = await kv.get("draft_version");
    const currentDraftVersion = currentVersionRaw ? parseInt(currentVersionRaw, 10) : 0;

    if (typeof version === "number" && version < currentDraftVersion) {
      return NextResponse.json(
        { error: "conflict", message: "A newer version already exists on the server." },
        { status: 409 }
      );
    }

    const newVersion = (typeof version === "number" ? version : currentDraftVersion) + 1;
    
    // Save draft
    await kv.put("draft_data", typeof editMap === "string" ? editMap : JSON.stringify(editMap));
    await kv.put("draft_version", newVersion.toString());

    return NextResponse.json({
      saved: true,
      version: newVersion,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
