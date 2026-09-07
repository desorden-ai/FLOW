# CODEX PUBLIC UX FINAL — DESORDEN CITA

## Authority

This document is the **final authority for the visible public booking experience** at `https://cita.desorden.cat/`.

It overrides any conflicting public-UI, branding, language or copy instruction in:

- `docs/CODEX_PRIVACY_SECURITY_V1.md`
- `docs/CODEX_ADMIN_V2_HANDOFF.md`

Those documents remain authoritative for privacy/security, backend invariants, responsive admin, bulk import, tests and no-deploy rules.

Repository: `desorden-ai/FLOW`

Work branch: `codex/cita-admin-responsive-import`

Do not merge or deploy `Cita` from this task.

---

## 1. Product direction

The public booking page must feel like a very small, premium, quiet scheduling surface.

Visual target:

- dark / near-black background;
- minimal elements;
- strong typographic hierarchy;
- generous spacing;
- thin subtle borders;
- restrained contrast;
- no decorative noise;
- no heavy shadows;
- no gradients unless effectively imperceptible;
- no glassmorphism;
- no animation beyond tiny native interaction feedback;
- no icon library;
- no external fonts;
- no third-party scripts or assets.

Use existing plain HTML/CSS/JS only.

The attached visual reference is a direction for density, darkness and restraint, not a pixel-perfect template.

---

## 2. Branding hierarchy

### Header

Show only:

1. small language selector in the top-right;
2. `Panasonic` as the sole visible brand in the main header;
3. the booking subtitle.

Do **not** show in the main header:

- DESORDEN logo;
- Ángel Molero logo;
- blue M logo;
- `Instalaciones Ángel Molero`;
- company legal name;
- address;
- CIF;
- SAT badge;
- long service-authorisation line.

The public header must remain deliberately sparse.

### Footer

Move the company/service identity to the bottom and keep it visually secondary.

Catalan:

```text
Servei Tècnic Autoritzat Panasonic

Avís legal · Privacitat
Fontaneria Ángel Molero e Hijos S.L.
```

Spanish:

```text
Servicio Técnico Autorizado Panasonic

Aviso legal · Privacidad
Fontanería Ángel Molero e Hijos S.L.
```

Do not place CIF, fiscal address or Registro Mercantil data on the booking screen. Legal pages may contain the full required identity.

---

## 3. Language behavior

### Default

Default public language: **Catalan (`ca`)**.

### Selector

Place a very small text selector in the top-right:

```text
CA · ES
```

Rules:

- no flags;
- no select/dropdown unless accessibility forces it;
- no bordered pills;
- active language has slightly stronger contrast/weight;
- inactive language remains readable but subdued;
- switching language must be instant and must not reload or expose the booking token.

It is acceptable to store only the non-sensitive language preference (`ca` / `es`) in `localStorage` under a dedicated key. Booking tokens remain `sessionStorage` only.

Use native `Intl.DateTimeFormat` with `ca-ES` or `es-ES` for visible dates.

All user-visible public strings, including errors, loading, empty state, confirmation and fallback action, must exist in both languages. Do not leave mixed Catalan/Spanish screens.

---

## 4. Exact public copy

### Catalan (default)

Header:

```text
Panasonic
Confirma la data del teu manteniment
```

Client section:

```text
Hola, Marta
Selecciona una data i hora disponibles.
```

Fallback:

```text
No puc en cap d'aquestes hores
```

Confirmation:

```text
Cita confirmada
Dijous, 10 de setembre · 10:30
El manteniment ha quedat reservat.
```

Empty availability:

```text
No queden hores disponibles
Pots contactar-nos per buscar una altra data.
```

### Spanish

Header:

```text
Panasonic
Confirma la fecha de tu mantenimiento
```

Client section:

```text
Hola, Marta
Selecciona una fecha y hora disponibles.
```

Fallback:

```text
No puedo en ninguna de estas horas
```

Confirmation:

```text
Cita confirmada
Jueves, 10 de septiembre · 10:30
Su mantenimiento ha quedado reservado.
```

Empty availability:

```text
No quedan horas disponibles
Puede contactarnos para buscar otra fecha.
```

Do not show public address/city underneath the greeting or after confirmation.

---

## 5. Public information boundary

Visible/public data is limited to:

- Panasonic identity;
- first name only;
- available dates;
- available times;
- final booking date/time/status;
- generic fallback action;
- minimal footer service/legal identity.

Never show in the public UI:

- surname(s);
- full name;
- phone;
- address;
- city;
- SA;
- model;
- block;
- clientId;
- token;
- bookingUrl;
- internal notes;
- technical data;
- other clients' information.

The API minimization and token rules in `CODEX_PRIVACY_SECURITY_V1.md` remain mandatory.

---

## 6. Layout

### Main shell

