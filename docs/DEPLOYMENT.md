# Despliegue

## 1. Google Sheets

Crear las pestañas y cabeceras indicadas en `GOOGLE_SHEETS.md`.

## 2. Apps Script

Desde el spreadsheet:

1. `Extensiones` → `Apps Script`.
2. Copiar el contenido de `apps-script/Code.gs`.
3. `Implementar` → `Nueva implementación`.
4. Tipo: `Aplicación web`.
5. Ejecutar como: propietario.
6. Permitir acceso público mediante enlace según las opciones disponibles en la cuenta.
7. Copiar la URL final terminada en `/exec`.

## 3. Cloudflare Pages

Crear un proyecto conectado a `desorden-ai/FLOW`.

Configuración:

- Rama de producción: `main`
- Framework preset: `None`
- Build command: vacío
- Build output directory: `web`

La carpeta `/functions` debe permanecer en la raíz del repositorio para que Cloudflare Pages genere la ruta server-side `/api`.

## 4. Variables de Cloudflare

En el proyecto Pages:

`Settings` → `Variables and Secrets` → `Add`

Crear:

### `APPS_SCRIPT_URL`

Valor: URL completa `/exec` del despliegue de Google Apps Script.

### `WHATSAPP_TARGET`

Valor: número de WhatsApp que recibirá las respuestas, en formato internacional y solo dígitos.

Ejemplo de formato, no de número real:

`34XXXXXXXXX`

No guardar estos valores directamente en `web/app.js`.

## 5. Dominio

Asignar:

`cita.desorden.cat`

## 6. QA mínimo obligatorio

1. Un cliente ve únicamente las franjas libres de su bloque.
2. Reserva una franja y queda `CONFIRMADO`.
3. Si vuelve a abrir su enlace, ve su cita ya confirmada y no puede reservar otra.
4. Otro cliente del mismo bloque deja de ver esa franja.
5. Un cliente de otro bloque mantiene sus propias opciones.
6. Dos navegadores intentan reservar simultáneamente la misma franja y solo uno obtiene confirmación.
7. «No puedo en ninguna de estas horas» abre WhatsApp con el número operativo y texto correctos.
8. Un token inexistente no expone ningún dato.
