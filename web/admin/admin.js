const API_URL = '/api/admin';
const STORAGE_KEY = 'desorden_cita_admin_key';
const $ = (selector) => document.querySelector(selector);

const loginEl = $('#login');
const appEl = $('#app');
const formEl = $('#loginForm');
const passwordEl = $('#password');
const loginErrorEl = $('#loginError');
const statusEl = $('#status');
const blocksEl = $('#blocks');
const appointmentsEl = $('#appointments');
const passwordDialog = $('#passwordDialog');
const passwordForm = $('#passwordForm');
const newPasswordEl = $('#newPassword');
const newPasswordConfirmEl = $('#newPasswordConfirm');
const passwordErrorEl = $('#passwordError');
const savePasswordEl = $('#savePassword');

let adminKey = sessionStorage.getItem(STORAGE_KEY) || '';
let blockLabels = {};

function setStatus(text, error = false) {
  statusEl.hidden = !text;
  statusEl.textContent = text || '';
  statusEl.dataset.error = error ? '1' : '0';
}

function fmtDate(value, long = false) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-ES', long
    ? { weekday: 'long', day: 'numeric', month: 'long' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

async function callApi(action, payload = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminKey}`,
    },
    body: JSON.stringify({ action, ...payload }),
    cache: 'no-store',
  });

  let data = {};
  try { data = await response.json(); } catch {}
  if (response.status === 401) throw new Error('UNAUTHORIZED');
  if (!response.ok || !data.ok) throw new Error(data.error || `HTTP_${response.status}`);
  return data;
}

function showLogin(message = '') {
  appEl.hidden = true;
  loginEl.hidden = false;
  loginErrorEl.hidden = !message;
  loginErrorEl.textContent = message;
}

function showApp() {
  loginEl.hidden = true;
  appEl.hidden = false;
}

function renderSummary(summary) {
  $('#kpiVisits').textContent = summary.visits;
  $('#kpiConfirmed').textContent = summary.confirmed;
  $('#kpiPending').textContent = summary.pending;
  $('#kpiFree').textContent = summary.freeSlots;
  $('#updated').textContent = `Actualizado ${new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())}`;
}

function addText(parent, tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text;
  parent.append(el);
  return el;
}

function renderAvailabilityDetail(block, parent) {
  const section = document.createElement('section');
  section.className = 'block-detail-section';
  addText(section, 'h4', '', 'Disponibilidad publicada');

  if (!block.slots?.length) {
    addText(section, 'p', 'muted', 'Todavía no hay horas publicadas para este bloque.');
    parent.append(section);
    return;
  }

  const clientById = Object.fromEntries((block.clients || []).map((client) => [client.id, client]));
  const groups = {};
  block.slots.forEach((slot) => {
    (groups[slot.date] ||= []).push(slot);
  });

  const days = document.createElement('div');
  days.className = 'slot-days';

  Object.entries(groups).forEach(([date, slots]) => {
    const day = document.createElement('article');
    day.className = 'slot-day';
    addText(day, 'h5', '', fmtDate(date, true));

    const list = document.createElement('div');
    list.className = 'admin-slots';
    slots.forEach((slot) => {
      const chip = document.createElement('div');
      chip.className = `admin-slot ${slot.status === 'CONFIRMADO' ? 'confirmed' : 'free'}`;
      addText(chip, 'strong', '', slot.time || '—');
      addText(chip, 'span', '', slot.status === 'CONFIRMADO' ? 'Confirmada' : 'Libre');
      const client = clientById[slot.clientId];
      if (client) addText(chip, 'small', '', client.name);
      list.append(chip);
    });
    day.append(list);
    days.append(day);
  });

  section.append(days);
  parent.append(section);
}

function renderConflicts(block, parent) {
  if (!block.conflicts?.length) return;

  const section = document.createElement('section');
  section.className = 'conflict-box';
  addText(section, 'strong', '', 'Atención · horarios solapados');
  addText(section, 'p', '', 'Estas horas también están publicadas en otro bloque. Podrían generar dos visitas a la misma hora.');

  const list = document.createElement('div');
  list.className = 'conflict-list';
  block.conflicts.forEach((conflict) => {
    const names = conflict.blocks.map((name) => blockLabels[name] || name).join(', ');
    const item = document.createElement('div');
    item.className = `conflict-item${conflict.hasConfirmed ? ' critical' : ''}`;
    addText(item, 'span', '', `${fmtDate(conflict.date)} · ${conflict.time}`);
    addText(item, 'span', '', `También en ${names}${conflict.hasConfirmed ? ' · ya hay una confirmada' : ''}`);
    list.append(item);
  });
  section.append(list);
  parent.append(section);
}

function copyButton(url) {
  const button = document.createElement('button');
  button.className = 'mini-action';
  button.type = 'button';
  button.textContent = 'Copiar enlace';
  button.disabled = !url;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
      button.textContent = 'Copiado ✓';
      setTimeout(() => { button.textContent = 'Copiar enlace'; }, 1500);
    } catch {
      setStatus('No se ha podido copiar el enlace.', true);
    }
  });
  return button;
}

function renderClients(block, parent) {
  const section = document.createElement('section');
  section.className = 'block-detail-section';
  const heading = document.createElement('div');
  heading.className = 'detail-heading';
  addText(heading, 'h4', '', 'Clientes del bloque');
  addText(heading, 'span', 'detail-count', String(block.clients?.length || 0));
  section.append(heading);

  const list = document.createElement('div');
  list.className = 'client-list';

  (block.clients || []).forEach((client) => {
    const card = document.createElement('article');
    card.className = 'admin-client';

    const top = document.createElement('div');
    top.className = 'client-top';
    const identity = document.createElement('div');
    addText(identity, 'strong', '', client.name || 'Cliente');
    addText(identity, 'span', 'client-address', [client.address, client.city].filter(Boolean).join(' · '));
    const state = addText(top, 'span', `client-state ${client.status === 'CONFIRMADO' ? 'confirmed' : ''}`, client.status === 'CONFIRMADO' ? 'CONFIRMADO' : 'PENDIENTE');
    top.prepend(identity);
    card.append(top);

    const meta = document.createElement('div');
    meta.className = 'client-meta';
    if (client.sas?.length) addText(meta, 'span', '', `SA: ${client.sas.join(' · ')}`);
    if (client.phone) addText(meta, 'span', '', `Tel: ${client.phone}`);
    if (client.status === 'CONFIRMADO' && client.date && client.time) {
      addText(meta, 'span', 'booking-selected', `Cita: ${fmtDate(client.date)} · ${client.time}`);
    }
    card.append(meta);

    const actions = document.createElement('div');
    actions.className = 'client-actions';
    if (client.phone) {
      const call = document.createElement('a');
      call.className = 'mini-action';
      call.href = `tel:${digits(client.phone)}`;
      call.textContent = 'Llamar';
      actions.append(call);

      const whats = document.createElement('a');
      whats.className = 'mini-action';
      whats.href = `https://wa.me/${digits(client.phone)}`;
      whats.target = '_blank';
      whats.rel = 'noopener';
      whats.textContent = 'WhatsApp';
      actions.append(whats);
    }
    actions.append(copyButton(client.bookingUrl));
    card.append(actions);
    list.append(card);
  });

  if (!block.clients?.length) addText(list, 'p', 'muted', 'No hay clientes asociados.');
  section.append(list);
  parent.append(section);
}

