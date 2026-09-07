(() => {
  function normalizePhone(value) {
    const number = String(value || '').replace(/\D/g, '');
    if (number.length === 9 && /^[6789]/.test(number)) return `34${number}`;
    return /^[1-9]\d{8,14}$/.test(number) ? number : '';
  }

  function madridHour() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
    return Number.isFinite(hour) ? hour : 0;
  }

  function greeting() {
    return madridHour() < 14 ? 'Buenos días' : 'Buenas tardes';
  }

  function findClient(anchor) {
    const blockId = anchor.closest('details[data-block]')?.dataset.block || '';
    const clientId = anchor.dataset.clientId;
    if (!clientId || !blockId) return null;
    const candidates = blocksState.flatMap(block => (block.clients || []).filter(client => client.id === clientId).map(client => ({ client, block:block.block })));
    if (candidates.length !== 1 || candidates[0].block !== blockId) return null;
    const client = candidates[0].client;
    if ((client.block && client.block !== blockId) || !String(client.name || '').trim() || !String(client.address || '').trim() || !normalizePhone(client.phone)) return null;
    try {
      const url = new URL(client.bookingUrl);
      if (url.origin !== 'https://cita.desorden.cat' || url.pathname !== '/' || url.username || url.password) return null;
      const fragment = /^#c=[a-f0-9]{64}$/i.test(url.hash) && !url.search;
      const legacy = /^\?c=[a-f0-9]{64}$/i.test(url.search) && !url.hash;
      if (!fragment && !legacy) return null;
    } catch { return null; }
    return client;
  }

  function messageFor(client) {
    const name = String(client.name || '').trim().split(/\s+/)[0];
    return `${greeting()}, ${name}.\n\nLe confirmamos que corresponde realizar la revisión de su equipo Panasonic.\n\nPuede seleccionar la fecha y hora que le vaya mejor desde su enlace personal:\n\n${client.bookingUrl}\n\nGracias.`;
  }

  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a.mini-action[href^="https://wa.me/"]');
    if (!anchor) return;

    event.preventDefault();
    const client = findClient(anchor);

    if (!client || !client.bookingUrl) {
      if (typeof setStatus === 'function') {
        setStatus('No se ha podido validar un único cliente, bloque, teléfono, dirección y enlace personal. Actualiza el panel y revisa sus datos.', true);
      }
      return;
    }

    const phone = normalizePhone(client.phone);
    if (!phone) {
      if (typeof setStatus === 'function') setStatus('Este cliente no tiene un teléfono válido para WhatsApp.', true);
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(messageFor(client))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, true);
})();
