# Estado del proyecto

## Confirmado

- Repositorio canónico: `desorden-ai/FLOW`.
- `main` contiene únicamente DESORDEN CITA.
- Estado anterior preservado en `archive/pre-citas`.
- Aplicación nueva e independiente.
- Frontend HTML/CSS/JS sin framework.
- Cloudflare Pages Functions como proxy `/api`.
- Backend Google Apps Script.
- Persistencia Google Sheets.
- WhatsApp mediante enlace, sin API de pago.
- Modelo: 2 días × 4 franjas por bloque.
- Bloqueo concurrente con `LockService`.
- Prevención de doble reserva por cliente.

## Pendiente de configuración externa

- Crear/seleccionar spreadsheet definitivo.
- Desplegar Apps Script y obtener URL `/exec`.
- Configurar `APPS_SCRIPT_URL` en Cloudflare.
- Configurar `WHATSAPP_TARGET` en Cloudflare.
- Conectar Cloudflare Pages a `main` con output `web`.
- Configurar `cita.desorden.cat`.
- Ejecutar QA real con clientes y dos navegadores concurrentes.

## No forma parte de V1

- LAB / SAT / DATE.
- Supabase o Firebase.
- Login de cliente.
- WhatsApp Business API.
- n8n, Make o Zapier.
- Panel administrativo propio.