function availabilityForm(block) {
  const wrap = document.createElement('section');
  wrap.className = 'block-detail-section edit-section';
  addText(wrap, 'h4', '', 'Editar disponibilidad');

  const form = document.createElement('form');
  form.className = 'availability-form';
  form.dataset.block = block.block;

  const dateField = (label, value) => {
    const field = document.createElement('label');
    field.className = 'field';
    addText(field, 'span', '', label);
    const input = document.createElement('input');
    input.type = 'date';
    input.value = value || '';
    field.append(input);
    return field;
  };

  form.append(dateField('Fecha 1', block.date1), dateField('Fecha 2', block.date2));

  const times = document.createElement('div');
  times.className = 'times';
  (block.times || ['09:00', '10:30', '12:00', '15:30']).forEach((time, index) => {
    const field = document.createElement('label');
    field.className = 'field';
    addText(field, 'span', '', `Hora ${index + 1}`);
    const input = document.createElement('input');
    input.type = 'time';
    input.step = '300';
    input.value = time || '';
    field.append(input);
    times.append(field);
  });
  form.append(times);

  const save = document.createElement('button');
  save.className = 'save';
  save.type = 'submit';
  save.textContent = 'Guardar disponibilidad';
  form.append(save);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const inputs = [...form.querySelectorAll('input')];
    const [date1, date2, ...timeInputs] = inputs;
    save.disabled = true;
    save.textContent = 'Guardando…';
    setStatus('');
    try {
      await callApi('updateAvailability', {
        block: block.block,
        date1: date1.value,
        date2: date2.value,
        times: timeInputs.map((input) => input.value),
      });
      setStatus(`Disponibilidad de ${block.label || block.block} actualizada.`);
      await loadDashboard();
    } catch (error) {
      setStatus(error.message === 'UNAUTHORIZED' ? 'La sesión ha caducado.' : `No se pudo guardar: ${error.message}`, true);
      if (error.message === 'UNAUTHORIZED') {
        sessionStorage.removeItem(STORAGE_KEY);
        adminKey = '';
        showLogin('Vuelve a introducir la clave.');
      }
    } finally {
      save.disabled = false;
      save.textContent = 'Guardar disponibilidad';
    }
  });

  wrap.append(form);
  return wrap;
}

