const API_URL = '/api/admin';
const STORAGE_KEY = 'desorden_cita_admin_key';
const DEFAULT_TIMES = ['09:00', '10:30', '12:00', '15:30'];
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

const clientDialog = $('#clientDialog');
const clientForm = $('#clientForm');
const clientDialogTitle = $('#clientDialogTitle');
const clientNameEl = $('#clientName');
const clientPhoneEl = $('#clientPhone');
const clientAddressEl = $('#clientAddress');
const clientCityEl = $('#clientCity');
const clientBlockEl = $('#clientBlock');
const clientSasEl = $('#clientSas');
const clientSasHelpEl = $('#clientSasHelp');
const clientErrorEl = $('#clientError');
const saveClientEl = $('#saveClient');

let adminKey = sessionStorage.getItem(STORAGE_KEY) || '';
let blockLabels = {};
let blocksState = [];
let editingClient = null;
let limits = { maxDates: 8, maxTimesPerDate: 8, maxSasPerClient: 8 };

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

function addText(parent, tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text;
  parent.append(el);
  return el;
}

function button(text, className = '', type = 'button') {
  const el = document.createElement('button');
  el.type = type;
  el.className = className;
  el.textContent = text;
  return el;
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
  block.slots.forEach((slot) => { (groups[slot.date] ||= []).push(slot); });

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
  const copy = button('Copiar enlace', 'mini-action');
  copy.disabled = !url;
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
      copy.textContent = 'Copiado ✓';
      setTimeout(() => { copy.textContent = 'Copiar enlace'; }, 1500);
    } catch {
      setStatus('No se ha podido copiar el enlace.', true);
    }
  });
  return copy;
}

function populateBlockSelect(selectedBlock, locked = false) {
  clientBlockEl.replaceChildren();
  blocksState.forEach((block) => {
    const option = document.createElement('option');
    option.value = block.block;
    option.textContent = block.label || block.block;
    if (block.block === selectedBlock) option.selected = true;
    clientBlockEl.append(option);
  });
  clientBlockEl.disabled = locked;
}

function openClientDialog(blockName, client = null) {
  editingClient = client;
  clientErrorEl.hidden = true;
  clientErrorEl.textContent = '';

  clientDialogTitle.textContent = client ? 'Editar cliente' : 'Añadir cliente';
  clientNameEl.value = client?.name || '';
  clientPhoneEl.value = client?.phone || '';
  clientAddressEl.value = client?.address || '';
  clientCityEl.value = client?.city || (blockLabels[blockName] || '').replace(/\s·\sGrupo\s\d+$/, '');
  populateBlockSelect(client?.block || blockName, client?.status === 'CONFIRMADO');

  clientSasEl.value = (client?.sas || []).join(', ');
  clientSasEl.readOnly = Boolean(client);
  clientSasEl.disabled = Boolean(client);
  clientSasHelpEl.textContent = client
    ? 'Los SAs existentes se mantienen sin cambios para proteger las órdenes de servicio.'
    : `Opcional. Puedes indicar hasta ${limits.maxSasPerClient} SAs separados por comas.`;

  saveClientEl.textContent = client ? 'Guardar cambios' : 'Añadir cliente';
  clientDialog.showModal();
  clientNameEl.focus();
}

function clientErrorMessage(code) {
  const messages = {
    CLIENT_ALREADY_EXISTS: 'Ya existe una visita con los mismos datos de cliente, teléfono, dirección y población.',
    CLIENT_CONFIRMED_BLOCK_LOCKED: 'Este cliente tiene una cita confirmada y no puede moverse a otro bloque.',
    CLIENT_CONFIRMED_CANNOT_ARCHIVE: 'No se puede archivar un cliente con una cita confirmada.',
    CLIENT_NOT_FOUND: 'El cliente ya no existe o ha cambiado.',
    UNKNOWN_BLOCK: 'El bloque seleccionado ya no está disponible.',
    INVALID_CLIENT: 'Revisa nombre, dirección, población y bloque.',
    INVALID_SAS: 'Revisa los SAs indicados.',
  };
  return messages[code] || code;
}

