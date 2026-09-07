# CODEX PRIVACY / SECURITY V1 — DESORDEN CITA

## Authority and scope

This document is authoritative for privacy/security changes to the public booking flow and the admin WhatsApp/token controls.

It **supersedes any earlier sentence in `docs/CODEX_ADMIN_V2_HANDOFF.md` that says the only allowed public change is chronological time ordering**. The responsive-admin and bulk-import requirements in that handoff remain active. Implement both documents together.

Repository: `desorden-ai/FLOW`

Production branch: `Cita`

Work branch: `codex/cita-admin-responsive-import`

Do not merge or deploy production from this task.

Keep the existing architecture and dependencies:

```text
Customer browser
  -> cita.desorden.cat
  -> Cloudflare Worker + Static Assets
  -> Google Apps Script
  -> Google Sheet CITA
```

Do not introduce React, Vite, Supabase, Firebase, analytics, trackers, external fonts/scripts, CDN JS, or a new database.

---

## 1. Privacy model

Treat data in three classes.

### PUBLIC

Only:

- Panasonic / service identity;
- `firstName` only;
- available dates;
- available times;
- final booking date/time/status;
- generic fallback action `No puedo en ninguna de estas horas`.

### ADMINISTRATIVE

Private `/admin/` may contain:

- full client name;
- phone;
- address;
- city;
- SA(s);
- block;
- booking URL;
- schedule and confirmed booking;
- create/edit/archive/import controls.

### SECRET / CREDENTIAL

- admin password;
- booking token;
- `APPS_SCRIPT_URL`;
- Script Properties / Worker secrets.

A booking token is a bearer credential. Possession authorizes access to exactly one physical visit.

---

## 2. Public page final UX

Target visible copy/structure:

```text
Panasonic

Mantenimiento Panasonic
Confirma la fecha de tu mantenimiento

[approved blue M mark]
Instalaciones Ángel Molero
Servicio Técnico Autorizado Panasonic

Hola, Marta

Selecciona una fecha y hora disponibles.

JUEVES, 10 DE SEPTIEMBRE
[09:00] [10:00] [11:00] [12:00]

VIERNES, 11 DE SEPTIEMBRE
...

No puedo en ninguna de estas horas

Fontanería Ángel Molero e Hijos S.L.
Aviso legal · Privacidad
```

Do not show on the public page:

- surname(s);
- phone;
- address;
- city;
- SA;
- model;
- block;
- clientId;
- internal IDs except the opaque `slotId` used invisibly by the booking request;
- technical notes;
- booking URL;
- token;
- other clients' data.

### Confirmation state

Use:

```text
Cita confirmada

Jueves 10 de septiembre · 10:30

Su mantenimiento ha quedado reservado.
```

Do not display address or other personal data after confirmation.

### Service identity

Replace the current red `SAT` badge/service line with the requested blue-M identity treatment:

- approved/local blue M mark;
- `Instalaciones Ángel Molero`;
- `Servicio Técnico Autorizado Panasonic`.

Do not hotlink a logo from another domain. If an approved M asset is not already available in the repository, do not invent a complex graphic logo. Use a minimal local typographic `M` fallback styled in blue and report that the final approved artwork remains an asset-level QA item.

### Footer legal links

Do not duplicate a long legal policy inside CITA unless required. Prefer direct links to the company's existing official legal/privacy pages, opened normally with `rel="noopener noreferrer"` where applicable.

Candidate official pages discovered during architecture review:

- privacy (Spanish): `https://www.fontaneriabages.com/politica-de-privacidad-es-rgpd`
- legal notice: company website legal notice page under `fontaneriabages.com`

Before production merge, manually verify the chosen legal-notice URL contains the company's **current** registered address. Public registry/current municipal data indicate `C/ Creixell 17, 08295 Sant Vicenç de Castellet`, while one indexed Spanish legal page has historically shown an older address. Do not copy stale legal identity data into CITA.

The public CITA screen itself should only show:

`Fontanería Ángel Molero e Hijos S.L. · Aviso legal · Privacidad`

No CIF, fiscal address or Registro Mercantil details on the booking screen.

---

## 3. Public API data minimization

There must be defense in depth at both Apps Script and Worker.

### Apps Script

Change public serialization so the public client object is minimal at the source.

`publicClient_(client)` must return only a first-name/display-name field, e.g.:

```js
{ firstName: 'Marta' }
```

Derive it server-side from the canonical full name. The browser must never receive the full name merely to shorten it locally.

### Worker

`sanitizeAvailability()` must independently re-sanitize the upstream payload and return only:

