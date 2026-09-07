# CODEX EXECUTION ORDER — CITA

Work only on branch `codex/cita-admin-responsive-import`.

Do not merge or deploy `Cita`.

Read exactly these documents first, in this order:

1. `docs/CODEX_PUBLIC_UX_FINAL.md`
2. `docs/CODEX_PRIVACY_SECURITY_V1.md`
3. `docs/CODEX_ADMIN_CANCEL_BOOKING.md`
4. `docs/CODEX_ADMIN_V2_HANDOFF.md`

Implement them as one coherent change set.

## Conflict rule

Precedence is:

1. `CODEX_PUBLIC_UX_FINAL.md` for visible public UX, branding hierarchy, languages, copy and dark/minimal styling;
2. `CODEX_PRIVACY_SECURITY_V1.md` for privacy, token handling, public API minimization, admin WhatsApp hardening, token regeneration, headers and logging;
3. `CODEX_ADMIN_CANCEL_BOOKING.md` for the admin-only confirmed-booking cancellation transaction and exact slot release semantics;
4. `CODEX_ADMIN_V2_HANDOFF.md` for responsive admin, bulk import, existing admin behavior and related tests.

Therefore:

- any older instruction to show an Ángel Molero / blue-M identity block in the public header is superseded;
- the public header now shows Panasonic only, plus the small `CA · ES` selector and booking subtitle;
- company/service/legal identity belongs only in the footer;
- Catalan is the default public language, Spanish is selectable;
- the dark minimal public visual direction in `CODEX_PUBLIC_UX_FINAL.md` is final;
- all privacy/security requirements remain mandatory unless the final UX document explicitly changes only presentation/copy;
- a confirmed appointment may now be cancelled only from the private admin through the server-side `cancelBooking` flow; its exact owned slot returns to `LIBRE`, while client/block/token/URL/SAs are preserved so the same personal link can book again;
- confirmed clients still cannot be archived or moved directly: cancellation must occur first;
- all responsive-admin, bulk-import, data-integrity, test and no-deploy requirements remain active.

## Execution economy

Do not perform a repository-wide audit.

Start from the files named in the four documents. Reuse current plain HTML/CSS/JS, Worker and Apps Script contracts. Add no framework and no dependency unless a genuine blocker proves one necessary; none is expected.

Prioritize implementation in this order:

1. public API minimization + POST token transport;
2. token bootstrap/scrubbing + fragment links + backward compatibility;
3. final public dark/minimal UX + CA/ES localization + chronological time order;
4. public confirmation + PII-free localized fallback WhatsApp;
5. admin WhatsApp exact identity resolution + first-name message;
6. token regeneration;
7. admin confirmed-booking cancellation + exact slot release;
8. security headers/static wrapping;
9. responsive admin;
10. bulk import;
11. tests + docs.

Run `npm test` after coherent milestones, not after every small edit.

Commit completed work to the work branch and report only:

1. commit SHA;
2. changed files;
3. tests and results;
4. manual QA still required;
5. any genuine external blocker/asset issue;
6. confirmation that no merge/deploy to `Cita` occurred.
