# QA

## Automatizado

Ejecutar desde la raíz:

```bash
npm test
```

Incluye:

1. parseo sintáctico de `apps-script/Code.gs`;
2. rechazo de tokens inválidos en `/api`;
3. filtrado de campos administrativos en disponibilidad;
4. limpieza del payload de reserva antes de reenviarlo;
5. normalización de respuestas upstream inválidas.

No requiere instalar dependencias.

## QA funcional real

### TEST 1 — disponibilidad válida

- Cliente con token válido y bloque asignado.
- Debe ver únicamente franjas `LIBRE` de su bloque.

### TEST 2 — token inválido

- Abrir `?c=TOKEN_INEXISTENTE`.
- No debe aparecer información de ningún cliente.

### TEST 3 — reserva correcta

- Reservar una franja libre.
- `cita.ESTADO_CITA` → `CONFIRMADO`.
- `FRANJAS.ESTADO` → `CONFIRMADO`.
- Ambos registros deben guardar timestamp.

### TEST 4 — mismo bloque

- Cliente A reserva una franja.
- Cliente B del mismo bloque recarga.
- Esa franja ya no debe aparecer.

### TEST 5 — bloque independiente

- Cliente C pertenece a otro bloque.
- La reserva del cliente A no debe alterar sus opciones.

### TEST 6 — concurrencia

- Dos clientes del mismo bloque abren la misma franja.
- Pulsar confirmar casi simultáneamente en dos navegadores.
- Solo uno puede obtener `CONFIRMADO`.
- El segundo debe recibir `SLOT_TAKEN` y actualizar disponibilidad.

### TEST 7 — doble reserva

- Cliente ya confirmado intenta reservar otra franja reutilizando una petición.
- Backend debe devolver `ALREADY_BOOKED`.

### TEST 8 — reapertura

- Cliente confirmado vuelve a abrir su URL.
- Debe ver `Tu cita está confirmada`, fecha, hora y dirección.
- No debe ver los botones de franjas.

### TEST 9 — WhatsApp

- Pulsar `No puedo en ninguna de estas horas`.
- Debe abrir el número configurado en `WHATSAPP_TARGET`.
- Texto esperado:

`Hola, soy [CLIENTE]. No puedo asistir en ninguna de las horas propuestas para el mantenimiento de [DIRECCION]. ¿Podemos buscar otra fecha?`

### TEST 10 — privacidad

Inspeccionar respuesta `/api`.

No debe incluir:

- teléfono del cliente;
- SA/WO;
- URLs de Drive/PDF;
- filas de otros clientes;
- bloque interno;
- `CLIENTE_ID`;
- token de otro usuario.

## Criterio de salida V1

La V1 puede considerarse operativa cuando:

- `npm test` pasa;
- los 10 tests funcionales pasan;
- Apps Script está desplegado;
- Cloudflare tiene las dos variables requeridas;
- `cita.desorden.cat` sirve la web y `/api` correctamente.
