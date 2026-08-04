import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DRIVE_FILE_ID = "133HQ372ot9jSu6pCmjPZo79VJBnCZKZv";
const OUTPUT_DIR = path.resolve("public/media/clients/logo-tunnel");
const EXPECTED_FILES = new Set([
  "1000091506_dark_optimized.webp",
  "1000091515_dark_optimized.webp",
  "1000091516_dark_optimized.webp",
  "1000091520_dark_optimized.webp",
  "1000091519_dark_optimized.webp",
  "1000091541_dark_optimized.webp",
  "1000091543_dark_optimized.webp",
]);

const DOWNLOAD_CANDIDATES = [
  `https://drive.usercontent.google.com/download?id=${DRIVE_FILE_ID}&export=download&authuser=0&confirm=t`,
  `https://drive.google.com/uc?export=download&id=${DRIVE_FILE_ID}&confirm=t`,
];

async function assetsAlreadyExist() {
  try {
    const files = await readdir(OUTPUT_DIR);
    return [...EXPECTED_FILES].every((file) => files.includes(file));
  } catch {
    return false;
  }
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function getCookieHeader(response) {
  const setCookies = response.headers.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    return setCookies.map((cookie) => cookie.split(";", 1)[0]).join("; ");
  }

  const singleHeader = response.headers.get("set-cookie");
  return singleHeader ? singleHeader.split(/,(?=[^;,]+=)/).map((cookie) => cookie.split(";", 1)[0]).join("; ") : "";
}

function confirmationRequestFromHtml(html, originalUrl) {
  const formMatch = html.match(/<form\b[^>]*\bid=["']download-form["'][^>]*>/i)
    ?? html.match(/<form\b[^>]*\baction=["'][^"']*drive\.usercontent\.google\.com\/download[^"']*["'][^>]*>/i);

  if (formMatch) {
    const formTag = formMatch[0];
    const actionMatch = formTag.match(/\baction=["']([^"']+)["']/i);
    const methodMatch = formTag.match(/\bmethod=["']([^"']+)["']/i);
    const action = decodeHtml(actionMatch?.[1] ?? originalUrl);
    const method = (methodMatch?.[1] ?? "GET").toUpperCase();
    const params = new URLSearchParams();

    for (const input of html.matchAll(/<input\b[^>]*>/gi)) {
      const name = input[0].match(/\bname=["']([^"']+)["']/i)?.[1];
      const value = input[0].match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? "";
      if (name) params.set(decodeHtml(name), decodeHtml(value));
    }

    if (!params.has("id")) params.set("id", DRIVE_FILE_ID);
    if (!params.has("export")) params.set("export", "download");
    if (!params.has("confirm")) params.set("confirm", "t");

    if (method === "POST") {
      return {
        url: action,
        init: {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        },
      };
    }

    const url = new URL(action);
    params.forEach((value, key) => url.searchParams.set(key, value));
    return { url: url.toString(), init: { method: "GET" } };
  }

  const downloadUrlMatch = html.match(/["']downloadUrl["']\s*:\s*["']([^"']+)["']/i)
    ?? html.match(/https:\/\/drive\.usercontent\.google\.com\/download\?[^"'<>\s]+/i);

  if (downloadUrlMatch) {
    const rawUrl = downloadUrlMatch[1] ?? downloadUrlMatch[0];
    return {
      url: decodeHtml(rawUrl.replaceAll("\\u003d", "=").replaceAll("\\u0026", "&")),
      init: { method: "GET" },
    };
  }

  return null;
}

async function request(url, init = {}, cookie = "") {
  const headers = new Headers(init.headers ?? {});
  headers.set("user-agent", "DESORDEN-FLOW-build/1.1");
  headers.set("accept", "application/zip,application/octet-stream,*/*");
  if (cookie) headers.set("cookie", cookie);

  return fetch(url, {
    ...init,
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });
}

async function downloadArchive() {
  let lastError = null;

  for (const candidate of DOWNLOAD_CANDIDATES) {
    try {
      let response = await request(candidate);
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      let archive = Buffer.from(await response.arrayBuffer());
      if (archive.readUInt32LE(0) === 0x04034b50) return archive;

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) {
        throw new Error(`Unexpected Google Drive response type: ${contentType || "unknown"}.`);
      }

      const html = archive.toString("utf8");
      const confirmation = confirmationRequestFromHtml(html, candidate);
      if (!confirmation) {
        throw new Error("Google Drive confirmation form could not be resolved.");
      }

      const cookie = getCookieHeader(response);
      response = await request(confirmation.url, confirmation.init, cookie);
      if (!response.ok) {
        throw new Error(`Confirmation download failed with ${response.status} ${response.statusText}.`);
      }

      archive = Buffer.from(await response.arrayBuffer());
      if (archive.readUInt32LE(0) === 0x04034b50) return archive;

      throw new Error("Google Drive returned HTML after confirming the download.");
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to download the logo tunnel ZIP from Google Drive.");
}

function extractStoredZipEntries(buffer) {
  const files = new Map();
  let offset = 0;

  while (offset + 30 <= buffer.length) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x04034b50) break;

    const flags = buffer.readUInt16LE(offset + 6);
    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);

    if ((flags & 0x08) !== 0) {
      throw new Error("The Drive ZIP uses unsupported data descriptors.");
    }

    if (compressionMethod !== 0) {
      throw new Error(`Unsupported ZIP compression method: ${compressionMethod}.`);
    }

    const nameStart = offset + 30;
    const nameEnd = nameStart + fileNameLength;
    const dataStart = nameEnd + extraLength;
    const dataEnd = dataStart + compressedSize;
    const fileName = buffer.subarray(nameStart, nameEnd).toString("utf8");
    const safeName = path.basename(fileName);

    if (EXPECTED_FILES.has(safeName)) {
      files.set(safeName, buffer.subarray(dataStart, dataEnd));
    }

    offset = dataEnd;
  }

  return files;
}

async function main() {
  if (await assetsAlreadyExist()) {
    console.log("Logo tunnel assets already available.");
    return;
  }

  console.log("Downloading optimized logo tunnel assets from Google Drive…");
  const archive = await downloadArchive();
  const extracted = extractStoredZipEntries(archive);
  const missing = [...EXPECTED_FILES].filter((file) => !extracted.has(file));

  if (missing.length > 0) {
    throw new Error(`Missing logo assets in downloaded ZIP: ${missing.join(", ")}`);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all(
    [...extracted.entries()].map(([fileName, bytes]) =>
      writeFile(path.join(OUTPUT_DIR, fileName), bytes),
    ),
  );

  console.log(`Prepared ${extracted.size} optimized WebP logo assets.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