async function archiveClient(client) {
  if (client.status === 'CONFIRMADO') {
    setStatus('No se puede archivar un cliente con una cita confirmada.', true);
    return;
  }
  const accepted = window.confirm(`¿Archivar a ${client.name}?\n\nDejará de aparecer como cliente activo, pero el registro histórico se conservará en la hoja.`);
  if (!accepted) return;

  setStatus('');
  try {
    await callApi('archiveClient', { clientId: client.id });
    setStatus(`${client.name} archivado. El histórico se conserva.`);
    await loadDashboard();
  } catch (error) {
    setStatus(`No se pudo archivar: ${clientErrorMessage(error.message)}`, true);
  }
}

function renderClients(block, parent) {
  const section = document.createElement('section');
  section.className = 'block-detail-section';
  const heading = document.createElement('div');
  heading.className = 'detail-heading client-heading';
  const headingLeft = document.createElement('div');
  headingLeft.className = 'client-heading-left';
  addText(headingLeft, 'h4', '', 'Clientes del bloque');
  addText(headingLeft, 'span', 'detail-count', String(block.clients?.length || 0));
  const addClient = button('+ Añadir cliente', 'mini-action client-add');
  addClient.addEventListener('click', () => openClientDialog(block.block));
  heading.append(headingLeft, addClient);
  section.append(heading);

  const list = document.createElement('div');
  list.className = 'client-list';
  (block.clients || []).forEach((client) => {
    client.block = block.block;
    const card = document.createElement('details');
    card.className = 'admin-client';
    card.dataset.clientId = client.id;
    card.open = window.matchMedia('(min-width: 900px)').matches;

    const top = document.createElement('summary');
    top.className = 'client-top';
    const identity = document.createElement('div');
    addText(identity, 'strong', '', client.name || 'Cliente');
    addText(identity, 'span', 'client-address', [client.address, client.city].filter(Boolean).join(' · '));
    const state = addText(top, 'span', `client-state ${client.status === 'CONFIRMADO' ? 'confirmed' : ''}`, client.status === 'CONFIRMADO' ? 'CONFIRMADO' : 'PENDIENTE');
    state.setAttribute('aria-label', `Estado ${state.textContent}`);
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
      whats.dataset.clientId = client.id;
      whats.href = `https://wa.me/${digits(client.phone)}`;
      whats.target = '_blank';
      whats.rel = 'noopener noreferrer';
      whats.textContent = 'WhatsApp';
      actions.append(whats);
    }
    actions.append(copyButton(client.bookingUrl));

    const edit = button('Editar', 'mini-action');
    edit.addEventListener('click', () => openClientDialog(block.block, client));
    actions.append(edit);
    const regenerate = button('Regenerar enlace', 'mini-action');
    regenerate.addEventListener('click', async () => {
      if (!window.confirm('¿Regenerar el enlace? El anterior dejará de funcionar. La cita y el histórico se conservarán.')) return;
      regenerate.disabled = true;
      try { applySnapshot(await callApi('regenerateBookingToken', { clientId:client.id })); setStatus('Enlace regenerado. El anterior ha quedado revocado.'); }
      catch (error) { setStatus(clientErrorMessage(error.message), true); }
      finally { regenerate.disabled = false; }
    });
    actions.append(regenerate);

    const archive = button('Archivar', 'mini-action archive-action');
    archive.disabled = client.status === 'CONFIRMADO';
    archive.title = archive.disabled ? 'Una cita confirmada no se puede archivar.' : 'Quitar del panel conservando el histórico.';
    archive.addEventListener('click', () => archiveClient(client));
    actions.append(archive);

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
  addText(wrap, 'p', 'schedule-help', `Puedes configurar hasta ${limits.maxDates} fechas y hasta ${limits.maxTimesPerDate} horas distintas en cada fecha.`);

  const form = document.createElement('form');
  form.className = 'availability-form schedule-form';
  form.dataset.block = block.block;

  const editor = document.createElement('div');
  editor.className = 'schedule-editor';
  form.append(editor);

  const addDate = button('+ Añadir fecha', 'schedule-add-date');
  const save = button('Guardar disponibilidad', 'save', 'submit');
  const footer = document.createElement('div');
  footer.className = 'schedule-footer';
  footer.append(addDate, save);
  form.append(footer);

  function refreshControls() {
    const dayEls = [...editor.querySelectorAll('.schedule-day-editor')];
    dayEls.forEach((dayEl, index) => {
      dayEl.querySelector('.schedule-day-number').textContent = `Fecha ${index + 1}`;
      const removeDate = dayEl.querySelector('.remove-date');
      removeDate.disabled = dayEls.length <= 1;
      const timeRows = [...dayEl.querySelectorAll('.schedule-time')];
      dayEl.querySelector('.add-time').disabled = timeRows.length >= limits.maxTimesPerDate;
      timeRows.forEach((row) => { row.querySelector('.remove-time').disabled = timeRows.length <= 1; });
    });
    addDate.disabled = dayEls.length >= limits.maxDates;
  }

  function addTime(dayEl, value = '') {
    const times = dayEl.querySelector('.schedule-times-editor');
    if (times.querySelectorAll('.schedule-time').length >= limits.maxTimesPerDate) return;

    const row = document.createElement('div');
    row.className = 'schedule-time';
    const input = document.createElement('input');
    input.type = 'time';
    input.step = '300';
    input.required = true;
    input.value = value;
    input.setAttribute('aria-label', 'Hora disponible');
    const remove = button('×', 'schedule-icon remove-time');
    remove.title = 'Eliminar hora';
    remove.addEventListener('click', () => {
      row.remove();
      refreshControls();
    });
    row.append(input, remove);
    times.append(row);
    refreshControls();
  }

  function addDay(data = {}) {
    if (editor.querySelectorAll('.schedule-day-editor').length >= limits.maxDates) return;

    const day = document.createElement('article');
    day.className = 'schedule-day-editor';

    const head = document.createElement('div');
    head.className = 'schedule-day-head';
    const title = addText(head, 'strong', 'schedule-day-number', 'Fecha');
    title.setAttribute('aria-hidden', 'true');
    const removeDate = button('Eliminar fecha', 'schedule-remove-date remove-date');
    removeDate.addEventListener('click', () => {
      day.remove();
      refreshControls();
    });
    head.append(removeDate);
    day.append(head);

    const dateField = document.createElement('label');
    dateField.className = 'schedule-date-field';
    addText(dateField, 'span', '', 'Día');
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.required = true;
    dateInput.value = data.date || '';
    dateField.append(dateInput);
    day.append(dateField);

    const timesHeading = document.createElement('div');
    timesHeading.className = 'schedule-times-head';
    addText(timesHeading, 'span', '', 'Horas disponibles para esta fecha');
    const addHour = button('+ hora', 'add-time');
    addHour.addEventListener('click', () => addTime(day, ''));
    timesHeading.append(addHour);
    day.append(timesHeading);

    const times = document.createElement('div');
    times.className = 'schedule-times-editor';
    day.append(times);

    editor.append(day);
    const initialTimes = Array.isArray(data.times) && data.times.length ? data.times : DEFAULT_TIMES;
    initialTimes.slice(0, limits.maxTimesPerDate).forEach((time) => addTime(day, time));
    refreshControls();
  }

  const initialSchedule = Array.isArray(block.schedule) && block.schedule.length
    ? block.schedule
    : [{ date: '', times: DEFAULT_TIMES }];
  initialSchedule.slice(0, limits.maxDates).forEach((day) => addDay(day));
  addDate.addEventListener('click', () => addDay({ date: '', times: DEFAULT_TIMES }));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const dayEls = [...editor.querySelectorAll('.schedule-day-editor')];
    const days = dayEls.map((dayEl) => ({
      date: dayEl.querySelector('input[type="date"]').value,
      times: [...dayEl.querySelectorAll('.schedule-time input')].map((input) => input.value),
    }));

    if (new Set(days.map((day) => day.date)).size !== days.length) {
      setStatus('No puedes repetir la misma fecha dentro de un bloque.', true);
      return;
    }

    const duplicateTime = days.some((day) => new Set(day.times).size !== day.times.length);
    if (duplicateTime) {
      setStatus('Dentro de una misma fecha no puedes repetir una hora.', true);
      return;
    }

    save.disabled = true;
    save.textContent = 'Guardando…';
    setStatus('');
    try {
      await callApi('updateAvailability', { block: block.block, days });
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

  const schedule = block.schedule || [];
  if (schedule.length) {
    const visible = schedule.slice(0, 3).map((day) => fmtDate(day.date)).join(' · ');
    const extra = schedule.length > 3 ? ` · +${schedule.length - 3}` : '';
    const total = schedule.reduce((sum, day) => sum + (day.times?.length || 0), 0);
    addText(left, 'div', 'block-dates', `${visible}${extra} · ${total} hora${total === 1 ? '' : 's'}`);
  }

  const right = document.createElement('div');
  right.className = 'block-summary-right';
  if (block.conflicts?.length) addText(right, 'span', 'warning-badge', `${block.conflicts.length} solapamiento${block.conflicts.length === 1 ? '' : 's'}`);
  const active = schedule.length > 0;
  const badge = addText(right, 'span', `badge${active ? '' : ' off'}`, active ? 'ACTIVO' : 'SIN CONFIGURAR');
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
  blocksState = blocks;
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
  applySnapshot(await callApi('snapshot'));
}

function applySnapshot(data) {
  limits = {
    maxDates: Number(data.limits?.maxDates || 8),
    maxTimesPerDate: Number(data.limits?.maxTimesPerDate || 8),
    maxSasPerClient: Number(data.limits?.maxSasPerClient || 8),
  };
  showApp();
  renderSummary(data.summary);
  renderBlocks(data.blocks);
  renderAppointments(data.appointments);
}

clientForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clientErrorEl.hidden = true;

  const sas = editingClient
    ? []
    : clientSasEl.value.split(',').map((value) => value.trim()).filter(Boolean).slice(0, limits.maxSasPerClient);
  const client = {
    name: clientNameEl.value.trim(),
    phone: clientPhoneEl.value.trim(),
    address: clientAddressEl.value.trim(),
    city: clientCityEl.value.trim(),
    block: clientBlockEl.value,
    sas,
  };

  const wasEditing = Boolean(editingClient);
  const currentId = editingClient?.id || '';
  saveClientEl.disabled = true;
  saveClientEl.textContent = 'Guardando…';
  try {
    if (wasEditing) {
      await callApi('updateClient', { clientId: currentId, client });
      setStatus(`${client.name} actualizado.`);
    } else {
      await callApi('createClient', { client });
      setStatus(`${client.name} añadido al bloque.`);
    }
    clientDialog.close();
    editingClient = null;
    await loadDashboard();
  } catch (error) {
    clientErrorEl.textContent = clientErrorMessage(error.message);
    clientErrorEl.hidden = false;
  } finally {
    saveClientEl.disabled = false;
    saveClientEl.textContent = wasEditing ? 'Guardar cambios' : 'Añadir cliente';
  }
});

