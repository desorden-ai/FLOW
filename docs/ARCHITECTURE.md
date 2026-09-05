# Arquitectura

## Objetivo

Aplicación independiente para gestionar propuestas y confirmaciones de cita de mantenimiento sin depender de LAB, SAT, DATE ni otros sistemas.

## Componentes

```text
Cliente
  ↓
cita.desorden.cat
  ↓
Cloudflare Pages
  ├─ web/       frontend estático
  └─ /api       Pages Function same-origin
                  ↓
            Google Apps Script
                  ↓
             Google Sheets
```

## Flujo

1. El administrador mantiene clientes y franjas en Google Sheets.
2. Cada cliente recibe `https://cita.desorden.cat/?c=TOKEN_ALEATORIO`.
3. La web consulta `/api?action=availability&token=...`.
4. La Pages Function reenvía la consulta a Apps Script sin exponer su URL al frontend.
5. Apps Script resuelve `token → cliente → bloque` y devuelve únicamente franjas `LIBRE` de ese bloque.
6. Para reservar, la web envía `POST /api`.
7. Apps Script adquiere `LockService`, comprueba si el cliente ya tiene cita, vuelve a validar la franja y solo entonces escribe `CONFIRMADO`.
8. Los clientes de otros bloques mantienen disponibilidad independiente.
9. Si ninguna opción encaja, la web abre WhatsApp contra el número configurado en `WHATSAPP_TARGET`.

## Reglas de integridad V1

- Un token identifica a un único cliente.
- Un cliente solo puede tener una cita `CONFIRMADO` dentro de su bloque.
- Una franja confirmada no puede asignarse a otro cliente.
- El backend nunca confía en un bloque enviado por el navegador.
- La asignación se revalida dentro del bloqueo de servidor.
- Las consultas de disponibilidad no se cachean.

## Seguridad V1

- Tokens largos, aleatorios y no secuenciales.
- No exponer identificadores internos como mecanismo de autenticación.
- No guardar secretos en GitHub.
- `APPS_SCRIPT_URL` y `WHATSAPP_TARGET` se configuran en Cloudflare.
- El frontend no recibe el teléfono del cliente.
- La UI inserta los datos de cliente como texto, no como HTML ejecutable.
