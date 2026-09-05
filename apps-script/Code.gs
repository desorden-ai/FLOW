const CFG = {
  CLIENT_SHEET: 'cita',
  SLOT_SHEET: 'FRANJAS',
  TZ: 'Europe/Madrid',
  PUBLIC_BASE_URL: 'https://cita.desorden.cat',
};

const ORIGINAL_CLIENT_HEADERS = [
  'SA', 'WO', 'FECHA_TRABAJO', 'TIPO', 'CLIENTE', 'TELEFONO', 'DIRECCION',
  'POBLACION', 'ESTADO_PENDIENTE', 'FALTA', 'DRIVE_FOLDER_URL', 'PDF_URL',
  'PHOTO_COUNT', 'SERVICEPRO_URL', 'ULTIMA_REVISION', 'CERRADO', 'FECHA_CIERRE',
];

const BOOKING_HEADERS = [
  'CLIENTE_ID', 'BLOQUE', 'TOKEN', 'ESTADO_CITA',
  'CITA_FECHA', 'CITA_HORA', 'CONFIRMADO_EN', 'URL_CITA',
];

const SLOT_HEADERS = [
  'ID', 'BLOQUE', 'FECHA', 'HORA', 'ESTADO', 'CLIENTE_ID', 'CONFIRMADO_EN',
];

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || '');
    if (action !== 'availability') return json_({ ok: false, error: 'UNKNOWN_ACTION' });
    return json_(availability_(e.parameter.token));
  } catch (error) {
    console.error(error);
    return json_({ ok: false, error: 'SERVER_ERROR' });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (payload.action !== 'book') return json_({ ok: false, error: 'UNKNOWN_ACTION' });
    return json_(book_(payload.token, payload.slotId));
  } catch (error) {
    console.error(error);
    return json_({ ok: false, error: 'SERVER_ERROR' });
  }
}

/**
 * One-time/idempotent setup. Preserves the original 17 columns in `cita`,
 * appends booking metadata when missing, and creates FRANJAS when needed.
 */
function setupCitaV1() {
  const spreadsheet = getSpreadsheet_();
  const clientSheet = spreadsheet.getSheetByName(CFG.CLIENT_SHEET);
  if (!clientSheet) throw new Error('Missing sheet: ' + CFG.CLIENT_SHEET);

  ensureHeaders_(clientSheet, ORIGINAL_CLIENT_HEADERS.concat(BOOKING_HEADERS));

  let slotSheet = spreadsheet.getSheetByName(CFG.SLOT_SHEET);
  if (!slotSheet) slotSheet = spreadsheet.insertSheet(CFG.SLOT_SHEET);
  ensureHeaders_(slotSheet, SLOT_HEADERS);

  clientSheet.setFrozenRows(1);
  slotSheet.setFrozenRows(1);
  formatHeader_(clientSheet, ORIGINAL_CLIENT_HEADERS.length + BOOKING_HEADERS.length);
  formatHeader_(slotSheet, SLOT_HEADERS.length);

  return {
    clientSheet: CFG.CLIENT_SHEET,
    slotSheet: CFG.SLOT_SHEET,
    bookingColumns: BOOKING_HEADERS.slice(),
  };
}

/**
 * Generates opaque IDs/tokens and public URLs for every row that has CLIENTE.
 * Safe to run repeatedly: existing values are preserved.
 */
