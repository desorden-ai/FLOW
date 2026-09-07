const API_URL = '/api';
const $ = (selector) => document.querySelector(selector);
const TOKEN_KEY = 'desorden_cita_booking_token';
function bootstrapToken() {
  const valid = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
  let stored = '';
  try { stored = sessionStorage.getItem(TOKEN_KEY) || ''; } catch {}
  // 1. Explicit credential in URL always wins.
  const fromHash = new URLSearchParams(location.hash.slice(1)).get('c');
  const fromQuery = new URLSearchParams(location.search).get('c');
  const explicit = fromHash ?? fromQuery;  // null when URL has no c= at all
  let value = '';
  if (explicit != null) {
    // URL contains c= — use it if valid; discard storage otherwise.
    value = valid(explicit) ? explicit : '';
  } else {
    // No c= in URL — fall back to sessionStorage.
    value = valid(stored) ? stored : '';
  }
  try {
    if (value) sessionStorage.setItem(TOKEN_KEY, value);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {}
  history.replaceState(null, '', location.pathname);
  return value;
}
const token = bootstrapToken();
const COPY = {
  ca: {
    title: 'Manteniment Panasonic · Reserva', subtitle: 'Confirma la data del teu manteniment',
    intro: 'Selecciona una data i hora disponibles.', fallback: "No puc en cap d'aquestes hores",
    confirmed: 'Cita confirmada', reserved: 'El manteniment ha quedat reservat.',
    empty: 'No queden hores disponibles', emptyHelp: 'Pots contactar-nos per buscar una altra data.',
    service: 'Servei Tècnic Autoritzat Panasonic', legal: 'Avís legal', privacy: 'Privacitat',
    company: 'Fontaneria Ángel Molero e Hijos S.L.', loading: 'Carregant disponibilitat…',
    confirming: 'Confirmant…', reserve: 'Reservar', at: 'a les',
    invalid: 'L’enllaç de reserva no és vàlid.', unavailable: 'Aquesta cita encara no té horaris assignats.',
    error: 'No s’ha pogut carregar la disponibilitat. Torna-ho a provar més tard.',
    failed: 'No s’ha pogut confirmar. Torna-ho a provar.', taken: 'Aquesta hora acaba de ser reservada. Hem actualitzat les opcions.',
  },
  es: {
    title: 'Mantenimiento Panasonic · Reserva', subtitle: 'Confirma la fecha de tu mantenimiento',
    intro: 'Selecciona una fecha y hora disponibles.', fallback: 'No puedo en ninguna de estas horas',
    confirmed: 'Cita confirmada', reserved: 'Su mantenimiento ha quedado reservado.',
    empty: 'No quedan horas disponibles', emptyHelp: 'Puede contactarnos para buscar otra fecha.',
    service: 'Servicio Técnico Autorizado Panasonic', legal: 'Aviso legal', privacy: 'Privacidad',
    company: 'Fontanería Ángel Molero e Hijos S.L.', loading: 'Cargando disponibilidad…',
    confirming: 'Confirmando…', reserve: 'Reservar', at: 'a las',
    invalid: 'El enlace de reserva no es válido.', unavailable: 'Esta cita todavía no tiene horarios asignados.',
    error: 'No se ha podido cargar la disponibilidad. Vuelve a intentarlo más tarde.',
    failed: 'No se ha podido confirmar. Vuelve a intentarlo.', taken: 'Esta hora acaba de ser reservada. Se han actualizado las opciones.',
  },
};
let language = 'ca';
let snapshot = null;
let statusKey = 'loading';
let statusError = false;
let busySlot = '';
function t(key) { return COPY[language][key]; }
function setStatus(key, error = false) {
  statusKey = key; statusError = error;
  $('#status').hidden = !key;
  $('#status').textContent = key ? t(key) : '';
  $('#status').dataset.error = error ? '1' : '0';
}
function groupByDate(slots) {
  const minutes = value => { const [h,m] = value.split(':').map(Number); return h * 60 + m; };
  return [...slots].sort((a,b) => a.date.localeCompare(b.date) || minutes(a.time) - minutes(b.time))
    .reduce((groups,slot) => { (groups[slot.date] ??= []).push(slot); return groups; }, {});
}
function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const text = new Intl.DateTimeFormat(language === 'ca' ? 'ca-ES' : 'es-ES', { weekday:'long', day:'numeric', month:'long' }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}
async function callPublic(action, extra = {}) {
  const response = await fetch(API_URL, { method:'POST', cache:'no-store', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ action, token, ...extra }) });
  const data = await response.json();
  if (!response.ok) return { ok:false, error:data?.error };
  return data;
}
function textElement(tag, text, className = '') {
  const el = document.createElement(tag); el.textContent = text; el.className = className; return el;
}
function render() {
  document.documentElement.lang = language;
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-language]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.language === language)));
  setStatus(statusKey, statusError);
  $('#booking').hidden = !snapshot || Boolean(snapshot.booking);
  $('#success').hidden = !snapshot?.booking;
  if (!snapshot) return;
  if (snapshot.booking) {
    $('#successText').textContent = `${formatDate(snapshot.booking.date)} · ${snapshot.booking.time}`;
    return;
  }
  $('#client').replaceChildren(textElement('h2', snapshot.client?.firstName ? `Hola, ${snapshot.client.firstName}` : 'Hola'), textElement('p', t('intro')));
  const slotsEl = $('#slots'); slotsEl.replaceChildren();
  if (!snapshot.slots.length) {
    const empty = textElement('section', '', 'day');
    empty.append(textElement('h2', t('empty')), textElement('p', t('emptyHelp'))); slotsEl.append(empty);
  }
  Object.entries(groupByDate(snapshot.slots)).forEach(([date,items]) => {
    const day = textElement('section', '', 'day');
    const grid = textElement('div', '', 'slot-grid');
    items.forEach(slot => {
      const button = textElement('button', busySlot === slot.slotId ? t('confirming') : slot.time, 'slot');
      button.type = 'button'; button.disabled = Boolean(busySlot);
      button.setAttribute('aria-label', `${t('reserve')} ${formatDate(date)} ${t('at')} ${slot.time}`);
      button.addEventListener('click', () => book(slot)); grid.append(button);
    });
    day.append(textElement('h2', formatDate(date)), grid); slotsEl.append(day);
  });
}
async function load() {
  if (!token) { setStatus('invalid', true); return; }
  try {
    const data = await callPublic('availability');
    if (!data.ok) {
      snapshot = null;
      setStatus(data.error === 'INVALID_TOKEN' ? 'invalid' : data.error === 'CLIENT_NOT_READY' ? 'unavailable' : 'error', true);
    } else { snapshot = data; setStatus(''); }
  } catch { snapshot = null; setStatus('error', true); }
  render();
}
async function book(slot) {
  if (busySlot) return;
  busySlot = slot.slotId; setStatus(''); render();
  try {
    const data = await callPublic('book', { slotId:slot.slotId });
    if ((data.ok || data.error === 'ALREADY_BOOKED') && data.booking) {
      snapshot.booking = data.booking; setStatus('');
    } else if (data.error === 'SLOT_TAKEN') {
      await load(); if (snapshot && !snapshot.booking) setStatus('taken', true);
    } else if (data.error === 'INVALID_TOKEN') {
      snapshot = null; setStatus('invalid', true);
    } else setStatus('failed', true);
  } catch { setStatus('failed', true); }
  finally { busySlot = ''; render(); }
}
document.querySelectorAll('[data-language]').forEach(el => el.addEventListener('click', () => { language = el.dataset.language; render(); }));
$('#noneFit').addEventListener('click', () => location.assign(`/contact?lang=${language}`));
render();
load();
