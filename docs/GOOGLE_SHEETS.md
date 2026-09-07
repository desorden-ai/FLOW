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

### Unidad de reserva y múltiples SAs

La reserva representa una **visita física**, no una fila ni una SA aislada.

Dos o más filas se consideran la misma unidad de reserva cuando coinciden, tras normalización:

- `CLIENTE`
- `TELEFONO`
- `DIRECCION`
- `POBLACION`

Esas filas comparten el mismo `CLIENTE_ID`, `TOKEN`, `URL_CITA` y estado de reserva. Si el cliente confirma una franja, Apps Script actualiza todas las SAs asociadas a esa visita.

Esto evita que un mismo domicilio con varias órdenes reciba enlaces independientes o pueda reservar dos veces.

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

El script genera automáticamente los campos internos que falten y consolida las filas que correspondan a una misma visita.

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

En todas las filas que pertenecen a la misma visita:

- `ESTADO_CITA = CONFIRMADO`
- `CITA_FECHA`
- `CITA_HORA`
- `CONFIRMADO_EN`

No se debe modificar manualmente una reserva mientras el cliente está usando la web.

## 8. Panel visual `CONTROL_CITAS`

Ejecutar una vez desde Apps Script:

```js
installControlDashboard()
```

Esto crea o actualiza el panel y conecta el checkbox `GENERAR` con la creación automática de franjas. La instalación es idempotente: no duplica el activador.

El panel crea una fila por bloque con:

- población;
- número de visitas físicas;
- número de SAs;
- dos fechas editables;
- cuatro horas editables;
- número de franjas existentes;
- estado visual del bloque;
- checkbox `GENERAR`.

Las horas nuevas parten de `09:00`, `10:30`, `12:00` y `15:30`, pero se pueden editar.

Para crear las ocho franjas:

1. rellenar `FECHA 1` y `FECHA 2`;
2. revisar las cuatro horas;
3. marcar `GENERAR`;
4. marcar `GENERAR`; las franjas se crean automáticamente.

Actualizar el panel no borra las fechas ni horas introducidas. Un bloque que ya tiene franjas se marca como `GENERADO` y nunca se duplica. Como alternativa manual, se puede ejecutar `generateSelectedSlots()` desde Apps Script.
