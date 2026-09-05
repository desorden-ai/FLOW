const API_URL = '/api';
const $ = (selector) => document.querySelector(selector);
const token = new URLSearchParams(location.search).get('c');

const statusEl = $('#status');
const bookingEl = $('#booking');
const slotsEl = $('#slots');
const clientEl = $('#client');
const successEl = $('#success');
const successTextEl = $('#successText');
const successAddressEl = $('#successAddress');
const noneFitEl = $('#noneFit');

let client = null;
let contactWhatsApp = '';

function setStatus(text, error = false) {
  statusEl.hidden = false;
  statusEl.textContent = text;
  statusEl.dataset.error = error ? '1' : '0';
}

function clearStatus() {
  statusEl.hidden = true;
  statusEl.textContent = '';
  statusEl.dataset.error = '0';
}

function groupByDate(slots) {
  return slots.reduce((groups, slot) => {
    (groups[slot.date] ??= []).push(slot);
    return groups;
  }, {});
}

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function formatAddress(data) {
  return [data?.address, data?.city].filter(Boolean).join(' · ');
}

async function getAvailability() {
  const url = new URL(API_URL, location.origin);
  url.searchParams.set('action', 'availability');
  url.searchParams.set('token', token);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return response.json();
}

async function confirmBooking(slotId) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'book', token, slotId }),
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return response.json();
}

function renderClient(data) {
  clientEl.replaceChildren();

  const name = document.createElement('strong');
  name.textContent = data.name || 'Cliente';

  const address = document.createElement('span');
  address.textContent = formatAddress(data);

  clientEl.append(name);
  if (address.textContent) clientEl.append(document.createElement('br'), address);
}

function showBooking(booking) {
  bookingEl.hidden = true;
  clearStatus();
  successEl.hidden = false;
  successTextEl.textContent = `${formatDate(booking.date)} · ${booking.time}`;
  successAddressEl.textContent = formatAddress(client);
}

function showLoadError(code) {
  const messages = {
    INVALID_TOKEN: 'El enlace de reserva no es válido.',
    CLIENT_NOT_READY: 'Esta cita todavía no tiene horarios asignados.',
  };
  setStatus(messages[code] || 'No se ha podido cargar la disponibilidad.', true);
}

async function load() {
  bookingEl.hidden = true;
  successEl.hidden = true;

  if (!token) {
    showLoadError('INVALID_TOKEN');
    return;
  }

  try {
    const data = await getAvailability();
    if (!data.ok) {
      showLoadError(data.error);
      return;
    }

    client = data.client;
    contactWhatsApp = data.contactWhatsApp || '';
    renderClient(client);

    if (data.booking) {
      showBooking(data.booking);
      return;
    }

    renderSlots(data.slots || []);
    clearStatus();
    bookingEl.hidden = false;
  } catch {
    showLoadError('NETWORK');
  }
}

function renderSlots(slots) {
  slotsEl.replaceChildren();

  if (!slots.length) {
    const empty = document.createElement('section');
    empty.className = 'day empty-state';

    const title = document.createElement('h2');
    title.textContent = 'No quedan horas libres';

    const text = document.createElement('p');
    text.textContent = 'Puedes escribirnos por WhatsApp para buscar otra fecha.';

    empty.append(title, text);
    slotsEl.appendChild(empty);
    return;
  }

  Object.entries(groupByDate(slots)).forEach(([date, items]) => {
    const box = document.createElement('section');
    box.className = 'day';

    const title = document.createElement('h2');
    title.textContent = formatDate(date);

    const grid = document.createElement('div');
    grid.className = 'slot-grid';

    items.forEach((slot) => {
      const button = document.createElement('button');
      button.className = 'slot';
      button.type = 'button';
      button.textContent = slot.time;
      button.setAttribute('aria-label', `Reservar ${formatDate(slot.date)} a las ${slot.time}`);
      button.addEventListener('click', () => book(slot, button));
      grid.appendChild(button);
    });

    box.append(title, grid);
    slotsEl.appendChild(box);
  });
}

async function book(slot, button) {
  const buttons = [...document.querySelectorAll('.slot')];
  buttons.forEach((item) => { item.disabled = true; });
  button.textContent = 'Confirmando…';
  clearStatus();

  try {
    const data = await confirmBooking(slot.id);

    if (!data.ok) {
      if (data.error === 'SLOT_TAKEN') {
        setStatus('Esta hora acaba de ser reservada. Se han actualizado las opciones.', true);
        await load();
        return;
      }
      if (data.error === 'ALREADY_BOOKED' && data.booking) {
        showBooking(data.booking);
        return;
      }
      if (data.error === 'INVALID_TOKEN') {
        showLoadError('INVALID_TOKEN');
        return;
      }
      throw new Error(data.error || 'BOOKING_FAILED');
    }

    showBooking(data.booking);
  } catch {
    setStatus('No se ha podido confirmar. Vuelve a intentarlo.', true);
    buttons.forEach((item) => { item.disabled = false; });
    button.textContent = slot.time;
  }
}

noneFitEl.addEventListener('click', () => {
  if (!client) return;
  if (!contactWhatsApp) {
    setStatus('El contacto de WhatsApp todavía no está configurado.', true);
    return;
  }

  const phone = contactWhatsApp.replace(/\D/g, '');
  const text = `Hola, soy ${client.name}. No puedo asistir en ninguna de las horas propuestas para el mantenimiento de ${client.address || 'mi domicilio'}. ¿Podemos buscar otra fecha?`;
  window.location.assign(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
});

load();
