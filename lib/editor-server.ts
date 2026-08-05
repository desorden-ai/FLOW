import { env } from "cloudflare:workers";
import { cookies } from "next/headers";

const SESSION_COOKIE = "editor_session";

export interface EditorKVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

interface EditorBindings {
  EDITOR_KV?: EditorKVNamespace;
  EDITOR_PASSWORD?: string;
  EDITOR_SESSION_SECRET?: string;
}

const bindings = env as unknown as EditorBindings;

function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function createSessionToken(): Promise<string | null> {
  const secret = bindings.EDITOR_SESSION_SECRET ?? bindings.EDITOR_PASSWORD;
  if (!secret) return null;

  const bytes = new TextEncoder().encode(`desorden-editor:${secret}`);
  return bytesToHex(await crypto.subtle.digest("SHA-256", bytes));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function getEditorKV(): EditorKVNamespace | null {
  return bindings.EDITOR_KV ?? null;
}

export function getEditorPassword(): string | null {
  return bindings.EDITOR_PASSWORD ?? null;
}

export async function isEditorAuthenticated(): Promise<boolean> {
  const expectedToken = await createSessionToken();
  if (!expectedToken) return false;

  const cookieStore = await cookies();
  const receivedToken = cookieStore.get(SESSION_COOKIE)?.value;
  return receivedToken ? constantTimeEqual(receivedToken, expectedToken) : false;
}

export async function setEditorSession(): Promise<boolean> {
  const token = await createSessionToken();
  if (!token) return false;

  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return true;
}

export async function clearEditorSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
