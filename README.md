# DESORDEN CITA

Aplicación web independiente para proponer y confirmar citas de mantenimiento con clientes.

## Alcance V1

- 2 días disponibles por bloque.
- 4 franjas por día.
- 8 opciones máximas por bloque.
- Cada cliente accede mediante un token aleatorio.
- Solo se muestran franjas libres de su bloque.
- Una única reserva confirmada por cliente.
- La reserva se valida de nuevo en backend y se bloquea con `LockService`.
- La confirmación se registra como `CONFIRMADO` con fecha/hora de confirmación.
- Si ninguna opción sirve, se abre WhatsApp con un mensaje preparado.

## Stack

- Frontend: HTML + CSS + JavaScript sin framework.
- Hosting: Cloudflare Pages.
- Proxy same-origin: Cloudflare Pages Functions (`/api`).
- Backend: Google Apps Script.
- Datos: Google Sheets.
- WhatsApp: enlace `wa.me`, sin API de pago.

## Estructura

```text
web/                  Web pública
functions/            Proxy API de Cloudflare Pages
apps-script/          Backend de Google Apps Script
docs/                 Arquitectura, Sheets y despliegue
```

## Independencia

Este proyecto no está enlazado a LAB, SAT, DATE ni a ningún otro proyecto de DESORDEN.

## Estado

Base V1 creada. Falta la configuración externa: spreadsheet definitivo, despliegue de Apps Script, variables de Cloudflare, proyecto Pages, dominio y QA real.