```json
{
  "ok": true,
  "client": {
    "firstName": "Marta"
  },
  "booking": {
    "date": "2026-09-10",
    "time": "10:30",
    "status": "CONFIRMADO"
  },
  "slots": [
    {
      "slotId": "SLT-...",
      "date": "2026-09-10",
      "time": "10:30"
    }
  ]
}
```

`booking` can be `null` when not confirmed.

Do not return from the public availability response:

- phone;
- address;
- city;
- SA;
- clientId;
- block;
- token;
- bookingUrl;
- admin fields;
- internal Sheet fields;
- `contactWhatsApp`.

The private admin snapshot remains unchanged in scope and may contain full operational data.

---

## 4. Token transport: eliminate avoidable URL/log exposure

### 4.1 Current problem

The existing generated URL is `/?c=TOKEN`, and the existing browser performs a GET such as `/api?action=availability&token=TOKEN`. A query-string bearer token can appear in browser history, copied URLs, HTTP request logs and upstream URLs.

A query token cannot literally satisfy "zero token in URL logs" because the initial HTTP request already contains the query before JavaScript can remove it.

### 4.2 Canonical new link

For newly generated/regenerated booking URLs, use a URL fragment so the token is never sent in the initial HTTP request:

```text
https://cita.desorden.cat/#c=TOKEN
```

Update `buildBookingUrl_(token)` accordingly.

### 4.3 Backward compatibility

Existing `?c=TOKEN` links may already have been sent. Do not break them.

On public bootstrap accept, in this order:

1. token already held in `sessionStorage`;
2. new fragment `#c=TOKEN`;
3. legacy query `?c=TOKEN`.

If a token is read from fragment or query:

1. validate basic client-side shape;
2. store it in `sessionStorage` only;
3. immediately execute `history.replaceState()` to leave the visible URL as `https://cita.desorden.cat/` (or same origin/path without query/hash);
4. only then call the API.

Do not use `localStorage` for booking tokens.

Use a dedicated key such as `desorden_cita_booking_token`.

### 4.4 Token shape

Current token generation is already opaque and high entropy (two UUIDs without hyphens, 64 hex characters). Preserve or strengthen this; do not weaken it.

Server-side validation should reject obviously malformed tokens before touching Sheet data. Since current generated tokens are 64 hex chars, prefer exact/compatible validation rather than only a broad 16..256 length check.

The token must never contain clientId, name, phone, address, SA or block.

---

## 5. Public API transport: token never in API URL

Move availability from public GET query transport to POST body transport.

### Browser

Do not call:

```text
GET /api?action=availability&token=TOKEN
```

Use:

```http
POST /api
Content-Type: application/json
```

```json
{
  "action": "availability",
  "token": "TOKEN"
}
```

Booking remains POST and should use:

```json
{
  "action": "book",
  "token": "TOKEN",
  "slotId": "SLT-..."
}
```

### Worker -> Apps Script

Do not forward the token to Apps Script in a query string.

Forward `availability` by POST JSON as well.

### Apps Script

Extend `doPost()` to route both:

- `availability`;
- `book`.

Do not log payloads.

Legacy availability GET may be removed or return a generic bad/method response after the new JS is deployed. Do not continue generating new token-bearing GET URLs.

---

## 6. Public fallback WhatsApp

Keep the visible button:

`No puedo en ninguna de estas horas`

It must not require exposing client address/full name/service data to the browser.

The message should be generic/minimal, for example:

```text
Buenos días.

No puedo en ninguna de las horas propuestas para el mantenimiento Panasonic. ¿Podemos buscar otra fecha?
```

(or `Buenas tardes` after 14:00 Europe/Madrid).

Do not include address, SA, model, block or technical information.

Because public availability must no longer return `contactWhatsApp`, keep `WHATSAPP_TARGET` server-side. The simplest accepted implementation is a small Worker redirect endpoint/action for the fallback button that uses `env.WHATSAPP_TARGET` and a generic prefilled message without client PII and without the booking token.

Do not add a third-party SDK.

---

## 7. Admin WhatsApp hardening

Keep personalized admin WhatsApp, but minimize the message.

Exact content intent:

```text
Buenos días, Marta.

Le confirmamos que corresponde realizar la revisión de su equipo Panasonic.

Puede seleccionar la fecha y hora que le vaya mejor desde su enlace personal:

https://cita.desorden.cat/#c=TOKEN_PERSONAL

Gracias.
```

Rules:

- Europe/Madrid timezone;
- before 14:00 -> `Buenos días`;
- from 14:00 -> `Buenas tardes`;
- use first name only in the outgoing message;
- exact personal booking URL;
- no address;
- no SA;
- no model;
- no block;
- no technical data.