- mobile-first;
- one centered column;
- near-black page background;
- inner content max-width around 680–760 px on desktop;
- comfortable but not oversized padding;
- no unnecessary nested cards.

### Header

- language selector aligned top-right;
- Panasonic prominent but not oversized;
- subtitle below with lower contrast;
- one subtle divider is acceptable.

### Greeting

- first-name heading with clear hierarchy;
- one short instruction line;
- no identity/address metadata beneath it.

### Date groups

Each date may be one restrained dark card containing:

- date heading;
- time grid.

Avoid icons unless they materially improve comprehension. If used, use tiny local inline/native SVG only and keep them secondary. No icon package.

### Time buttons

- rectangular/slightly rounded;
- dark surface;
- thin subdued border;
- light text;
- minimum comfortable touch target;
- 2 columns on narrow phones when needed;
- expand to 4 columns where width permits;
- no horizontal overflow.

Hover/focus/active state must be obvious but restrained.

Do not create a permanent client-side selected state that implies booking has succeeded before the server confirms it. During request, show a simple disabled/confirming state. The authoritative selected/confirmed state is server response.

Hours must be chronological by actual hour/minute, including non-zero-padded sources (`9:00` before `10:00`).

### Fallback action

`No puc...` / `No puedo...` should appear as one full-width restrained action/card after the date groups.

It should be easy to find without competing visually with time slots.

### Confirmation state

Extremely simple. Show only:

- confirmation title;
- confirmed date/time;
- one confirmation sentence.

No address or additional personal/service data.

### Footer

Separated by generous whitespace or one subtle divider. Small typography and low visual priority.

---

## 7. Visual tokens

Use CSS custom properties and keep the palette restrained. Approximate direction (exact values may be tuned for WCAG contrast):

```css
--bg: #08090b;
--surface: #0f1115;
--surface-2: #14171c;
--border: #2a2f37;
--text: #f4f5f7;
--muted: #9aa3b2;
--accent: #dfe7f7;
--focus: #8aa8e8;
```

Do not use saturated brand blue as a large surface/background. Panasonic remains typographic/white in the header.

Use system font stack only.

Border radii: moderate, consistent, not bubbly.

Shadows: none or extremely soft.

---

## 8. Responsive acceptance

### Mobile QA target

At `390 x 844`:

- no horizontal overflow;
- `CA · ES` remains accessible without crowding Panasonic;
- greeting and instruction fit naturally;
- time controls have comfortable tap targets;
- content does not feel oversized;
- footer remains readable;
- minimal vertical dead space before the booking controls.

### Desktop QA target

At 1280–1440 px:

- same one-column product, not a separate desktop application;
- centered content;
- more breathing room only;
- no giant stretched cards;
- no unnecessary sidebar.

---

## 9. Fallback WhatsApp language

The public fallback message should follow the currently selected public language while remaining generic and PII-free.

Catalan example:

```text
Bon dia.

No puc en cap de les hores proposades per al manteniment Panasonic. Podem buscar una altra data?
```

Spanish example:

```text
Buenos días.

No puedo en ninguna de las horas propuestas para el mantenimiento Panasonic. ¿Podemos buscar otra fecha?
```

Use Europe/Madrid for morning/afternoon greeting. Do not include first name, address, SA, block, token or booking URL in this fallback message.

Admin-initiated personalized WhatsApp remains governed by `CODEX_PRIVACY_SECURITY_V1.md`.

---

## 10. Legal links

Footer must contain direct links for legal notice and privacy.

Do not invent legal identity text or copy stale fiscal/address data into the booking page.

If the exact final legal URL cannot be safely established from existing project configuration/docs, preserve a clearly documented external-QA item rather than fabricating it.

Links must not leak booking tokens through referrers; the security policy must keep `Referrer-Policy: no-referrer`.

---

## 11. Files expected for this public visual/localization delta

Prefer minimal changes:

- `web/index.html`
- `web/styles.css`
- `web/app.js`
- tests covering translation/date rendering/token flow where practical

Backend/Worker/Apps Script changes are only those already required by `CODEX_PRIVACY_SECURITY_V1.md`.

Do not add a translation library. A small local dictionary/object is sufficient.

---

## 12. Definition of done for public UX

Public UX is complete only when:

- Catalan is the default language;
- `CA · ES` switches all visible public copy;
- language selection never alters/exposes the token;
- only Panasonic appears as the main header brand;
- no Ángel Molero/DESORDEN logo appears in the main header;
- company/service/legal identity appears only in the footer;
- dark minimal visual system is applied;
- first name only is visible;
- no address/city appears publicly;
- chronological slot ordering is correct;
- confirmation remains minimal;
- public fallback is localized and PII-free;
- mobile 390 px has no horizontal overflow;
- existing privacy/security and booking invariants remain green;
- no merge/deploy to `Cita` occurs from this task.
