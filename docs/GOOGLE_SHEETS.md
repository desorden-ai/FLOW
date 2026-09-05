# Google Sheets

Spreadsheet canónico: `CITA`.

## 1. Pestaña `cita`

Esta pestaña es la fuente única de clientes y servicios.

### Columnas originales — no renombrar ni eliminar

`SA | WO | FECHA_TRABAJO | TIPO | CLIENTE | TELEFONO | DIRECCION | POBLACION | ESTADO_PENDIENTE | FALTA | DRIVE_FOLDER_URL | PDF_URL | PHOTO_COUNT | SERVICEPRO_URL | ULTIMA_REVISION | CERRADO | FECHA_CIERRE`

### Columnas técnicas de reserva añadidas

`CLIENTE_ID | BLOQUE | TOKEN | ESTADO_CITA | CITA_FECHA | CITA_HORA | CONFIRMADO_EN | URL_CITA`

Significado:

- `CLIENTE_ID`: identificador aleatorio interno, no secuencial.
- `BLOQUE`: grupo de clientes que comparte las mismas franjas.
- `TOKEN`: token privado usado en la URL pública.
- `ESTADO_CITA`: `PENDIENTE` o `CONFIRMADO`.
- `CITA_FECHA`: fecha finalmente reservada.
- `CITA_HORA`: hora finalmente reservada.
- `CONFIRMADO_EN`: timestamp de confirmación.
- `URL_CITA`: enlace que se envía al cliente.

No escribir manualmente `CLIENTE_ID`, `TOKEN` o `URL_CITA` salvo recuperación técnica. Apps Script los genera.

## 2. Pestaña `FRANJAS`

Cabeceras exactas:

`ID | BLOQUE | FECHA | HORA | ESTADO | CLIENTE_ID | CONFIRMADO_EN`

Estados V1:

- `LIBRE`
- `CONFIRMADO`

Una franja pertenece a un único bloque. Los clientes de otro bloque no la ven.

## 3. Alta de un cliente

1. Crear una fila nueva en `cita`.
2. Rellenar al menos `CLIENTE`; normalmente también `TELEFONO`, `DIRECCION` y `POBLACION`.
3. Asignar un identificador legible en `BLOQUE`, por ejemplo `BLK-MARTORELL-01`.
4. Ejecutar en Apps Script:

```js
syncClientMetadata()
```

El script genera automáticamente los campos internos que falten sin sobrescribir los existentes.

## 4. Crear un bloque con 8 opciones

Ejemplo administrativo:

```js
createBlockSlots(
  'BLK-MARTORELL-01',
  '2026-09-10',
  '2026-09-12',
  '09:00,10:30,12:00,15:30'
)
```

Resultado: 8 filas `LIBRE` en `FRANJAS`.

La función rechaza el bloque si ya tiene franjas para evitar duplicaciones accidentales.

## 5. Asignar bloque desde Apps Script

Opcionalmente:

```js
assignBlockByRow(2, 'BLK-MARTORELL-01')
```

La fila 1 es la cabecera, por lo que el primer cliente está en la fila 2.

## 6. URL del cliente

Tras `syncClientMetadata()` aparecerá en `URL_CITA`:

`https://cita.desorden.cat/?c=TOKEN_ALEATORIO`

El token no contiene nombre, SA, teléfono ni un contador.

## 7. Reserva

Al reservar, Apps Script actualiza atómicamente:

### `FRANJAS`

- `ESTADO = CONFIRMADO`
- `CLIENTE_ID`
- `CONFIRMADO_EN`

### `cita`

- `ESTADO_CITA = CONFIRMADO`
- `CITA_FECHA`
- `CITA_HORA`
- `CONFIRMADO_EN`

No se debe modificar manualmente una reserva mientras el cliente está usando la web.
