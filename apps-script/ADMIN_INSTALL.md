# DESORDEN CITA · Web Admin

`Admin.gs` contiene el backend privado del dashboard web `/admin`.

## Estado actual

`Code.gs` ya debe contener las rutas administrativas en `doPost(e)`:

- `adminSnapshot`
- `adminUpdateAvailability`

No es necesario volver a modificar `Code.gs` para las mejoras del panel.

## Actualizar el backend del dashboard

1. Abrir el proyecto Apps Script vinculado a la hoja `CITA`.
2. Abrir `Admin.gs`.
3. Sustituir todo su contenido por la versión actual de `apps-script/Admin.gs` de la rama `Cita`.
4. Guardar.
5. Ir a **Implementar → Gestionar implementaciones → Editar**.
6. Seleccionar **Nueva versión** y publicar manteniendo la misma URL y permisos del Web App.

## Funciones incluidas

- snapshot privado del dashboard;
- edición segura de disponibilidad;
- hasta 8 fechas distintas por bloque;
- hasta 8 horas distintas e independientes por cada fecha;
- preservación de franjas `CONFIRMADO` al modificar o eliminar días/horarios;
- almacenamiento de la planificación administrativa en `Script Properties`;
- cambio de contraseña mediante `Script Properties`;
- detalle por bloque con franjas individuales y clientes agrupados por visita;
- detección de solapamientos de fecha/hora entre bloques;
- creación de nuevos clientes dentro de bloques existentes;
- edición de nombre, teléfono, dirección, población y bloque;
- protección del cambio de bloque cuando el cliente ya tiene cita confirmada;
- archivado seguro de clientes pendientes sin borrar físicamente filas históricas de la hoja;
- protección contra archivado de clientes con cita confirmada;
- creación opcional de hasta 8 SAs al añadir un cliente;
- los SAs existentes se mantienen sin reescritura al editar para no romper metadatos de órdenes de servicio.

No se requieren variables nuevas en Cloudflare.
