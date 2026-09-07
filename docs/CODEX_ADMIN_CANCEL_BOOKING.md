# CODEX AMENDMENT — Admin booking cancellation

## Authority and scope

This amendment is mandatory for the current CITA work branch and complements:

- `docs/CODEX_PUBLIC_UX_FINAL.md`
- `docs/CODEX_PRIVACY_SECURITY_V1.md`
- `docs/CODEX_ADMIN_V2_HANDOFF.md`

Repository: `desorden-ai/FLOW`

Work branch: `codex/cita-admin-responsive-import`

Do not merge or deploy `Cita` from this task.

## Problem

The private dashboard currently protects confirmed clients from archive/move operations, but it has no explicit way to cancel an already confirmed appointment.

The administrator must be able to cancel a confirmed booking and immediately return its exact slot to availability.

This is an ADMIN-ONLY operation. Do not add public self-cancellation in this iteration.

## Required UX

For a client/physical visit whose status is `CONFIRMADO`, expose a compact action:

`Cancelar cita`

The action should be available from the confirmed client's expanded/admin action area and may also be exposed in the confirmed-appointments section if this can be done without duplicating logic.

Before executing, require an explicit confirmation dialog with the essential consequence, for example:

`¿Cancelar la cita de Marta del 10/09/2026 a las 10:30? La hora volverá a quedar libre y el cliente podrá reservar de nuevo con su mismo enlace.`

Do not show this action for `PENDIENTE` clients.

After success:

- show a concise success status;
- refresh/apply the returned dashboard snapshot once;
- the client must display as `PENDIENTE`;
- the released date/time must display as `LIBRE`;
- KPI counts must update consistently.

## Browser/admin API contract

Add one authenticated admin action:

```json
{
  "action": "cancelBooking",
  "clientId": "CLI-..."
}
```

The browser supplies only `clientId`.

The browser MUST NOT supply or decide:

- block;
- date;
- time;
- slot id;
- token;
- booking status.

All of those values are derived and revalidated server-side from canonical Sheet state.

## Server-side semantics

Implement the cancellation under the same `LockService.getScriptLock()` used to protect booking/schedule mutations.

Inside the lock:

1. validate admin authentication;
2. validate `clientId` shape;
3. read canonical client rows and slot rows;
4. resolve the complete physical booking unit by `CLIENTE_ID`;
5. require that the unit is currently `CONFIRMADO`;
6. derive the canonical `BLOQUE`, `CITA_FECHA` and `CITA_HORA` from that booking unit;
7. verify all rows belonging to the physical visit are internally consistent;
8. locate exactly one `FRANJAS` row that matches the confirmed booking AND is assigned to the same `CLIENTE_ID`;
9. require that this slot is currently `CONFIRMADO`;
10. only then perform the mutation.

Never free a slot by date/time alone. The slot must belong to the exact `CLIENTE_ID` being cancelled.

If the booking/slot relationship is missing, ambiguous or inconsistent, fail without mutating either sheet.

Suggested safe error codes:

- `CLIENT_NOT_FOUND`
- `BOOKING_NOT_CONFIRMED`
- `BOOKING_INCONSISTENT`

Do not leak Sheet row numbers or internal payloads to the frontend.

## Atomic state transition

For the exact confirmed slot in `FRANJAS`:

- `ESTADO`: `CONFIRMADO` -> `LIBRE`
- clear `CLIENTE_ID`
- clear `CONFIRMADO_EN`

For every active Sheet row of the same physical visit / `CLIENTE_ID`:

- `ESTADO_CITA`: `CONFIRMADO` -> `PENDIENTE`
- clear `CITA_FECHA`
- clear `CITA_HORA`
- clear `CONFIRMADO_EN`

Preserve unchanged:

- `CLIENTE_ID`
- `BLOQUE`
- `TOKEN`
- `URL_CITA`
- client identity/contact/address data
- all SA rows
- all other service data

A physical visit containing multiple SAs is cancelled as one booking unit. Never cancel only one SA row.

## Rebooking behavior

Do NOT regenerate the token automatically.

The existing personal booking URL remains valid. After cancellation, opening the same link must show the currently available slots for that client's existing block, including the newly released slot if it remains part of the published schedule.

Token regeneration remains a separate explicit admin action for credential revocation/security incidents.

## Concurrency / integrity

Cancellation must use the same script-level lock as booking so these cases cannot race:

- client attempts to book while admin cancels;
- admin edits availability while cancelling;
- another admin mutation touches the same booking.

The operation must be all-or-nothing from the application's perspective. Do not report success if the slot and booking-unit state were not both updated coherently.

## Availability editor interaction

A cancelled slot becomes a normal `LIBRE` slot.

Therefore:

- it immediately becomes selectable again by eligible pending clients in the same block;
- it is no longer protected as a confirmed slot by the availability editor;
- a later explicit availability edit may remove it normally.

## Historical data

Do not delete the client or any SA rows. Cancellation is a booking-state transition, not an archive/delete operation.

For this iteration, do not add a new database or complex event/audit subsystem solely for cancellation. Preserve the existing client/service history and identifiers; current booking date/time fields represent current booking state.

## Worker

Extend `/api/admin` with `cancelBooking`:

- authenticate exactly as existing admin actions;
- validate only `clientId` from the browser;
- forward one authenticated Apps Script admin operation;
- sanitize the response through the existing admin snapshot contract;
- map expected safe errors without exposing upstream internals.

No public API change is required for cancellation itself.

## Tests

Add automated coverage for at least:

1. unauthenticated `cancelBooking` -> 401;
2. malformed/missing `clientId` -> 400;
3. valid request proxies only `clientId` plus server admin credentials;
4. pending/non-confirmed client cannot be cancelled;
5. unknown client cannot be cancelled;
6. inconsistent or non-owned slot is never released;
7. confirmed cancellation changes all rows in the physical visit to `PENDIENTE`;
8. exact confirmed slot becomes `LIBRE` and clears its client assignment;
9. `TOKEN`, `URL_CITA`, `BLOQUE` and SAs are preserved;
10. dashboard snapshot after cancellation reports the coherent KPI/client/slot state;
11. existing booking, availability, archive, edit, token regeneration and import tests remain green.

Run `npm test`.

## Definition of done

Done means a confirmed appointment can be safely cancelled from `/admin/`, its exact slot immediately returns to `LIBRE`, the same booking link can be used to reserve again, multiple SAs remain one physical visit, and no merge/deploy has occurred.