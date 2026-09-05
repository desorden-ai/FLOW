# Estado del proyecto

## Implementado

- Repositorio: `desorden-ai/FLOW`.
- Rama de trabajo: `Cita`.
- Rama histórica preservada: `archive/pre-citas`.
- Aplicación independiente de LAB, SAT, DATE y otros proyectos.
- Frontend HTML/CSS/JS sin framework.
- Cloudflare Pages Function `/api` como proxy same-origin.
- Backend Google Apps Script.
- Fuente única de clientes: pestaña `cita` del Sheet `CITA`.
- 17 columnas originales preservadas.
- 8 columnas técnicas de reserva añadidas.
- Pestaña `FRANJAS` creada.
- Modelo 2 días × 4 horas por bloque.
- Tokens opacos aleatorios.
- Generación automática de `CLIENTE_ID`, `TOKEN` y `URL_CITA`.
- Reserva concurrente protegida con `LockService`.
- Prevención de doble reserva por cliente.
- Vista de cita ya confirmada al reabrir el enlace.
- Respuesta pública limitada a datos mínimos.
- WhatsApp mediante enlace, sin API de pago.
- QA automatizado del proxy y comprobación sintáctica de Apps Script.

## Estado del Google Sheet

El Sheet `CITA` está estructurado y actualmente no contiene clientes reales.

Pestañas:

- `cita`
- `FRANJAS`

No se han generado fixtures ni clientes ficticios en producción.

## Pendiente externo

- Copiar/desplegar `apps-script/Code.gs` en el proyecto Apps Script del Sheet.
- Obtener la URL `/exec`.
- Configurar `APPS_SCRIPT_URL` en Cloudflare.
- Configurar `WHATSAPP_TARGET` en Cloudflare.
- Conectar/desplegar Cloudflare Pages usando la rama `Cita` para validación.
- Asociar `cita.desorden.cat`.
- Ejecutar QA real con dos navegadores.
- Cargar los clientes correctos cuando estén disponibles.

## Fuera de V1

- Supabase/Firebase.
- Login de cliente.
- WhatsApp Business API.
- n8n, Make o Zapier.
- Panel administrativo propio.
- Aplicación móvil.
