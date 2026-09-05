# Despliegue

## 1. Google Sheets
Crear las pestañas y cabeceras indicadas en `GOOGLE_SHEETS.md`.

## 2. Apps Script
Desde el spreadsheet: Extensiones → Apps Script. Copiar `apps-script/Code.gs` y desplegar como Aplicación web.

Configuración prevista:
- Ejecutar como: propietario.
- Acceso: cualquier usuario con el enlace, según las opciones disponibles en la cuenta.

Copiar la URL final `/exec`.

## 3. Frontend
En `web/app.js`, sustituir:

`REPLACE_WITH_GOOGLE_APPS_SCRIPT_WEB_APP_URL`

por la URL `/exec` del despliegue.

## 4. Cloudflare Pages
Crear un proyecto conectado a `desorden-ai/FLOW`.

- Rama de producción: `main`
- Framework preset: None
- Build command: vacío
- Build output directory: `web`

Después asignar el dominio `cita.desorden.cat`.

## 5. QA mínimo
1. Un cliente ve las franjas de su bloque.
2. Reserva una franja y queda `CONFIRMADO`.
3. Otro cliente del mismo bloque deja de verla.
4. Otro bloque no se ve afectado.
5. Dos navegadores intentan reservar la misma franja y solo uno gana.
6. «No puedo…» abre WhatsApp con destinatario y texto correctos.
