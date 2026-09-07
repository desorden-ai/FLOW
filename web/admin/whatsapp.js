(() => {
  function normalizePhone(value) {
    const number = String(value || '').replace(/\D/g, '');
    if (number.length === 9 && /^[6789]/.test(number)) return `34${number}`;
    return number;
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
    const card = anchor.closest('.admin-client');
    const name = card?.querySelector('.client-top strong')?.textContent?.trim() || '';
    const address = card?.querySelector('.client-address')?.textContent?.trim() || '';
    const phone = normalizePhone(new URL(anchor.href).pathname.replace(/\//g, ''));

    const block = blocksState.find((item) => item.block === blockId);
    if (!block) return null;

    const candidates = (block.clients || []).filter((client) => {
      if (normalizePhone(client.phone) !== phone) return false;
      if (String(client.name || '').trim() !== name) return false;
      const clientAddress = [client.address, client.city].filter(Boolean).join(' · ').trim();
      return !address || clientAddress === address;
    });

    return candidates.length === 1 ? candidates[0] : null;
  }

  function messageFor(client) {
    const name = String(client.name || '').trim();
    return `${greeting()}${name ? `, ${name}` : ''}.\n\nLe confirmamos que corresponde realizar la revisión de su equipo Panasonic.\n\nPuede seleccionar la fecha y hora que le vaya mejor desde su enlace personal:\n${client.bookingUrl}\n\nGracias.`;
  }

  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a.mini-action[href^="https://wa.me/"]');
    if (!anchor) return;

    event.preventDefault();
    const client = findClient(anchor);

    if (!client || !client.bookingUrl) {
      if (typeof setStatus === 'function') {
        setStatus('No se ha podido preparar WhatsApp porque falta el enlace personal de este cliente. Actualiza el panel y vuelve a intentarlo.', true);
      }
      return;
    }

    const phone = normalizePhone(client.phone);
    if (!phone) {
      if (typeof setStatus === 'function') setStatus('Este cliente no tiene un teléfono válido para WhatsApp.', true);
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(messageFor(client))}`;
    window.open(url, '_blank', 'noopener');
  }, true);
})();
