# Estado del proyecto

## Implementado

- Repositorio: `desorden-ai/FLOW`.
- Rama de trabajo/despliegue: `Cita`.
- Frontend HTML/CSS/JS sin framework.
- Cloudflare Workers + Static Assets.
- Worker API en `src/worker.js`.
- Static assets en `web/`.
- Google Apps Script como backend de reservas.
- Google Sheet `CITA` con pestañas `cita` y `FRANJAS`.
- Tokens opacos por cliente.
- Bloques independientes.
- 2 días × 4 franjas.
- `LockService` para reserva concurrente.
- Prevención de doble reserva.
- Sanitización de respuestas en el Worker.
- WhatsApp sin API de pago.

## Configuración externa

- Apps Script desplegado mediante URL `/exec`.
- Cloudflare Worker conectado al repositorio.
- Variables requeridas: `APPS_SCRIPT_URL` y `WHATSAPP_TARGET`.

## Pendiente

- Confirmar que Cloudflare Workers Builds despliega la rama `Cita` con `wrangler.jsonc`.
- Probar el subdominio `workers.dev` real.
- Cargar clientes reales.
- Crear bloques y franjas reales.
- Ejecutar QA concurrente real.
- Asociar posteriormente `cita.desorden.cat`.

## Fuera de V1

- Pages Functions.
- Supabase/Firebase.
- Login de cliente.
- WhatsApp Business API.
- n8n/Make/Zapier.
- Dashboard administrativo propio.
