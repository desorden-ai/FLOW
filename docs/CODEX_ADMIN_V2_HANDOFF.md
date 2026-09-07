# CODEX HANDOFF — CITA Admin V2

## 0. Working baseline

Repository: `desorden-ai/FLOW`

Production branch: `Cita`

Baseline commit: `1df8bc20e6b784850e7eb95a6d8cd4a89ebf21b8`

Work branch: `codex/cita-admin-responsive-import`

Cloudflare production deploy is connected to branch `Cita`. **Do not commit directly to `Cita`, do not merge, and do not deploy production from this task.** Work only on the work branch and leave it ready for review.

CITA is independent from LAB/SAT/DATE. Do not introduce Supabase, Firebase, React, Vite, a database, a desktop native shell, or another framework.

## 1. Current architecture — preserve

```text
Customer browser
  -> cita.desorden.cat
  -> Cloudflare Worker + Static Assets
       web/
       src/worker.js
  -> APPS_SCRIPT_URL
  -> Google Apps Script
  -> Google Sheet CITA
       cita
       FRANJAS
```

Admin route: `https://cita.desorden.cat/admin/`

Admin API: `POST /api/admin` authenticated by the existing bearer admin key.

Canonical client/service storage remains Google Sheet tab `cita`.

Public booking `/` and the existing public `/api` booking contract are **frozen**. Do not change customer booking behavior, token semantics, reservation locking, confirmed reservation preservation, Panasonic customer text, or personalized WhatsApp customer flow.

### 1.1 Narrow public-booking bugfix explicitly allowed

There is one confirmed presentation bug in the current public page: free times are sorted lexicographically in `web/app.js` by `${date}|${time}`. Because stored/displayed hours may be `9:00` instead of zero-padded `09:00`, the UI currently renders examples such as `10:00`, `11:00`, `12:00`, `9:00`.

Fix only this issue so dates remain ascending and times within each date are chronological by actual hour/minute, e.g. `9:00`, `10:00`, `11:00`, `12:00`. Do not alter slot availability, booking semantics, labels, Panasonic layout, customer text, tokens, WhatsApp flow, or backend reservation behavior.

Add a regression test if the existing test structure permits it cheaply. This is the only public-customer change authorized by this handoff.

## 2. Existing files that matter

Read these first; do not perform a repository-wide redesign audit.

- `web/admin/index.html`
- `web/admin/admin.css`
- `web/admin/clients.css`
- `web/admin/schedule.css`
- `web/admin/admin.js`
- `web/admin/whatsapp.js`
- `web/app.js` — only for the chronological-time bugfix in §1.1
- `src/worker.js`
- `apps-script/Admin.gs`
- `apps-script/Code.gs`
- `tests/admin.test.mjs`
- `tests/admin-source.test.mjs`
- `tests/api.test.mjs`
- `docs/GOOGLE_SHEETS.md`
- `docs/WEB_ADMIN.md`

Useful existing functions/contracts:

- browser: `callApi`, `renderBlocks`, `renderClients`, `openClientDialog`, `loadDashboard`
- Worker: `handleAdminApi`, `safeClientPayload`, `sanitizeAdminSnapshot`
- Apps Script: `adminSnapshot_`, `adminUpdateAvailability_`, `adminCreateClient_`, `adminUpdateClient_`, `adminArchiveClient_`, `adminNormalizeClientInput_`, `adminClientIdentityExists_`

Reuse those contracts. Avoid parallel client models.

## 3. Objective

Upgrade only the admin experience in two directions:

1. make `/admin/` a compact responsive mini-application with clearly different mobile and desktop layouts while remaining one codebase and one URL;
2. allow the administrator to import a new list of clients in bulk without manually editing Google Sheets.

Also apply the narrow chronological-time ordering fix defined in §1.1.

No product rewrite.

## 4. Responsive admin — required UX

### 4.1 General

Keep the current white / black / blue minimal visual language. Do not add decorative gradients, heavy shadows, animations, oversized cards, icons libraries, or a new design system.

The same DOM/data source should serve mobile and desktop. Do not create separate `/mobile` or `/desktop` apps.

Use CSS media queries and only small JS behavior where necessary.

### 4.2 Mobile target (< 900 px)

Goal: drastically reduce vertical scrolling compared with the current production screenshot.

Required behavior:

- top header is compact;
- `Actualizar`, `Cambiar contraseña`, `Salir` must not dominate the header;
- KPI summary remains visible but compact in a 2 x 2 layout;
- block cards remain collapsible;
- availability chips are compact;
- **clients are collapsed by default** inside each block;
- each collapsed client row shows only the useful summary:
  - client name;
  - state (`CONFIRMADO` / `PENDIENTE`);
  - one secondary line with address/city and optionally SA;
  - chevron or equivalent affordance;
- expanding a client reveals:
  - phone;
  - SAs;
  - confirmed date/time when present;
  - `Llamar`;
  - `WhatsApp`;
  - `Copiar enlace`;
  - `Editar`;
  - `Archivar` when allowed;