### Identity resolution before opening WhatsApp

Do not infer the target primarily from mutable rendered text.

Prefer exact `clientId` + block resolution from the in-memory admin snapshot. Attach a stable `data-client-id`/equivalent to the admin action if needed.

Before opening WhatsApp, verify all of the following in memory:

- exactly one client resolved;
- clientId exists;
- block exists and matches the containing block;
- phone exists and normalizes to a usable number;
- internal address exists (validation only; do not include it in the message);
- bookingUrl exists;
- bookingUrl belongs to `https://cita.desorden.cat/` and contains a valid fragment/legacy token format.

If any check fails or resolution is ambiguous:

- do not open WhatsApp;
- show a local admin error;
- do not log the booking URL/token.

The current `Europe/Madrid` greeting behavior can be reused.

---

## 8. Token regeneration / revocation

Add a private admin action to regenerate a client's personal booking link when a token is suspected to have been sent incorrectly.

Suggested UI label:

`Regenerar enlace`

Require an explicit confirmation prompt.

### Browser -> Worker

Send only the admin-authenticated `clientId`, not an arbitrary token or block supplied by the browser.

Suggested admin action:

```json
{
  "action": "regenerateBookingToken",
  "clientId": "CLI-..."
}
```

### Apps Script

Under `LockService`:

1. locate all rows for that exact canonical `CLIENTE_ID`;
2. if none -> `CLIENT_NOT_FOUND`;
3. create one new `randomToken_()`;
4. create the new canonical fragment booking URL;
5. write the same new `TOKEN` and `URL_CITA` to every row belonging to that physical visit;
6. preserve clientId, block, SA rows, pending/confirmed state, confirmed date/time and history;
7. return a fresh admin snapshot.

The old token must stop resolving immediately because it is no longer stored on the canonical visit.

Token regeneration is a security control and may be allowed even for a confirmed visit; it must not alter the confirmation itself.

### Effective expiry

Keep V1 simple: do not add a complex expiry scheduler/database column merely for this task.

Treat archived/inactive visits as non-public. A token for an archived visit should return the same generic invalid/not-available behavior without personal data.

Document automatic campaign expiry as a possible later policy if an exact retention/campaign duration is defined.

---

## 9. Server-side booking invariants — preserve

Do not weaken existing protections.

The browser never defines:

- clientId for public booking;
- block;
- client identity.

Server derives the client and block from the token.

Under the booking lock, re-read mutable state and verify:

- token still resolves to exactly one physical visit;
- visit has a block;
- selected slot exists;
- selected slot belongs to that client's block;
- selected slot is still `LIBRE`;
- client is not already confirmed.

Keep:

- `LockService`;
- one physical visit = one appointment;
- multiple SAs at same normalized household = one visit;
- confirmed reservations preserved;
- token A cannot enumerate/read token B data.

Current slot/block server-side validation already exists; preserve it.

---

## 10. Public/admin headers and static assets

Current API JSON already sets:

- `Cache-Control: no-store, max-age=0`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: no-referrer`.

Preserve these and add a single reusable security-header policy for HTML/API responses where appropriate.

Required target headers:

```text
Referrer-Policy: no-referrer
Cache-Control: no-store
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

If `interest-cohort` is unsupported/obsolete in the target runtime it may be omitted; keep the rest restrictive.

### Static HTML delivery

Current `wrangler.jsonc` runs the Worker first only for `/api` paths, so API headers do not automatically apply to `web/index.html` or `/admin/` HTML.

Implement the smallest coherent solution that allows the Worker to wrap static HTML responses with security headers while delegating asset bytes to `env.ASSETS`. Avoid a separate service/framework.

It is acceptable to set Worker-first for static assets if this materially simplifies consistent headers, provided tests confirm `/`, `/admin/`, CSS/JS and `/api` still resolve correctly.

Add in public/admin HTML:

```html
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="referrer" content="no-referrer">
```

The `robots` meta already exists; preserve it.

No Google Analytics, Meta Pixel, Hotjar, third-party trackers or external fonts/scripts.

---

## 11. Logging rules

Application code must not log:

- complete token;
- complete booking URL;
- full name;
- phone;
- address;
- full public/admin request payload.

Avoid `console.log(request.url)` and equivalent.

If diagnostics are genuinely needed:

- log generic error codes;
- use internal IDs only where safe;
- if token correlation is ever required, use a short one-way hash/truncated fingerprint, never raw token;
- do not add persistent diagnostics in this task unless needed for a real failure.

