import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DRIVE_FILE_ID = "133HQ372ot9jSu6pCmjPZo79VJBnCZKZv";
const DOWNLOAD_URL = `https://drive.usercontent.google.com/download?id=${DRIVE_FILE_ID}&export=download&confirm=t`;
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

async function assetsAlreadyExist() {
  try {
    const files = await readdir(OUTPUT_DIR);
    return [...EXPECTED_FILES].every((file) => files.includes(file));
  } catch {
    return false;
  }
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
      throw new Error("The Drive ZIP uses data descriptors, which are not supported by this minimal extractor.");
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
  const response = await fetch(DOWNLOAD_URL, {
    redirect: "follow",
    headers: {
      "user-agent": "DESORDEN-FLOW-build/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Google Drive download failed with ${response.status} ${response.statusText}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    throw new Error("Google Drive returned an HTML confirmation page instead of the ZIP file.");
  }

  const archive = Buffer.from(await response.arrayBuffer());
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
