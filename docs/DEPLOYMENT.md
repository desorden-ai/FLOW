# Despliegue

## 1. Google Sheet

El spreadsheet `CITA` ya debe contener:

- pestaña `cita` con las 17 columnas originales + 8 columnas técnicas de cita;
- pestaña `FRANJAS` con sus 7 columnas.

El código también incluye `setupCitaV1()`, que es idempotente y puede ejecutarse como comprobación.

## 2. Google Apps Script

Desde el Sheet `CITA`:

1. `Extensiones` → `Apps Script`.
2. Sustituir el contenido por `apps-script/Code.gs`.
3. Ejecutar una vez `setupCitaV1()` y autorizar permisos.
4. Ejecutar `syncClientMetadata()` cuando existan clientes.
5. `Implementar` → `Nueva implementación`.
6. Tipo: `Aplicación web`.
7. Ejecutar como: propietario.
8. Permitir acceso mediante enlace según las opciones de la cuenta.
9. Copiar la URL final terminada en `/exec`.

### Propiedades opcionales de Apps Script

En `Configuración del proyecto` → `Propiedades de la secuencia de comandos`:

- `SPREADSHEET_ID`: usar el ID del Sheet si el script no queda vinculado directamente al spreadsheet.
- `PUBLIC_BASE_URL`: por defecto ya se usa `https://cita.desorden.cat`.

## 3. Cloudflare Pages

Crear/conectar el proyecto con `desorden-ai/FLOW`.

Para validar la rama actual:

- rama: `Cita`;
- framework preset: `None`;
- build command: vacío;
- build output directory: `web`.

La carpeta `/functions` debe quedar en la raíz del repositorio. Cloudflare la transforma en la ruta server-side `/api`.

Cuando la V1 quede aprobada, la rama de producción puede pasar a `main` mediante el flujo Git que se decida; este repositorio no hace ese merge automáticamente.

## 4. Variables de Cloudflare

`Settings` → `Variables and Secrets`.

### `APPS_SCRIPT_URL`

URL completa `/exec` del despliegue de Apps Script.

### `WHATSAPP_TARGET`

Número que recibirá el mensaje cuando el cliente pulse «No puedo en ninguna de estas horas».

Formato internacional, preferentemente solo dígitos:

`34XXXXXXXXX`

No introducir estas variables en `web/app.js` ni en commits.

## 5. Dominio

Asignar:

`cita.desorden.cat`

## 6. Smoke test

Antes de enviar enlaces reales:

1. Crear dos clientes ficticios temporales en el mismo bloque.
2. Ejecutar `syncClientMetadata()`.
3. Crear las 8 franjas con `createBlockSlots(...)`.
4. Abrir los dos enlaces en navegadores distintos.
5. Confirmar una misma franja casi simultáneamente.
6. Verificar que solo uno queda `CONFIRMADO`.
7. Eliminar los datos ficticios después de la validación.

La matriz completa está en `docs/QA.md`.
