#!/bin/bash

# Fix audit route
sed -i -e 's/const contentLength = Number(request.headers.get("content-length") ?? 0);/const contentLengthHeader = request.headers.get("content-length");\n  if (!contentLengthHeader) return jsonError(411, "LENGTH_REQUIRED", "Es requereix Content-Length.");\n  const contentLength = Number(contentLengthHeader);\n  if (!Number.isSafeInteger(contentLength) || contentLength > MAX_REQUEST_BYTES)/' app/api/audit/route.ts
sed -i -e '/if (contentLength > MAX_REQUEST_BYTES) {/d' app/api/audit/route.ts

# Fix auth route
sed -i -e 's/const contentLength = Number(request.headers.get("content-length") ?? 0);/const contentLengthHeader = request.headers.get("content-length");\n  if (!contentLengthHeader) return NextResponse.json({ error: "Length Required" }, { status: 411 });\n  const contentLength = Number(contentLengthHeader);\n  if (!Number.isSafeInteger(contentLength) || contentLength > 2048)/' app/api/auth/route.ts
sed -i -e '/if (contentLength > 2048) {/d' app/api/auth/route.ts

# Fix publish route
sed -i -e 's/const contentLength = Number(request.headers.get("content-length") ?? 0);/const contentLengthHeader = request.headers.get("content-length");\n  if (!contentLengthHeader) return NextResponse.json({ error: "Length Required" }, { status: 411 });\n  const contentLength = Number(contentLengthHeader);\n  if (!Number.isSafeInteger(contentLength) || contentLength > 5120)/' app/api/publish/route.ts
sed -i -e '/if (contentLength > 5120) {/d' app/api/publish/route.ts

# Fix draft route
sed -i -e 's/const contentLength = Number(request.headers.get("content-length") ?? 0);/const contentLengthHeader = request.headers.get("content-length");\n  if (!contentLengthHeader) return NextResponse.json({ error: "Length Required" }, { status: 411 });\n  const contentLength = Number(contentLengthHeader);\n  if (!Number.isSafeInteger(contentLength) || contentLength > MAX_DOCUMENT_BYTES * 2)/' app/api/draft/route.ts
sed -i -e '/if (contentLength > MAX_DOCUMENT_BYTES \* 2) {/d' app/api/draft/route.ts
