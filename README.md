# DESORDEN CITA

Aplicación web independiente para proponer y confirmar citas de mantenimiento con clientes.

## Arquitectura V1

```text
Cliente
  ↓
Cloudflare Worker (Workers + Static Assets)
  ├─ web/              HTML/CSS/JS estático
  └─ /api              proxy seguro
        ↓
Google Apps Script
        ↓
Google Sheet CITA
  ├─ cita
  └─ FRANJAS
```

## Alcance

- 2 días por bloque.
- 4 franjas por día.
- 8 opciones por bloque.
- URL individual mediante token opaco.
- Una única cita confirmada por cliente.
- Reserva atómica con `LockService` en Apps Script.
- WhatsApp como alternativa cuando ninguna hora encaja.

## Cloudflare Workers

El repositorio se despliega como un único Worker con Static Assets.

- `src/worker.js`: lógica `/api`.
- `web/`: assets públicos.
- `wrangler.jsonc`: configuración del Worker y routing.
- `APPS_SCRIPT_URL`: variable/secreto con la URL `/exec` de Apps Script.
- `WHATSAPP_TARGET`: teléfono destino de WhatsApp en formato internacional, solo dígitos.

Las peticiones a `/api` ejecutan el Worker. Los demás recursos se sirven directamente desde `web/` como Static Assets.

## Desarrollo

```bash
npm test
npm run dev
```

Despliegue manual alternativo:

```bash
npm run deploy
```

En producción se usa la integración Git de Cloudflare Workers con la rama canónica `main`.

## Independencia

CITA no depende de LAB, SAT, DATE, MO ni de otros proyectos.