function blockCard(block, openBlocks) {
  const details = document.createElement('details');
  details.className = 'block';
  details.dataset.block = block.block;
  details.open = openBlocks.has(block.block);

  const summary = document.createElement('summary');
  summary.className = 'block-summary';

  const left = document.createElement('div');
  left.className = 'block-main';
  addText(left, 'h3', '', block.label || block.block);
  addText(left, 'div', 'block-meta', `${block.visits} visita${block.visits === 1 ? '' : 's'} · ${block.pending} pendiente${block.pending === 1 ? '' : 's'} · ${block.free} libre${block.free === 1 ? '' : 's'} · ${block.reserved} reservada${block.reserved === 1 ? '' : 's'}`);
  if (block.date1 && block.date2) addText(left, 'div', 'block-dates', `${fmtDate(block.date1)} · ${fmtDate(block.date2)}`);

  const right = document.createElement('div');
  right.className = 'block-summary-right';
  if (block.conflicts?.length) addText(right, 'span', 'warning-badge', `${block.conflicts.length} solapamiento${block.conflicts.length === 1 ? '' : 's'}`);
  const badge = addText(right, 'span', `badge${block.date1 && block.date2 ? '' : ' off'}`, block.date1 && block.date2 ? 'ACTIVO' : 'SIN CONFIGURAR');
  badge.setAttribute('aria-hidden', 'true');
  addText(right, 'span', 'chevron', '⌄');

  summary.append(left, right);
  details.append(summary);

  const body = document.createElement('div');
  body.className = 'block-body';
  renderConflicts(block, body);
  renderAvailabilityDetail(block, body);
  renderClients(block, body);
  body.append(availabilityForm(block));
  details.append(body);

  return details;
}

function renderBlocks(blocks) {
  const openBlocks = new Set([...blocksEl.querySelectorAll('details[open]')].map((item) => item.dataset.block));
  blockLabels = Object.fromEntries(blocks.map((block) => [block.block, block.label || block.block]));
  blocksEl.replaceChildren();
  blocks.forEach((block) => blocksEl.append(blockCard(block, openBlocks)));
}

