# Google Sheets

Crear un único spreadsheet con dos pestañas.

## CLIENTES
Cabeceras exactas:

`ID | TOKEN | NOMBRE | DIRECCION | POBLACION | PISO | TELEFONO | BLOQUE`

Ejemplo:

`CLI-001 | token_aleatorio_largo | Cliente A | C/ Exemple 1 | Manresa | 2º1ª | 34600000000 | BLK-001`

El teléfono debe incluir prefijo internacional y solo dígitos para WhatsApp.

## FRANJAS
Cabeceras exactas:

`ID | BLOQUE | FECHA | HORA | ESTADO | CLIENTE_ID | CONFIRMADO_EN`

Ejemplo:

`SLT-001 | BLK-001 | 2026-09-10 | 09:00 | LIBRE | |`

Estados V1:
- `LIBRE`
- `CONFIRMADO`

Cada bloque puede tener 8 filas activas: 2 fechas × 4 horas.

## Tokens
Generar valores aleatorios de alta entropía. No usar `CLI-001`, nombre, teléfono ni un contador como token.