function syncClientMetadata() {
  setupCitaV1();

  const sheet = getSpreadsheet_().getSheetByName(CFG.CLIENT_SHEET);
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return { updated: 0, totalClients: 0 };

  const headers = header_(values[0]);
  let updated = 0;
  let totalClients = 0;

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const name = value_(row, headers, 'CLIENTE');
    if (!name) continue;
    totalClients += 1;

    let clientId = value_(row, headers, 'CLIENTE_ID');
    let token = value_(row, headers, 'TOKEN');
    let status = value_(row, headers, 'ESTADO_CITA');
    let changed = false;

    if (!clientId) {
      clientId = 'CLI-' + randomHex_(12);
      sheet.getRange(rowIndex + 1, headers.CLIENTE_ID + 1).setValue(clientId);
      changed = true;
    }

    if (!token) {
      token = randomToken_();
      sheet.getRange(rowIndex + 1, headers.TOKEN + 1).setValue(token);
      changed = true;
    }

    if (!status) {
      status = 'PENDIENTE';
      sheet.getRange(rowIndex + 1, headers.ESTADO_CITA + 1).setValue(status);
      changed = true;
    }

    const url = buildBookingUrl_(token);
    if (value_(row, headers, 'URL_CITA') !== url) {
      sheet.getRange(rowIndex + 1, headers.URL_CITA + 1).setValue(url);
      changed = true;
    }

    if (changed) updated += 1;
  }

  SpreadsheetApp.flush();
  return { updated: updated, totalClients: totalClients };
}

/**
 * Assign a block to one data row (row 1 is the header). Also ensures metadata.
 */
function assignBlockByRow(rowNumber, block) {
  setupCitaV1();
  const row = Number(rowNumber);
  const normalizedBlock = String(block || '').trim();
  if (!Number.isInteger(row) || row < 2) throw new Error('rowNumber must be >= 2');
  if (!normalizedBlock) throw new Error('block is required');

  const sheet = getSpreadsheet_().getSheetByName(CFG.CLIENT_SHEET);
  const headers = header_(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0]);
  sheet.getRange(row, headers.BLOQUE + 1).setValue(normalizedBlock);
  syncClientMetadata();
  return { row: row, block: normalizedBlock };
}

/**
 * Creates exactly 2 days × 4 times = 8 slots for a new block.
 * Example:
 * createBlockSlots('BLK-MARTORELL-01','2026-09-10','2026-09-12','09:00,10:30,12:00,15:30')
 */
function createBlockSlots(block, date1, date2, timesCsv) {
  setupCitaV1();

  const normalizedBlock = String(block || '').trim();
  const dates = [normalizeDate_(date1), normalizeDate_(date2)];
  const times = String(timesCsv || '09:00,10:30,12:00,15:30')
    .split(',')
    .map(function (value) { return value.trim(); })
    .filter(Boolean);

  if (!normalizedBlock) throw new Error('block is required');
  if (!dates[0] || !dates[1] || dates[0] === dates[1]) throw new Error('Two distinct dates are required');
  if (times.length !== 4) throw new Error('Exactly four times are required');
  times.forEach(function (time) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Invalid time: ' + time);
  });

  const sheet = getSpreadsheet_().getSheetByName(CFG.SLOT_SHEET);
  const values = sheet.getDataRange().getDisplayValues();
  const headers = header_(values[0]);
  const existing = values.slice(1).some(function (row) {
    return value_(row, headers, 'BLOQUE') === normalizedBlock;
  });
  if (existing) throw new Error('Block already has slots: ' + normalizedBlock);

  const rows = [];
  dates.forEach(function (date) {
    times.forEach(function (time) {
      rows.push([
        'SLT-' + randomHex_(12), normalizedBlock, date, time,
        'LIBRE', '', '',
      ]);
    });
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, SLOT_HEADERS.length).setValues(rows);
  SpreadsheetApp.flush();
  return { block: normalizedBlock, slotsCreated: rows.length, dates: dates, times: times };
}

function availability_(token) {
  const client = getClientByToken_(token);
  if (!client) return { ok: false, error: 'INVALID_TOKEN' };
  if (!client.block) return { ok: false, error: 'CLIENT_NOT_READY' };

  if (client.bookingStatus === 'CONFIRMADO') {
    return {
      ok: true,
      client: publicClient_(client),
      booking: bookingFromClient_(client),
      slots: [],
    };
  }

  const slots = getSlots_()
    .filter(function (slot) {
      return slot.block === client.block && slot.status === 'LIBRE';
    })
    .sort(compareSlots_)
    .map(function (slot) {
      return { id: slot.id, date: slot.date, time: slot.time };
    });

  return {
    ok: true,
    client: publicClient_(client),
    booking: null,
    slots: slots,
  };
}