- confirmed clients retain the existing archive protection;
- existing actions must keep working exactly as now.

Do not render the five action buttons permanently for every client on mobile.

### 4.3 Desktop target (>= 900 px)

Use the width efficiently.

Inside each opened block, client presentation should become a compact table-like/grid view rather than large cards.

Suggested columns:

`Cliente | Población/Dirección | Teléfono | SA | Estado/Cita | Acciones`

Requirements:

- several clients visible without excessive scrolling;
- actions can remain visible but compact;
- current block availability and client list should be easy to scan together;
- preserve current confirmed appointments section;
- no horizontal page overflow at common widths 1280 / 1440 / 1920.

### 4.4 Existing functionality that must remain

- login;
- password change;
- refresh;
- KPIs;
- block summaries;
- schedule conflict warnings;
- availability editing;
- confirmed slot preservation;
- add one client;
- edit client;
- archive unconfirmed client;
- copy booking URL;
- telephone link;
- WhatsApp behavior from `whatsapp.js`;
- confirmed appointments.

## 5. New bulk import feature

### 5.1 UI entry point

Add a clear admin action labelled `Importar clientes` near the client-management area. It can be global or available within a block, but the resulting destination block must be unambiguous.

Open a modal/dialog consistent with the existing client/password dialogs.

### 5.2 Keep the import intentionally simple

Support these inputs in this task:

1. **paste table data** copied directly from Google Sheets / Excel (TSV is the priority);
2. upload a `.csv` file using native browser APIs.

Do **not** add an XLSX dependency. An Excel workbook can be copied/pasted or exported as CSV. This is intentional to keep CITA dependency-free and small.

No OCR and no AI extraction.

### 5.3 Accepted logical fields

Canonical import fields:

- `name` -> Sheet `CLIENTE` — required
- `phone` -> `TELEFONO` — optional
- `address` -> `DIRECCION` — required
- `city` -> `POBLACION` — required
- `sas` -> one or more `SA` values — optional
- `block` -> `BLOQUE` — optional when a destination block is selected in the UI

Header aliases should be normalized case-insensitively and ignoring accents/extra whitespace.

At minimum recognize:

- CLIENTE: `CLIENTE`, `NOMBRE`, `NOMBRE CLIENTE`
- TELEFONO: `TELEFONO`, `TELÉFONO`, `TELEF`, `TEL`, `MOVIL`, `MÓVIL`
- DIRECCION: `DIRECCION`, `DIRECCIÓN`, `CALLE`, `DOMICILIO`
- POBLACION: `POBLACION`, `POBLACIÓN`, `MUNICIPIO`, `LOCALIDAD`
- SA: `SA`, `SAS`, `AVISO`, `SERVICIO`, `ORDEN`
- BLOQUE: `BLOQUE`, `GRUPO`

Unknown columns must be ignored, not persisted into arbitrary Sheet columns.

### 5.4 Parsing and normalization

Before any write, build a preview.

Normalize:

- trim values;
- collapse repeated whitespace;
- preserve human-readable accents/casing in names and addresses;
- normalize phone only for comparison while preserving a sensible display value;
- allow multiple SAs in a cell separated by comma, semicolon or line break;
- deduplicate SAs within one client;
- never invent missing data.

A row is invalid when required `name`, `address`, or `city` is missing.

Do not silently import invalid rows.

### 5.5 Destination block

The dialog must allow selecting one existing block as a fallback destination.

If the imported table contains a recognized `BLOQUE` column, use that row value only when it refers to a known existing block; otherwise show that row as requiring review.

For this iteration, **do not invent arbitrary block IDs and do not auto-create new blocks**. Keep scope controlled. If a new block is needed later, it can be a separate task.

### 5.6 Preview

Before saving, show a concise preview with counts:

```text
12 filas detectadas
10 válidas
1 duplicada
1 necesita revisión
```

Each row should expose enough information to identify it and its classification.

Required classifications:

- `VALID`
- `DUPLICATE`
- `INVALID`

Import button must clearly indicate how many rows will actually be inserted.

If zero valid rows remain, disable import.

### 5.7 Duplicate rules

Do not create duplicate physical visits.

Server-side duplicate authority must remain based on the existing booking identity rule / `bookingUnitKey_` concept:

`CLIENTE + TELEFONO + DIRECCION + POBLACION` after existing normalization.

Also detect duplicates inside the incoming batch itself.

Frontend duplicate preview is helpful but **must not be the only protection**. Revalidate under the Apps Script lock at write time.

If a row duplicates an active existing visit, classify/return it as duplicate and skip it. Do not overwrite that existing visit.

Archived historical rows must follow the same semantics as current `adminClientIdentityExists_` (currently ignored as active duplicates).

### 5.8 Backend operation

Do not call `createClient` N times from the browser.

Add one batch action, suggested browser contract:

```json
{
  "action": "importClients",
  "clients": [
    {
      "name": "...",
      "phone": "...",
      "address": "...",
      "city": "...",
      "block": "BLK-...",
      "sas": ["SA-..."]
    }
  ]
}
```