$('#cancelClient').addEventListener('click', () => {
  editingClient = null;
  clientDialog.close();
});
clientDialog.addEventListener('click', (event) => {
  if (event.target === clientDialog) {
    editingClient = null;
    clientDialog.close();
  }
});

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

const clientMedia = window.matchMedia('(min-width: 900px)');
clientMedia.addEventListener('change', event => document.querySelectorAll('details.admin-client').forEach(card => { card.open = event.matches; }));
const importDialog = $('#importDialog');
let importRows = [];
let importing = false;
function invalidatePreview() {
  importRows = []; $('#importPreview').replaceChildren(); $('#importCounts').textContent = '';
  $('#saveImport').disabled = true; $('#saveImport').textContent = 'Importar 0 clientes';
}
$('#importClients').addEventListener('click', () => {
  invalidatePreview(); $('#importText').value = ''; $('#importFile').value = ''; $('#importError').textContent = '';
  $('#importBlock').replaceChildren();
  blocksState.forEach(block => { const option = document.createElement('option'); option.value = block.block; option.textContent = block.label || block.block; $('#importBlock').append(option); });
  importDialog.showModal();
});
$('#cancelImport').addEventListener('click', () => { if (!importing) importDialog.close(); });
importDialog.addEventListener('cancel', event => { if (importing) event.preventDefault(); });
$('#importText').addEventListener('input', invalidatePreview);
$('#importBlock').addEventListener('change', invalidatePreview);
$('#importFile').addEventListener('change', async () => {
  invalidatePreview(); $('#importText').value = ''; $('#importError').textContent = '';
  const file = $('#importFile').files[0];
  if (!file) return;
  if (!/\.csv$/i.test(file.name) || file.size > 262144) { $('#importError').textContent = 'Selecciona un CSV de hasta 256 KB.'; return; }
  $('#previewImport').disabled = true;
  try { $('#importText').value = await file.text(); }
  catch { $('#importError').textContent = 'No se ha podido leer el archivo.'; }
  finally { $('#previewImport').disabled = false; }
});
$('#previewImport').addEventListener('click', () => {
  invalidatePreview(); $('#importError').textContent = '';
  try {
    importRows = CitaImport.preview($('#importText').value, blocksState, $('#importBlock').value);
    const valid = importRows.filter(row => row.status === 'VALID').length;
    const duplicate = importRows.filter(row => row.status === 'DUPLICATE').length;
    $('#importCounts').textContent = importRows.length + ' filas detectadas · ' + valid + ' válidas · ' + duplicate + ' duplicadas · ' + (importRows.length-valid-duplicate) + ' necesitan revisión';
    importRows.forEach(row => {
      const item = document.createElement('article'); item.className = 'import-row';
      addText(item, 'strong', '', row.status + ' · Fila ' + row.row + ' · ' + row.client.name);
      addText(item, 'p', '', [row.client.phone, row.client.address, row.client.city, row.client.block, row.client.sas.join(', ')].filter(Boolean).join(' · '));
      if (row.reason) addText(item, 'p', '', row.reason);
      $('#importPreview').append(item);
    });
    $('#saveImport').disabled = !valid; $('#saveImport').textContent = 'Importar ' + valid + ' clientes';
  } catch (error) { $('#importError').textContent = error.message; }
});
$('#saveImport').addEventListener('click', async () => {
  if (importing) return;
  const clients = importRows.filter(row => row.status === 'VALID').map(row => row.client);
  if (!clients.length) return;
  importing = true;
  const controls = [...importDialog.querySelectorAll('button,input,select,textarea')];
  controls.forEach(control => { control.disabled = true; });
  try {
    const data = await callApi('importClients', { clients });
    applySnapshot(data); importDialog.close();
    setStatus(data.import.created + ' clientes importados · ' + data.import.duplicates + ' duplicados · ' + data.import.invalid + ' inválidos.');
  } catch {
    $('#importError').textContent = 'No se ha podido confirmar el resultado. Actualiza el panel y revisa la vista previa antes de repetir la importación.';
  } finally {
    importing = false; controls.forEach(control => { control.disabled = false; }); invalidatePreview();
  }
});
