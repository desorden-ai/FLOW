# DESORDEN CITA

Aplicación web independiente para proponer y confirmar citas de mantenimiento mediante Google Sheets + Apps Script + Cloudflare Pages.

## Estado V1

La rama activa de desarrollo es `Cita`. No depende de LAB, SAT, DATE ni de otros proyectos.

Implementado:

- Web pública mobile-first en HTML/CSS/JavaScript.
- Enlace individual `https://cita.desorden.cat/?c=TOKEN`.
- Token aleatorio no secuencial.
- Fuente de clientes: pestaña `cita` del Google Sheet `CITA`.
- Se conservan las 17 columnas originales y se añaden 8 campos de reserva.
- Pestaña auxiliar `FRANJAS` para bloques y disponibilidad.
- Modelo operativo: 2 días × 4 horas = 8 franjas por bloque.
- Reserva atómica con `LockService`.
- Una única cita confirmada por cliente.
- Reapertura del enlace muestra la cita ya confirmada.
- Proxy same-origin `/api` mediante Cloudflare Pages Functions.
- WhatsApp por enlace `wa.me`, sin API de pago.
- Tests sin dependencias externas con `node --test`.

## Estructura

```text
web/                    frontend público
functions/api.js        proxy de Cloudflare Pages
apps-script/Code.gs     backend y utilidades administrativas
tests/                  QA automatizado del proxy/sintaxis
docs/                   arquitectura, Sheet, despliegue y QA
```

## Flujo administrativo mínimo

1. Añadir el cliente/servicio en una nueva fila de `cita` usando las columnas originales.
2. Asignar un valor en `BLOQUE`.
3. Ejecutar `syncClientMetadata()` en Apps Script para generar `CLIENTE_ID`, `TOKEN` y `URL_CITA`.
4. Crear las 8 franjas del bloque con `createBlockSlots(...)` o cargarlas manualmente en `FRANJAS`.
5. Enviar al cliente el valor de `URL_CITA`.

## Test local

No hay dependencias npm.

```bash
npm test
```

## Documentación

- `docs/ARCHITECTURE.md`
- `docs/GOOGLE_SHEETS.md`
- `docs/DEPLOYMENT.md`
- `docs/QA.md`
- `docs/PROJECT_STATUS.md`
