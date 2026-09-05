const API_URL = '/api';
const $ = (selector) => document.querySelector(selector);
const token = new URLSearchParams(location.search).get('c');

const statusEl = $('#status');
const bookingEl = $('#booking');
const slotsEl = $('#slots');
const clientEl = $('#client');
const successEl = $('#success');
const successTextEl = $('#successText');

let client = null;
let contactWhatsApp = '';

function setStatus(text, error = false) {
  statusEl.hidden = false;
  statusEl.textContent = text;
  statusEl.dataset.error = error ? '1' : '0';
}

function groupByDate(slots) {
  return slots.reduce((groups, slot) => {
    (groups[slot.date] ??= []).push(slot);
    return groups;
  }, {});
}

function formatDate(value) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${value}T12:00:00`));
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

function showBooking(booking) {
  bookingEl.hidden = true;
  statusEl.hidden = true;
  successEl.hidden = false;
  successTextEl.textContent = `${formatDate(booking.date)} · ${booking.time}`;
}

function renderClient(data) {
  clientEl.replaceChildren();
  const name = document.createElement('strong');
  name.textContent = data.name;
  const address = document.createElement('span');
  address.textContent = [data.address, data.city].filter(Boolean).join(' · ');
  clientEl.append(name, document.createElement('br'), address);
}

async function load() {
  if (!token) {
    setStatus('El enlace de reserva no es válido.', true);
    return;
  }

  try {
    const data = await getAvailability();
    if (!data.ok) throw new Error(data.error || 'UNKNOWN');

    client = data.client;
    contactWhatsApp = data.contactWhatsApp || '';
    renderClient(client);

    if (data.booking) {
      showBooking(data.booking);
      return;
    }

    render(data.slots || []);
    statusEl.hidden = true;
    bookingEl.hidden = false;
  } catch (error) {
    setStatus('No se ha podido cargar la disponibilidad.', true);
  }
}

function render(slots) {
  slotsEl.replaceChildren();

  if (!slots.length) {
    const empty = document.createElement('div');
    empty.className = 'day';
    empty.innerHTML = '<h2>No quedan horas libres</h2><p>Contacta por WhatsApp para buscar otra fecha.</p>';
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

  try {
    const data = await confirmBooking(slot.id);

    if (!data.ok) {
      if (data.error === 'SLOT_TAKEN') {
        setStatus('Esta hora acaba de ser reservada. Actualizando opciones…', true);
        await load();
        return;
      }
      if (data.error === 'ALREADY_BOOKED' && data.booking) {
        showBooking(data.booking);
        return;
      }
      throw new Error(data.error || 'BOOKING_FAILED');
    }

    showBooking(data.booking);
  } catch (error) {
    setStatus('No se ha podido confirmar. Vuelve a intentarlo.', true);
    buttons.forEach((item) => { item.disabled = false; });
    button.textContent = slot.time;
  }
}

$('#noneFit').addEventListener('click', () => {
  if (!client) return;
  if (!contactWhatsApp) {
    setStatus('El contacto de WhatsApp todavía no está configurado.', true);
    return;
  }

  const phone = contactWhatsApp.replace(/\D/g, '');
  const text = `Hola, soy ${client.name}. No puedo asistir en ninguna de las horas propuestas para el mantenimiento de ${client.address || 'mi domicilio'}. ¿Podemos buscar otra fecha?`;
  location.href = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
});

load();
