# Arquitectura

## Objetivo

DESORDEN CITA es una aplicación independiente para ofrecer y confirmar citas de mantenimiento con un volumen pequeño de clientes, sin login, sin WhatsApp Business API y sin backend de pago.

## Componentes

```text
Cliente
  ↓
https://cita.desorden.cat/?c=TOKEN
  ↓
Cloudflare Pages
  ├─ web/                 HTML + CSS + JS
  └─ functions/api.js     proxy same-origin /api
                              ↓
                        Google Apps Script
                              ↓
                         Google Sheets CITA
                         ├─ cita
                         └─ FRANJAS
```

## Modelo de datos

### `cita`

Es la fuente única de clientes/servicios. Las 17 columnas originales se preservan. El sistema añade:

`CLIENTE_ID | BLOQUE | TOKEN | ESTADO_CITA | CITA_FECHA | CITA_HORA | CONFIRMADO_EN | URL_CITA`

No existe una tabla `CLIENTES` duplicada.

### `FRANJAS`

Una fila por hora propuesta:

`ID | BLOQUE | FECHA | HORA | ESTADO | CLIENTE_ID | CONFIRMADO_EN`

Cada bloque debe tener normalmente 8 filas activas: 2 fechas × 4 horas.

## Lectura de disponibilidad

1. El navegador envía únicamente el token a `/api`.
2. Pages Functions valida el formato y reenvía a Apps Script.
3. Apps Script resuelve `TOKEN → fila de cita → BLOQUE`.
4. Si `ESTADO_CITA=CONFIRMADO`, devuelve únicamente la cita ya reservada.
5. Si no existe cita, devuelve exclusivamente franjas `LIBRE` del bloque.
6. El proxy aplica además una lista blanca a la respuesta para evitar exponer campos administrativos por accidente.

## Reserva

1. Navegador envía `token + slotId`.
2. El proxy descarta cualquier bloque o identificador de cliente enviado por el navegador.
3. Apps Script adquiere `LockService.getScriptLock()`.
4. Dentro del bloqueo vuelve a leer cliente y franja.
5. Comprueba:
   - token válido;
   - cliente con bloque;
   - cliente sin reserva previa;
   - slot existente;
   - slot perteneciente al mismo bloque;
   - slot todavía `LIBRE`.
6. Escribe la reserva en `FRANJAS` y en la fila del cliente.
7. Ejecuta `SpreadsheetApp.flush()` antes de liberar el bloqueo.

Así, dos clientes que intenten reservar la misma hora simultáneamente no pueden obtener ambos `CONFIRMADO`.

## Privacidad

La respuesta pública contiene únicamente:

- nombre;
- dirección;
- población;
- fecha/hora de la cita, si existe;
- IDs opacos de las franjas disponibles;
- número operativo de WhatsApp configurado en Cloudflare.

No se devuelven teléfonos de clientes, URLs de Drive, PDFs, SA de otros clientes ni filas completas del Sheet.

## Configuración

Apps Script admite:

- `SPREADSHEET_ID`: opcional si el script no está vinculado directamente al Sheet.
- `PUBLIC_BASE_URL`: opcional; por defecto `https://cita.desorden.cat`.

Cloudflare Pages requiere:

- `APPS_SCRIPT_URL`
- `WHATSAPP_TARGET`
