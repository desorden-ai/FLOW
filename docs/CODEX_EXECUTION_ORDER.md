# CODEX EXECUTION ORDER — CITA

Work only on branch `codex/cita-admin-responsive-import`.

Do not merge or deploy `Cita`.

Read exactly these documents first, in this order:

1. `docs/CODEX_PRIVACY_SECURITY_V1.md`
2. `docs/CODEX_ADMIN_V2_HANDOFF.md`

Implement them as one coherent change set.

## Conflict rule

`CODEX_PRIVACY_SECURITY_V1.md` is newer and overrides any conflicting statement in `CODEX_ADMIN_V2_HANDOFF.md` about public booking files being frozen or the chronological-time fix being the only allowed public change.

All responsive-admin, bulk-import, data-integrity, test and no-deploy requirements from `CODEX_ADMIN_V2_HANDOFF.md` remain active.

## Execution economy

Do not perform a repository-wide audit.

Start from the files named in those two documents. Reuse current plain HTML/CSS/JS, Worker and Apps Script contracts. Add no framework and no dependency unless a genuine blocker proves one necessary; none is expected.

Prioritize implementation in this order:

1. public API minimization + POST token transport;
2. token bootstrap/scrubbing + fragment links + backward compatibility;
3. public minimal UX / confirmation / fallback WhatsApp;
4. admin WhatsApp exact identity resolution + first-name message;
5. token regeneration;
6. security headers/static wrapping;
7. responsive admin;
8. bulk import;
9. tests + docs.

Run `npm test` after coherent milestones, not after every small edit.

Commit completed work to the work branch and report only:

1. commit SHA;
2. changed files;
3. tests and results;
4. manual QA still required;
5. any genuine external blocker/asset issue;
6. confirmation that no merge/deploy to `Cita` occurred.