function book_(token, slotId) {
  const normalizedToken = String(token || '').trim();
  const normalizedSlotId = String(slotId || '').trim();
  if (!normalizedToken) return { ok: false, error: 'INVALID_TOKEN' };
  if (!normalizedSlotId) return { ok: false, error: 'INVALID_SLOT' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    // Re-read all mutable state only after the lock has been acquired.
    const client = getClientByToken_(normalizedToken);
    if (!client) return { ok: false, error: 'INVALID_TOKEN' };
    if (!client.block) return { ok: false, error: 'CLIENT_NOT_READY' };

    if (client.bookingStatus === 'CONFIRMADO') {
      return {
        ok: false,
        error: 'ALREADY_BOOKED',
        booking: bookingFromClient_(client),
      };
    }

    const spreadsheet = getSpreadsheet_();
    const slotSheet = spreadsheet.getSheetByName(CFG.SLOT_SHEET);
    if (!slotSheet) throw new Error('Missing ' + CFG.SLOT_SHEET);

    const slotValues = slotSheet.getDataRange().getDisplayValues();
    const slotHeaders = header_(slotValues[0]);
    let slotRowIndex = -1;

    for (let index = 1; index < slotValues.length; index += 1) {
      if (value_(slotValues[index], slotHeaders, 'ID') === normalizedSlotId) {
        slotRowIndex = index;
        break;
      }
    }

    if (slotRowIndex === -1) return { ok: false, error: 'SLOT_NOT_FOUND' };

    const slotRow = slotValues[slotRowIndex];
    if (value_(slotRow, slotHeaders, 'BLOQUE') !== client.block) {
      return { ok: false, error: 'INVALID_SLOT' };
    }
    if (value_(slotRow, slotHeaders, 'ESTADO') !== 'LIBRE') {
      return { ok: false, error: 'SLOT_TAKEN' };
    }

    const confirmedAt = new Date();
    const booking = {
      date: value_(slotRow, slotHeaders, 'FECHA'),
      time: value_(slotRow, slotHeaders, 'HORA'),
      status: 'CONFIRMADO',
    };

    slotSheet.getRange(slotRowIndex + 1, slotHeaders.ESTADO + 1).setValue('CONFIRMADO');
    slotSheet.getRange(slotRowIndex + 1, slotHeaders.CLIENTE_ID + 1).setValue(client.id);
    slotSheet.getRange(slotRowIndex + 1, slotHeaders.CONFIRMADO_EN + 1)
      .setValue(confirmedAt)
      .setNumberFormat('yyyy-mm-dd hh:mm:ss');

    const clientSheet = spreadsheet.getSheetByName(CFG.CLIENT_SHEET);
    const clientHeaders = header_(clientSheet.getRange(1, 1, 1, clientSheet.getLastColumn()).getDisplayValues()[0]);
    clientSheet.getRange(client.rowNumber, clientHeaders.ESTADO_CITA + 1).setValue('CONFIRMADO');
    clientSheet.getRange(client.rowNumber, clientHeaders.CITA_FECHA + 1).setValue(booking.date);
    clientSheet.getRange(client.rowNumber, clientHeaders.CITA_HORA + 1).setValue(booking.time);
    clientSheet.getRange(client.rowNumber, clientHeaders.CONFIRMADO_EN + 1)
      .setValue(confirmedAt)
      .setNumberFormat('yyyy-mm-dd hh:mm:ss');

    SpreadsheetApp.flush();
    return { ok: true, booking: booking };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function getClientByToken_(token) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) return null;

  const sheet = getSpreadsheet_().getSheetByName(CFG.CLIENT_SHEET);
  if (!sheet) throw new Error('Missing ' + CFG.CLIENT_SHEET);

  const values = sheet.getDataRange().getDisplayValues();
  if (!values.length) return null;
  const headers = header_(values[0]);
  requireHeaders_(headers, ['CLIENTE', 'DIRECCION', 'POBLACION'].concat(BOOKING_HEADERS));

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    if (value_(row, headers, 'TOKEN') !== normalizedToken) continue;

    return {
      rowNumber: rowIndex + 1,
      id: value_(row, headers, 'CLIENTE_ID'),
      name: value_(row, headers, 'CLIENTE'),
      address: value_(row, headers, 'DIRECCION'),
      city: value_(row, headers, 'POBLACION'),
      block: value_(row, headers, 'BLOQUE'),
      bookingStatus: value_(row, headers, 'ESTADO_CITA'),
      bookingDate: value_(row, headers, 'CITA_FECHA'),
      bookingTime: value_(row, headers, 'CITA_HORA'),
    };
  }

  return null;
}

