#!/bin/bash
sed -i -e 's/if (!Number.isSafeInteger(contentLength) || contentLength > 2048)/if (!Number.isSafeInteger(contentLength) || contentLength > 2048) {/' app/api/auth/route.ts
sed -i -e 's/if (!Number.isSafeInteger(contentLength) || contentLength > 5120)/if (!Number.isSafeInteger(contentLength) || contentLength > 5120) {/' app/api/publish/route.ts
sed -i -e 's/if (!Number.isSafeInteger(contentLength) || contentLength > MAX_DOCUMENT_BYTES \* 2)/if (!Number.isSafeInteger(contentLength) || contentLength > MAX_DOCUMENT_BYTES * 2) {/' app/api/draft/route.ts
sed -i -e 's/if (!Number.isSafeInteger(contentLength) || contentLength > MAX_REQUEST_BYTES)/if (!Number.isSafeInteger(contentLength) || contentLength > MAX_REQUEST_BYTES) {/' app/api/audit/route.ts
