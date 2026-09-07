# DESORDEN CITA · Web Admin

El panel operativo principal es web: `https://cita.desorden.cat/admin`.

Google Sheets queda como almacenamiento y soporte técnico; no es la interfaz diaria de gestión.

## Funciones V1

- acceso privado mediante clave;
- KPIs: visitas, confirmadas, pendientes y horas libres;
- disponibilidad por bloque/zona;
- edición de 2 fechas y 4 horas por bloque;
- actualización de FRANJAS preservando cualquier reserva `CONFIRMADO`;
- agenda de citas confirmadas con cliente, dirección, población y SAs;
- diseño responsive para escritorio y móvil.

## Seguridad

- la clave en claro no se guarda en GitHub;
- Worker y Apps Script validan SHA-256;
- `/api/admin` solo acepta POST autenticado;
- las operaciones administrativas se revalidan en Apps Script;
- la modificación de franjas comparte `LockService` con las reservas de clientes.

La reserva pública `/` y `/api` mantiene su contrato existente.