function renderAppointments(items) {
  appointmentsEl.replaceChildren();
  if (!items.length) {
    addText(appointmentsEl, 'div', 'empty', 'Todavía no hay citas confirmadas.');
    return;
  }

  items.forEach((appointment) => {
    const row = document.createElement('article');
    row.className = 'appointment';
    const values = [
      ['date', fmtDate(appointment.date)],
      ['time', appointment.time],
      ['client', appointment.name],
      ['city', appointment.city],
      ['address', appointment.address],
      ['sa', appointment.sas.join(' · ')],
    ];
    values.forEach(([className, text]) => {
      const el = className === 'client' ? document.createElement('strong') : document.createElement('span');
      el.className = className;
      el.textContent = text || '—';
      row.append(el);
    });
    appointmentsEl.append(row);
  });
}

async function loadDashboard() {
  setStatus('');
  const data = await callApi('snapshot');
  showApp();
  renderSummary(data.summary);
  renderBlocks(data.blocks);
  renderAppointments(data.appointments);
}

formEl.addEventListener('submit', async (event) => {
  event.preventDefault();
  adminKey = passwordEl.value.trim();
  loginErrorEl.hidden = true;
  try {
    await loadDashboard();
    sessionStorage.setItem(STORAGE_KEY, adminKey);
    passwordEl.value = '';
  } catch (error) {
    adminKey = '';
    sessionStorage.removeItem(STORAGE_KEY);
    showLogin(error.message === 'UNAUTHORIZED' ? 'Clave incorrecta.' : 'No se pudo cargar el panel.');
  }
});

$('#refresh').addEventListener('click', () => loadDashboard().catch((error) => setStatus(`No se pudo actualizar: ${error.message}`, true)));
$('#logout').addEventListener('click', () => {
  adminKey = '';
  sessionStorage.removeItem(STORAGE_KEY);
  showLogin();
});

$('#changePassword').addEventListener('click', () => {
  passwordErrorEl.hidden = true;
  passwordErrorEl.textContent = '';
  newPasswordEl.value = '';
  newPasswordConfirmEl.value = '';
  passwordDialog.showModal();
  newPasswordEl.focus();
});
$('#cancelPassword').addEventListener('click', () => passwordDialog.close());
passwordDialog.addEventListener('click', (event) => {
  if (event.target === passwordDialog) passwordDialog.close();
});
passwordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  passwordErrorEl.hidden = true;
  const next = newPasswordEl.value.trim();
  const confirm = newPasswordConfirmEl.value.trim();
  if (next.length < 12) {
    passwordErrorEl.textContent = 'Usa al menos 12 caracteres.';
    passwordErrorEl.hidden = false;
    return;
  }
  if (next !== confirm) {
    passwordErrorEl.textContent = 'Las contraseñas no coinciden.';
    passwordErrorEl.hidden = false;
    return;
  }

  savePasswordEl.disabled = true;
  savePasswordEl.textContent = 'Guardando…';
  try {
    await callApi('changePassword', { newKey: next });
    adminKey = next;
    sessionStorage.setItem(STORAGE_KEY, adminKey);
    passwordDialog.close();
    setStatus('Contraseña actualizada correctamente.');
  } catch (error) {
    passwordErrorEl.textContent = error.message === 'UNAUTHORIZED' ? 'La sesión ha caducado.' : `No se pudo cambiar la contraseña: ${error.message}`;
    passwordErrorEl.hidden = false;
    if (error.message === 'UNAUTHORIZED') {
      adminKey = '';
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } finally {
    savePasswordEl.disabled = false;
    savePasswordEl.textContent = 'Guardar contraseña';
  }
});

if (adminKey) {
  loadDashboard().catch(() => {
    adminKey = '';
    sessionStorage.removeItem(STORAGE_KEY);
    showLogin('Vuelve a introducir la clave.');
  });
} else {
  showLogin();
}