The new fragment URL + POST availability transport is required specifically to reduce token appearance in platform/server URL logs.

Legacy `?c=` links cannot retroactively avoid the token reaching the edge on their initial HTTP request; this is why all newly generated/regenerated links must use `#c=`.

---

## 12. Admin data rules — preserve

Private dashboard may continue to show/manage full operational data.

Maintain:

- confirmed client cannot be archived;
- confirmed client cannot be moved to another block;
- archive, never physical delete, for normal client removal;
- preserve historical rows;
- preserve existing SAs during edit;
- admin credential remains in `sessionStorage`, never `localStorage`;
- `APPS_SCRIPT_URL` remains Worker-side only.

Bulk import/responsive behavior remains as specified in `CODEX_ADMIN_V2_HANDOFF.md`.

---

## 13. Availability rules — preserve

Keep:

- up to 8 dates per block;
- up to 8 times per date;
- independent times per day;
- visual per-date editing;
- confirmed slots preserved;
- inter-block overlap warnings.

Also keep/fix chronological display order so `9:00` appears before `10:00`, not lexicographically after it.

---

## 14. Files expected to change for privacy/security

In addition to admin/import files from the other handoff, expect:

- `web/index.html`
- `web/app.js`
- `web/styles.css`
- `web/admin/whatsapp.js`
- `web/admin/admin.js` if stable clientId action wiring is needed
- `src/worker.js`
- `apps-script/Code.gs`
- `apps-script/Admin.gs` for token regeneration
- `wrangler.jsonc` if Worker-first static wrapping is used
- tests
- relevant docs

Do not add dependencies.

---

## 15. Automated tests required

Extend existing tests cheaply. Cover at least:

1. public availability response contains only firstName + slots + booking;
2. public response does not contain address/city/phone/clientId/block/token/bookingUrl/SA;
3. availability token is POSTed in body, not request URL;
4. legacy `?c=` bootstrap is accepted and scrubbed from visible history;
5. canonical fragment `#c=` bootstrap is accepted and scrubbed;
6. token is stored only in sessionStorage;
7. new generated booking URL uses `#c=`;
8. malformed token is rejected;
9. booking still validates slot belongs to token-derived block;
10. confirmed booking still cannot be overwritten;
11. admin token regeneration changes token/URL while preserving booking/client metadata;
12. old regenerated token no longer resolves;
13. admin WhatsApp uses first name and exact booking URL;
14. admin WhatsApp refuses ambiguous/missing booking URL target;
15. public confirmation contains no address;
16. security headers are present on public/admin HTML and API responses;
17. public time ordering handles `9:00`, `10:00`, `11:00`, `12:00` chronologically;
18. existing admin/import tests remain green.

Run:

```bash
npm test
```

---

## 16. Manual QA required before production

### Public

- open a new `#c=TOKEN` link;
- verify browser address becomes exactly `https://cita.desorden.cat/` after token capture;
- DevTools Network: no token appears in `/api` URL;
- public JSON contains no address/city/full name/internal IDs;
- first name only visible;
- times chronological;
- confirmation shows only date/time + generic confirmation text;
- reload same tab still works from sessionStorage;
- new tab on clean root does not inherit the token;
- fallback WhatsApp contains no address/SA/block/token;
- no analytics/tracker requests.

### Legacy compatibility

- old `?c=TOKEN` link still works;
- URL is scrubbed immediately after client bootstrap;
- no new URLs generated with query tokens.

### Admin

- full operational data remains visible;
- WhatsApp chooses exact client and uses first name only in message;
- ambiguous/missing URL fails closed;
- regenerate link invalidates old token and produces a working new link;
- regenerate confirmed client does not change its appointment;
- archive/move restrictions remain.

### Headers

Verify response headers for `/`, `/admin/` and `/api`.

### Legal footer

Verify official legal/privacy links manually and confirm the legal notice references the company's current legal identity/address before production merge.

---

## 17. Definition of done

Privacy/security part is complete only when:

- public page exposes first name + dates/times/confirmation only;
- full name/address/city never cross the public availability API;
- new personal links use `#c=`;
- legacy `?c=` links remain compatible but are immediately scrubbed;
- public API transports token only in POST body;
- Apps Script also receives token via POST body, not availability query URL;
- booking token stays in sessionStorage only;
- admin WhatsApp fails closed on ambiguity and sends only first name + minimal copy + exact personal link;
- token can be regenerated privately without changing the booking/history;
- restrictive security headers are applied to document/API responses;
- no trackers/external runtime dependencies were added;
- all tests pass;
- no merge/deploy to `Cita` occurred.
