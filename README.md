# DESORDEN CITA

Aplicación web independiente para proponer y confirmar citas de mantenimiento con clientes.

## Alcance V1

- 2 días disponibles por bloque.
- 4 franjas por día.
- 8 opciones máximas por bloque.
- Cada cliente accede mediante un token aleatorio.
- Solo se muestran franjas libres de su bloque.
- La reserva se valida de nuevo en backend y se bloquea con `LockService`.
- La confirmación se registra como `CONFIRMADO` con fecha/hora de confirmación.
- Si ninguna opción sirve, se abre WhatsApp con un mensaje preparado.

## Stack

- Frontend: HTML + CSS + JavaScript sin framework.
- Hosting: Cloudflare Pages.
- Backend: Google Apps Script.
- Datos: Google Sheets.
- WhatsApp: enlace `wa.me`, sin API de pago.

## Estructura

```text
web/                 Web pública
a​pps-script/         Backend de Google Apps Script
docs/                Arquitectura, Sheets y despliegue
```

> Nota: la carpeta real es `apps-script/`; la separación visual anterior evita que algunos renderizadores conviertan el nombre automáticamente.

## Estado

Base V1 creada. Antes de producción hay que crear la hoja de Google Sheets, desplegar `apps-script/Code.gs` como Web App, introducir su URL en `web/app.js` y conectar `web/` a Cloudflare Pages.