Requirements:

- cap one request at a reasonable small limit, recommended 100 logical clients;
- Worker validates shape/lengths using the same limits as current client creation;
- Worker forwards one authenticated admin operation to Apps Script;
- Apps Script uses one ScriptLock for validation + append;
- read Sheet data once;
- validate known blocks;
- detect existing and intra-batch duplicates;
- append accepted rows in bulk with one or very few `setValues` calls;
- use one row per SA exactly like `adminCreateClient_`;
- if client has no SA, still append one row;
- set `ESTADO_CITA = PENDIENTE`;
- call `syncClientMetadata()` once after the batch append, not once per client;
- return import result counts plus a fresh admin snapshot or enough data for the UI to reload once.

Suggested result:

```json
{
  "ok": true,
  "import": {
    "received": 12,
    "created": 10,
    "duplicates": 1,
    "invalid": 1
  },
  "...snapshot": "existing sanitized snapshot fields"
}
```

Do not expose Sheet internals or admin secrets in responses.

### 5.9 Failure model

No partial unreported failure.

Expected row-level issues such as duplicate/invalid should be returned as structured results and skipped.

Unexpected technical failure during the locked write should fail the operation clearly. Do not pretend success.

## 6. Security / data integrity constraints

Non-negotiable:

- do not place admin key in localStorage; keep current sessionStorage behavior;
- do not expose `APPS_SCRIPT_URL` to the frontend;
- all admin writes pass through `/api/admin`;
- Apps Script revalidates admin key;
- preserve LockService for booking/schedule/client mutations;
- do not weaken token randomness;
- do not allow HTML injection from imported data; use `textContent`, never imported `innerHTML`;
- cap payload size/client count;
- do not add third-party JS from a CDN;
- do not store secrets in Git.

## 7. Files expected to change

Prefer a minimal diff.

Expected:

- `web/admin/index.html`
- `web/admin/admin.css`
- `web/admin/clients.css`
- `web/admin/admin.js`
- optionally one small `web/admin/import.css` or `web/admin/import.js` only if it reduces complexity
- `web/app.js` — only chronological slot ordering fix from §1.1
- `src/worker.js`
- `apps-script/Admin.gs`
- `tests/admin.test.mjs`
- `tests/admin-source.test.mjs`
- `docs/WEB_ADMIN.md`
- `docs/GOOGLE_SHEETS.md` only if import behavior needs documentation

Do not touch `web/index.html` or `web/styles.css` unless strictly necessary. No other public-customer change is authorized.

## 8. Tests / QA required

Run existing:

```bash
npm test
```

Add/adjust automated tests for at least:

1. admin snapshot still sanitizes correctly;
2. `importClients` rejects unauthenticated requests;
3. malformed import payload -> 400;
4. more than max batch -> 400;
5. valid batch is proxied with sanitized clients only;
6. duplicate / invalid result codes are handled without exposing upstream internals;
7. existing `createClient`, `updateClient`, `archiveClient`, `updateAvailability`, `changePassword` remain green;
8. public booking API tests remain green;
9. public slot ordering is chronological even when the source contains non-zero-padded times such as `9:00` alongside `10:00`, `11:00`, `12:00`.

Manual browser QA checklist:

- 390 x 844 mobile: no horizontal overflow;
- mobile clients collapsed by default;
- expand client -> every action works;
- 1440 px desktop: compact table/grid presentation;
- add single client still works;
- edit still works;
- archive protection for confirmed still works;
- paste TSV -> preview;
- CSV -> preview;
- invalid rows not imported;
- batch duplicate not imported;
- existing duplicate not imported;
- successful import -> one dashboard refresh and new clients visible;
- availability editor unchanged;
- customer public booking unchanged except chronological ordering of the displayed free hours;
- verify visual order `9:00`, `10:00`, `11:00`, `12:00` for a date containing those slots.

## 9. Definition of done

Task is done only when:

- implementation is complete on `codex/cita-admin-responsive-import`;
- `npm test` passes;
- no secret/config changes are required in Git;
- public booking code/contract is unchanged except the explicit chronological-time bugfix in §1.1;
- mobile admin is materially more compact;
- desktop admin uses available width efficiently;
- bulk paste/CSV import has preview + duplicate protection + single batch backend write;
- public free-hour display is chronological for padded and non-padded hour strings;
- docs mention the new admin import flow;
- Codex provides a short final report containing:
  - changed files;
  - tests executed/results;
  - any manual QA not executable in its environment;
  - commit SHA;
  - confirmation that it did **not** merge or deploy `Cita`.

## 10. Execution instruction to Codex

Do not begin with a broad architecture audit. Treat this document and the listed files as the source of truth.

Implement the smallest coherent solution satisfying the acceptance criteria. Reuse existing functions and CSS patterns. Avoid dependencies unless absolutely necessary; none are expected.

Do not ask for product decisions already defined here. Only stop for a genuine blocker involving inaccessible credentials/external deployment. Otherwise implement, test, commit to the work branch, and report.