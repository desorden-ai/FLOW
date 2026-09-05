# Arquitectura

## Objetivo
Aplicación independiente para gestionar propuestas de cita de mantenimiento sin depender de LAB, SAT, DATE ni otros sistemas.

## Flujo
1. El administrador mantiene clientes y franjas en Google Sheets.
2. Cada cliente recibe `https://cita.desorden.cat/?c=TOKEN_ALEATORIO`.
3. La web consulta Apps Script con el token.
4. Apps Script resuelve cliente → bloque y devuelve solo franjas `LIBRE` de ese bloque.
5. Al reservar, Apps Script adquiere `LockService`, vuelve a validar la franja y solo entonces escribe `CONFIRMADO`.
6. Los clientes de otros bloques mantienen disponibilidad independiente.
7. Si ninguna opción encaja, la web abre WhatsApp con un texto preparado.

## Seguridad V1
- No exponer IDs secuenciales en la URL pública.
- Tokens largos, aleatorios y no reutilizados entre clientes.
- No guardar secretos en el repositorio.
- El backend nunca confía en el bloque enviado por el navegador: lo resuelve desde el token.
- Toda reserva se revalida bajo bloqueo en servidor.
