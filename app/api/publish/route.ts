import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function getKV() {
  return (process.env.EDITOR_KV || (globalThis as any).EDITOR_KV) as any;
}

export async function GET() {
  try {
    const kv = getKV();
    if (!kv) {
      return NextResponse.json({ published_data: "{}" });
    }
    const data = await kv.get("published_data");
    return NextResponse.json({ published_data: data || "{}" });
  } catch (error) {
    return NextResponse.json({ published_data: "{}" });
  }
}

export async function POST(request: Request) {
  try {
    const session = cookies().get("editor_session");
    if (!session || session.value !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const kv = getKV();
    if (!kv) {
      return NextResponse.json({ error: "KV namespace not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { version } = body;

    // Get current draft
    const draftData = await kv.get("draft_data");
    
    if (draftData) {
      // Move draft to published
      await kv.put("published_data", draftData);
      
      // Optionally, clear draft or keep it
      // await kv.delete("draft_data");
    }

    return NextResponse.json({
      published: true,
      version: version,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
