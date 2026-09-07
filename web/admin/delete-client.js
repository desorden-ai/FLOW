(() => {
  const STORAGE_KEY = 'desorden_cita_admin_key';
  const API_URL = '/api/admin';

  function relabelDeleteActions() {
    document.querySelectorAll('button.archive-action').forEach((button) => {
      if (button.textContent !== 'Eliminar') button.textContent = 'Eliminar';
      const nextTitle = button.disabled
        ? 'Cancela primero la cita confirmada antes de eliminar el cliente.'
        : 'Eliminar este cliente del panel.';
      if (button.title !== nextTitle) button.title = nextTitle;
    });
  }

  async function removeClient(button) {
    if (button.disabled) return;
    const card = button.closest('.admin-client');
    const clientId = card?.dataset.clientId || '';
    const name = card?.querySelector('.client-top strong')?.textContent?.trim() || 'este cliente';
    if (!clientId) {
      window.alert('No se ha podido identificar el cliente. Actualiza el panel e inténtalo de nuevo.');
      return;
    }

    const accepted = window.confirm(
      `¿Eliminar a ${name}?\n\nSe quitará del panel y de la agenda activa. El registro se conservará internamente para evitar una pérdida accidental.`
    );
    if (!accepted) return;

    const adminKey = sessionStorage.getItem(STORAGE_KEY) || '';
    if (!adminKey) {
      window.alert('La sesión ha caducado. Vuelve a introducir la clave.');
      return;
    }

    button.disabled = true;
    button.textContent = 'Eliminando…';
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({ action: 'archiveClient', clientId }),
        cache: 'no-store',
      });
      let data = {};
      try { data = await response.json(); } catch {}
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP_${response.status}`);

      const refresh = document.querySelector('#refresh');
      if (refresh) refresh.click();
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Eliminar';
      if (error.message === 'CLIENT_CONFIRMED_CANNOT_ARCHIVE') {
        window.alert('Cancela primero la cita confirmada y después elimina el cliente.');
      } else if (error.message === 'UNAUTHORIZED') {
        sessionStorage.removeItem(STORAGE_KEY);
        window.alert('La sesión ha caducado. Vuelve a introducir la clave.');
      } else {
        window.alert('No se ha podido eliminar el cliente. Actualiza el panel e inténtalo de nuevo.');
      }
    }
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('button.archive-action');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    removeClient(button);
  }, true);

  const blocks = document.querySelector('#blocks');
  if (blocks) new MutationObserver(relabelDeleteActions).observe(blocks, { childList: true, subtree: true });
  relabelDeleteActions();
})();
