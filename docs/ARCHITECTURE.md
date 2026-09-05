# Arquitectura

## Objetivo

DESORDEN CITA es una aplicación independiente para confirmar citas de mantenimiento con un flujo mínimo y de bajo coste.

## Componentes

```text
Navegador
  ↓
Cloudflare Worker
  ├─ Static Assets → web/index.html, web/app.js, web/styles.css
  └─ /api → src/worker.js
              ↓
         Google Apps Script
              ↓
         Google Sheet CITA
         ├─ cita
         └─ FRANJAS
```

## Routing Cloudflare

`wrangler.jsonc` configura `web/` como Static Assets y el binding `ASSETS`.

Solo `/api` y `/api/*` fuerzan la ejecución del Worker. El resto de recursos estáticos se sirve sin pasar por la lógica API.

## Flujo de disponibilidad

1. El cliente abre `/?c=TOKEN`.
2. `web/app.js` llama a `GET /api?action=availability&token=TOKEN`.
3. El Worker valida formato básico y reenvía la petición a Apps Script usando `APPS_SCRIPT_URL`.
4. Apps Script resuelve `token → cliente → bloque`.
5. Devuelve solo nombre, dirección, población, cita existente y franjas libres.
6. El Worker vuelve a sanear la respuesta antes de enviarla al navegador.

## Flujo de reserva

1. El navegador envía solo `action`, `token` y `slotId`.
2. El Worker elimina cualquier campo adicional enviado por el cliente.
3. Apps Script adquiere `LockService`.
4. Relee cliente y franja dentro del bloqueo.
5. Verifica bloque, estado y reserva previa.
6. Actualiza `FRANJAS` y `cita` como `CONFIRMADO`.

## Seguridad

- El navegador nunca decide `CLIENTE_ID` ni `BLOQUE`.
- Tokens largos y no secuenciales.
- `APPS_SCRIPT_URL` y `WHATSAPP_TARGET` son bindings de Cloudflare.
- No se exponen teléfono, SA, WO, Drive URLs ni campos administrativos.
- Respuestas API con `Cache-Control: no-store`.
- No se requieren cookies ni login en V1.
