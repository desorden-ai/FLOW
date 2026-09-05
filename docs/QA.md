# QA

## Pruebas automáticas

Ejecutar:

```bash
npm test
```

Las pruebas no requieren dependencias externas y cubren:

- sintaxis del Apps Script;
- rechazo de token inválido antes del upstream;
- saneado de datos privados en disponibilidad;
- forwarding exclusivo de `action`, `token` y `slotId`;
- saneado de la respuesta de reserva;
- normalización de JSON upstream inválido;
- routing de assets mediante `ASSETS`;
- rechazo de métodos HTTP no soportados en `/api`.

## Prueba local del Worker

```bash
npm run dev
```

Para probar contra Apps Script real deben configurarse localmente los bindings equivalentes a `APPS_SCRIPT_URL` y `WHATSAPP_TARGET` sin commitear secretos.

## QA E2E obligatorio antes de producción definitiva

1. Cliente A del bloque 1 ve 8 franjas.
2. Cliente A confirma una.
3. Al reabrir el enlace ve la cita confirmada.
4. Cliente B del mismo bloque ya no ve esa franja.
5. Cliente C de otro bloque no se ve afectado.
6. Dos clientes intentan reservar simultáneamente la misma franja: solo uno confirma.
7. Token inválido no devuelve datos personales.
8. Alterar el payload con otro `block`/`clientId` no cambia la asignación backend.
9. El botón de WhatsApp abre el número configurado.
10. La confirmación queda registrada tanto en `cita` como en `FRANJAS`.
