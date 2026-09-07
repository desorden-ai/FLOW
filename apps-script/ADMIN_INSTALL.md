# DESORDEN CITA · Web Admin

`Admin.gs` contiene el backend privado del dashboard web `/admin`.

## Único cambio requerido en `Code.gs`

Sustituir solamente la función `doPost(e)` actual por esta versión:

```javascript
function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (payload.action === 'book') {
      return json_(book_(payload.token, payload.slotId));
    }

    if (payload.action === 'adminSnapshot') {
      return json_(adminSnapshot_(payload.adminKey));
    }

    if (payload.action === 'adminUpdateAvailability') {
      return json_(adminUpdateAvailability_(payload));
    }

    return json_({ ok: false, error: 'UNKNOWN_ACTION' });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'UNAUTHORIZED') return json_({ ok: false, error: 'UNAUTHORIZED' });
    return json_({ ok: false, error: 'SERVER_ERROR' });
  }
}
```

Después añadir `Admin.gs` al mismo proyecto Apps Script y crear una nueva versión del Web App manteniendo la misma URL y permisos.

No se requieren variables nuevas en Cloudflare. La clave de administración se valida por SHA-256 en Worker y Apps Script; el secreto en claro no está en GitHub.
