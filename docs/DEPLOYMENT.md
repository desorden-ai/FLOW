# Despliegue — Cloudflare Workers

## 1. Backend Google Apps Script

El Apps Script está vinculado al spreadsheet `CITA` y debe desplegarse como Aplicación web.

La URL de producción debe terminar en `/exec`.

## 2. Worker conectado a GitHub

Repositorio:

`desorden-ai/FLOW`

Rama de producción:

`main`

El repositorio contiene `wrangler.jsonc`, por lo que Cloudflare Workers puede desplegar el Worker y los Static Assets como una sola unidad.

Configuración principal:

- Worker entrypoint: `src/worker.js`
- Static assets: `web/`
- API: `/api`

## 3. Variables y secretos

En el Worker, configurar para Production:

### `APPS_SCRIPT_URL`

URL completa del despliegue Apps Script terminada en `/exec`.

### `WHATSAPP_TARGET`

Número de WhatsApp destino con prefijo internacional y solo dígitos.

No guardar ninguno de estos valores en GitHub.

## 4. Build/Deploy

Con integración Git de Workers, el deploy debe ejecutar Wrangler contra la configuración del repositorio.

Comando equivalente:

```bash
npx wrangler deploy
```

No hay build de frontend: `web/` se publica directamente como Static Assets.

## 5. URL inicial

Primero validar sobre el subdominio `*.workers.dev` del proyecto.

Después se podrá asociar `cita.desorden.cat` como Custom Domain sin cambiar la aplicación.

## 6. QA de producción

1. `/` devuelve la web CITA.
2. `/api?action=availability&token=TOKEN_INVALIDO` devuelve JSON de error, no HTML.
3. Cliente válido ve únicamente sus franjas.
4. Una reserva cambia a `CONFIRMADO`.
5. La franja desaparece para otro cliente del mismo bloque.
6. Otro bloque permanece independiente.
7. Dos reservas simultáneas: solo una gana.
8. Reabrir el enlace muestra la cita ya confirmada.
9. WhatsApp usa `WHATSAPP_TARGET`.