function getSlots_() {
  const sheet = getSpreadsheet_().getSheetByName(CFG.SLOT_SHEET);
  if (!sheet) throw new Error('Missing ' + CFG.SLOT_SHEET);

  const values = sheet.getDataRange().getDisplayValues();
  if (!values.length) return [];
  const headers = header_(values[0]);
  requireHeaders_(headers, SLOT_HEADERS);

  return values.slice(1)
    .filter(function (row) { return value_(row, headers, 'ID'); })
    .map(function (row) {
      return {
        id: value_(row, headers, 'ID'),
        block: value_(row, headers, 'BLOQUE'),
        date: value_(row, headers, 'FECHA'),
        time: value_(row, headers, 'HORA'),
        status: value_(row, headers, 'ESTADO'),
        clientId: value_(row, headers, 'CLIENTE_ID'),
      };
    });
}

function bookingFromClient_(client) {
  return {
    date: client.bookingDate,
    time: client.bookingTime,
    status: 'CONFIRMADO',
  };
}

function publicClient_(client) {
  return {
    name: client.name,
    address: client.address,
    city: client.city,
  };
}

function compareSlots_(a, b) {
  return (a.date + ' ' + a.time).localeCompare(b.date + ' ' + b.time);
}

function getSpreadsheet_() {
  const configuredId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (configuredId) return SpreadsheetApp.openById(configuredId);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('SPREADSHEET_ID_NOT_CONFIGURED');
  return active;
}

function ensureHeaders_(sheet, requiredHeaders) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const current = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const known = {};
  current.forEach(function (value) {
    const key = String(value || '').trim().toUpperCase();
    if (key) known[key] = true;
  });

  const missing = requiredHeaders.filter(function (header) { return !known[header]; });
  if (!missing.length) return;

  const startColumn = Math.max(sheet.getLastColumn(), 0) + 1;
  sheet.getRange(1, startColumn, 1, missing.length).setValues([missing]);
}

function formatHeader_(sheet, columnCount) {
  sheet.getRange(1, 1, 1, columnCount)
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#0c0c0c')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
}

function header_(row) {
  return row.reduce(function (map, key, index) {
    const normalized = String(key || '').trim().toUpperCase();
    if (normalized) map[normalized] = index;
    return map;
  }, {});
}

function requireHeaders_(headers, required) {
  const missing = required.filter(function (name) {
    return typeof headers[name] !== 'number';
  });
  if (missing.length) throw new Error('Missing headers: ' + missing.join(', '));
}

function value_(row, headers, name) {
  const index = headers[name];
  if (typeof index !== 'number') return '';
  return String(row[index] == null ? '' : row[index]).trim();
}

function normalizeDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, CFG.TZ, 'yyyy-MM-dd');
  }
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Date must be yyyy-MM-dd: ' + text);
  return text;
}

function randomToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

function randomHex_(length) {
  return (Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '')).slice(0, length);
}

function buildBookingUrl_(token) {
  const configured = PropertiesService.getScriptProperties().getProperty('PUBLIC_BASE_URL');
  const base = String(configured || CFG.PUBLIC_BASE_URL).replace(/\/$/, '');
  return base + '/?c=' + encodeURIComponent(token);
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
