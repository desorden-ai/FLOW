const CFG = {
  CLIENT_SHEET: 'cita',
  SLOT_SHEET: 'FRANJAS',
  CONTROL_SHEET: 'CONTROL_CITAS',
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

const CONTROL_HEADERS = [
  'GENERAR', 'BLOQUE', 'POBLACION', 'VISITAS', 'SAs',
  'FECHA 1', 'FECHA 2', 'HORA 1', 'HORA 2', 'HORA 3', 'HORA 4',
  'FRANJAS', 'ESTADO',
];

const DEFAULT_SLOT_TIMES = ['09:00', '10:30', '12:00', '15:30'];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('DESORDEN CITA')
    .addItem('Abrir / actualizar panel', 'refreshControlDashboard')
    .addItem('Generar franjas seleccionadas', 'generateSelectedSlots')
    .addSeparator()
    .addItem('Sincronizar clientes', 'syncClientMetadata')
    .addToUi();
}

/**
 * One-time installer for standalone Apps Script projects. It makes the
 * GENERAR checkbox actionable even when a custom menu cannot be injected.
 */
function installControlDashboard() {
  const spreadsheet = getSpreadsheet_();
  const triggerExists = ScriptApp.getProjectTriggers().some(function (trigger) {
    return trigger.getHandlerFunction() === 'handleControlEdit';
  });

  if (!triggerExists) {
    ScriptApp.newTrigger('handleControlEdit')
      .forSpreadsheet(spreadsheet)
      .onEdit()
      .create();
  }

  const result = refreshControlDashboard();
  return { triggerCreated: !triggerExists, blocks: result.blocks, slots: result.slots };
}

function handleControlEdit(e) {
  if (!e || !e.range || String(e.value || '').toUpperCase() !== 'TRUE') return;
  const range = e.range;
  if (range.getSheet().getName() !== CFG.CONTROL_SHEET || range.getColumn() !== 1 || range.getRow() < 2) return;
  generateSelectedSlots();
}

function doGet() {
  return json_({ ok: false, error: 'METHOD_NOT_ALLOWED' });
}

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '{}';
    if (raw.length > 262144) return json_({ ok:false, error:'BAD_REQUEST' });
    const payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object') return json_({ ok:false, error:'BAD_REQUEST' });
    if (payload.action === 'availability') return json_(availability_(payload.token));
    if (payload.action === 'book') return json_(book_(payload.token, payload.slotId));
    if (payload.action === 'adminSnapshot') return json_(adminSnapshot_(payload.adminKey));
    if (payload.action === 'adminUpdateAvailability') return json_(adminUpdateAvailability_(payload));
    return json_({ ok: false, error: 'UNKNOWN_ACTION' });
  } catch (error) {
    const allowed = ['UNAUTHORIZED', 'INVALID_NEW_PASSWORD', 'INVALID_DATES', 'INVALID_TIMES', 'INVALID_TIME', 'UNKNOWN_BLOCK', 'ADMIN_DATA_NOT_READY'];
    return json_({ ok: false, error: allowed.indexOf(error.message) >= 0 ? error.message : 'SERVER_ERROR' });
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
 * Generates opaque IDs/tokens and public URLs for every booking unit.
 *
 * A booking unit is a physical visit, identified by the same
 * CLIENTE + TELEFONO + DIRECCION + POBLACION. Multiple SAs for that same
 * visit share CLIENTE_ID, TOKEN and booking state, so the household books once.
 *
 * Safe to run repeatedly: existing canonical values are preserved when possible.
 */
function syncClientMetadata() {
  setupCitaV1();

  const sheet = getSpreadsheet_().getSheetByName(CFG.CLIENT_SHEET);
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return { updated: 0, totalClients: 0, totalRows: 0 };

  const headers = header_(values[0]);
  requireHeaders_(headers, [
    'CLIENTE', 'TELEFONO', 'DIRECCION', 'POBLACION',
    'CLIENTE_ID', 'BLOQUE', 'TOKEN', 'ESTADO_CITA',
    'CITA_FECHA', 'CITA_HORA', 'CONFIRMADO_EN', 'URL_CITA',
  ]);

  const units = {};
  const orderedKeys = [];
  let totalRows = 0;

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const name = value_(row, headers, 'CLIENTE');
    if (!name || value_(row, headers, 'ESTADO_CITA') === 'ARCHIVADO') continue;
    totalRows += 1;

    const key = bookingUnitKey_(row, headers);
    if (!units[key]) {
      units[key] = {
        rowIndexes: [],
        clientId: '',
        token: '',
        status: '',
        bookingDate: '',
        bookingTime: '',
        confirmedAt: '',
        blocks: {},
      };
      orderedKeys.push(key);
    }

    const unit = units[key];
    unit.rowIndexes.push(rowIndex);

    const existingClientId = value_(row, headers, 'CLIENTE_ID');
    const existingToken = value_(row, headers, 'TOKEN');
    const existingStatus = value_(row, headers, 'ESTADO_CITA');
    const existingBlock = value_(row, headers, 'BLOQUE');

    if (!unit.clientId && existingClientId) unit.clientId = existingClientId;
    if (!unit.token && existingToken) unit.token = existingToken;
    if (existingBlock) unit.blocks[existingBlock] = true;

    if (existingStatus === 'CONFIRMADO') {
      unit.status = 'CONFIRMADO';
      if (!unit.bookingDate) unit.bookingDate = value_(row, headers, 'CITA_FECHA');
      if (!unit.bookingTime) unit.bookingTime = value_(row, headers, 'CITA_HORA');
      if (!unit.confirmedAt) unit.confirmedAt = value_(row, headers, 'CONFIRMADO_EN');
    } else if (!unit.status && existingStatus) {
      unit.status = existingStatus;
    }
  }

  let updated = 0;

  orderedKeys.forEach(function (key) {
    const unit = units[key];
    const blockNames = Object.keys(unit.blocks);
    if (blockNames.length > 1) {
      throw new Error('Booking unit spans multiple blocks: ' + blockNames.join(', '));
    }

    if (!unit.clientId) unit.clientId = 'CLI-' + randomHex_(12);
    if (!unit.token) unit.token = randomToken_();
    if (!unit.status) unit.status = 'PENDIENTE';

    const url = buildBookingUrl_(unit.token);

    unit.rowIndexes.forEach(function (rowIndex) {
      const row = values[rowIndex];
      let changed = false;

      changed = setCellIfDifferent_(
        sheet, rowIndex + 1, headers.CLIENTE_ID + 1,
        value_(row, headers, 'CLIENTE_ID'), unit.clientId
      ) || changed;
      changed = setCellIfDifferent_(
        sheet, rowIndex + 1, headers.TOKEN + 1,
        value_(row, headers, 'TOKEN'), unit.token
      ) || changed;
      changed = setCellIfDifferent_(
        sheet, rowIndex + 1, headers.ESTADO_CITA + 1,
        value_(row, headers, 'ESTADO_CITA'), unit.status
      ) || changed;
      changed = setCellIfDifferent_(
        sheet, rowIndex + 1, headers.URL_CITA + 1,
        value_(row, headers, 'URL_CITA'), url
      ) || changed;

      if (unit.status === 'CONFIRMADO') {
        changed = setCellIfDifferent_(
          sheet, rowIndex + 1, headers.CITA_FECHA + 1,
          value_(row, headers, 'CITA_FECHA'), unit.bookingDate
        ) || changed;
        changed = setCellIfDifferent_(
          sheet, rowIndex + 1, headers.CITA_HORA + 1,
          value_(row, headers, 'CITA_HORA'), unit.bookingTime
        ) || changed;
        if (unit.confirmedAt) {
          changed = setCellIfDifferent_(
            sheet, rowIndex + 1, headers.CONFIRMADO_EN + 1,
            value_(row, headers, 'CONFIRMADO_EN'), unit.confirmedAt
          ) || changed;
        }
      }

      if (changed) updated += 1;
    });
  });

  SpreadsheetApp.flush();
  return {
    updated: updated,
    totalClients: orderedKeys.length,
    totalRows: totalRows,
  };
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

/**
 * Builds the visual administration tab from the canonical client and slot data.
 * Existing dates, times and selections are preserved by block.
 */
function refreshControlDashboard() {
  syncClientMetadata();

  const spreadsheet = getSpreadsheet_();
  const clientSheet = spreadsheet.getSheetByName(CFG.CLIENT_SHEET);
  const clientValues = clientSheet.getDataRange().getDisplayValues();
  const clientHeaders = header_(clientValues[0]);
  requireHeaders_(clientHeaders, [
    'SA', 'CLIENTE', 'TELEFONO', 'DIRECCION', 'POBLACION', 'BLOQUE',
  ]);

  let controlSheet = spreadsheet.getSheetByName(CFG.CONTROL_SHEET);
  if (!controlSheet) controlSheet = spreadsheet.insertSheet(CFG.CONTROL_SHEET, 0);

  const preserved = readControlConfiguration_(controlSheet);
  const blocks = {};

  clientValues.slice(1).forEach(function (row) {
    const block = value_(row, clientHeaders, 'BLOQUE');
    if (!block || !value_(row, clientHeaders, 'CLIENTE')) return;

    if (!blocks[block]) {
      blocks[block] = { cities: {}, visits: {}, sas: {} };
    }

    const city = value_(row, clientHeaders, 'POBLACION');
    const sa = value_(row, clientHeaders, 'SA');
    if (city) blocks[block].cities[city] = true;
    if (sa) blocks[block].sas[sa] = true;
    blocks[block].visits[bookingUnitKey_(row, clientHeaders)] = true;
  });

  const slotCounts = {};
  getSlots_().forEach(function (slot) {
    slotCounts[slot.block] = (slotCounts[slot.block] || 0) + 1;
  });

  const rows = Object.keys(blocks).sort().map(function (block) {
    const existing = preserved[block] || {};
    const datesReady = Boolean(existing.date1 && existing.date2);
    const slotCount = slotCounts[block] || 0;
    const status = slotCount
      ? 'GENERADO'
      : (datesReady ? 'LISTO' : 'FALTAN FECHAS');

    return [
      slotCount ? false : Boolean(existing.selected),
      block,
      Object.keys(blocks[block].cities).sort().join(' / '),
      Object.keys(blocks[block].visits).length,
      Object.keys(blocks[block].sas).length,
      existing.date1 || '',
      existing.date2 || '',
      existing.times && existing.times[0] || DEFAULT_SLOT_TIMES[0],
      existing.times && existing.times[1] || DEFAULT_SLOT_TIMES[1],
      existing.times && existing.times[2] || DEFAULT_SLOT_TIMES[2],
      existing.times && existing.times[3] || DEFAULT_SLOT_TIMES[3],
      slotCount,
      status,
    ];
  });

  controlSheet.clear();
  controlSheet.getRange(1, 1, 1, CONTROL_HEADERS.length).setValues([CONTROL_HEADERS]);
  if (rows.length) {
    controlSheet.getRange(2, 1, rows.length, CONTROL_HEADERS.length).setValues(rows);
    controlSheet.getRange(2, 1, rows.length, 1).insertCheckboxes();
    controlSheet.getRange(2, 6, rows.length, 2)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build())
      .setNumberFormat('yyyy-mm-dd');
    controlSheet.getRange(2, 8, rows.length, 4).setNumberFormat('@');
  }

  formatControlDashboard_(controlSheet, rows.length);
  spreadsheet.setActiveSheet(controlSheet);
  SpreadsheetApp.flush();
  return { blocks: rows.length, slots: Object.keys(slotCounts).length };
}

/**
 * Generates 2 days x 4 times for every checked block in CONTROL_CITAS.
 * Existing block slots are never overwritten or duplicated.
 */
function generateSelectedSlots() {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(CFG.CONTROL_SHEET);
  if (!sheet) throw new Error('Run refreshControlDashboard first');

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { created: 0, skipped: 0, errors: [] };

  const existingBlocks = {};
  getSlots_().forEach(function (slot) { existingBlocks[slot.block] = true; });

  let created = 0;
  let skipped = 0;
  const errors = [];

  values.slice(1).forEach(function (row, index) {
    if (row[0] !== true) return;

    const rowNumber = index + 2;
    const block = String(row[1] || '').trim();
    if (existingBlocks[block]) {
      skipped += 1;
      return;
    }

    try {
      const date1 = normalizeDate_(row[5]);
      const date2 = normalizeDate_(row[6]);
      const times = row.slice(7, 11).map(normalizeTime_);
      createBlockSlots(block, date1, date2, times.join(','));
      existingBlocks[block] = true;
      created += 1;
    } catch (error) {
      sheet.getRange(rowNumber, 1).setValue(false);
      errors.push({
        row: rowNumber,
        block: block,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  refreshControlDashboard();
  const message = errors.length
    ? 'Generados: ' + created + ' · Omitidos: ' + skipped + ' · Errores: ' + errors.length
    : 'Generados: ' + created + ' · Omitidos: ' + skipped;
  spreadsheet.toast(message, 'DESORDEN CITA', 8);
  return { created: created, skipped: skipped, errors: errors };
}

function readControlConfiguration_(sheet) {
  const result = {};
  if (sheet.getLastRow() < 2 || sheet.getLastColumn() < CONTROL_HEADERS.length) return result;

  sheet.getRange(2, 1, sheet.getLastRow() - 1, CONTROL_HEADERS.length)
    .getValues()
    .forEach(function (row) {
      const block = String(row[1] || '').trim();
      if (!block) return;
      result[block] = {
        selected: row[0] === true,
        date1: row[5] || '',
        date2: row[6] || '',
        times: row.slice(7, 11).map(function (value) { return String(value || '').trim(); }),
      };
    });
  return result;
}

function formatControlDashboard_(sheet, dataRowCount) {
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);
  sheet.setHiddenGridlines(true);
  sheet.setRowHeight(1, 42);
  sheet.getRange(1, 1, 1, CONTROL_HEADERS.length)
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#0c0c0c')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  if (dataRowCount) {
    const body = sheet.getRange(2, 1, dataRowCount, CONTROL_HEADERS.length);
    body.setVerticalAlignment('middle').setBackground('#ffffff');
    for (let row = 2; row <= dataRowCount + 1; row += 1) {
      if (row % 2 === 1) sheet.getRange(row, 1, 1, CONTROL_HEADERS.length).setBackground('#f8fafc');
      sheet.getRange(row, 1, 1, CONTROL_HEADERS.length).setBorder(
        false, false, true, false, false, false, '#e5e7eb', SpreadsheetApp.BorderStyle.SOLID
      );
    }
    sheet.setRowHeights(2, dataRowCount, 30);
    sheet.getRange(2, 1, dataRowCount, 1)
      .setHorizontalAlignment('center')
      .setBackground('#eef4ff');
    sheet.getRange(2, 4, dataRowCount, 2).setHorizontalAlignment('center');
    sheet.getRange(2, 6, dataRowCount, 6)
      .setHorizontalAlignment('center')
      .setBackground('#fff8dc');
    sheet.getRange(2, 12, dataRowCount, 1).setHorizontalAlignment('center');
    sheet.getRange(2, 13, dataRowCount, 1).setFontWeight('bold');

    const statusRange = sheet.getRange(2, 13, dataRowCount, 1);
    const rules = [
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('GENERADO').setBackground('#d9ead3').setFontColor('#176b2c')
        .setRanges([statusRange]).build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('LISTO').setBackground('#fff2cc').setFontColor('#7f6000')
        .setRanges([statusRange]).build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('FALTAN FECHAS').setBackground('#f3f4f6').setFontColor('#6b7280')
        .setRanges([statusRange]).build(),
    ];
    sheet.setConditionalFormatRules(rules);
  } else {
    sheet.setConditionalFormatRules([]);
  }

  sheet.setColumnWidth(1, 76);
  sheet.setColumnWidth(2, 205);
  sheet.setColumnWidth(3, 165);
  sheet.setColumnWidths(4, 2, 68);
  sheet.setColumnWidths(6, 2, 96);
  sheet.setColumnWidths(8, 4, 72);
  sheet.setColumnWidth(12, 70);
  sheet.setColumnWidth(13, 120);
  sheet.getRange('A1').setNote(
    'Completa las fechas y horas; después marca el bloque para generar sus 8 franjas.'
  );
}

function normalizeTime_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, CFG.TZ, 'HH:mm');
  }
  const text = String(value || '').trim();
  const match = /^(\d|[01]\d|2[0-3]):([0-5]\d)$/.exec(text);
  if (!match) throw new Error('Invalid time: ' + text);
  return ('0' + Number(match[1])).slice(-2) + ':' + match[2];
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
      return { slotId: slot.id, date: slot.date, time: slot.time };
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
  if (!/^[a-f0-9]{64}$/i.test(normalizedToken)) return { ok: false, error: 'INVALID_TOKEN' };
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
    const clientHeaders = header_(
      clientSheet.getRange(1, 1, 1, clientSheet.getLastColumn()).getDisplayValues()[0]
    );

    client.rowNumbers.forEach(function (rowNumber) {
      clientSheet.getRange(rowNumber, clientHeaders.ESTADO_CITA + 1).setValue('CONFIRMADO');
      clientSheet.getRange(rowNumber, clientHeaders.CITA_FECHA + 1).setValue(booking.date);
      clientSheet.getRange(rowNumber, clientHeaders.CITA_HORA + 1).setValue(booking.time);
      clientSheet.getRange(rowNumber, clientHeaders.CONFIRMADO_EN + 1)
        .setValue(confirmedAt)
        .setNumberFormat('yyyy-mm-dd hh:mm:ss');
    });

    SpreadsheetApp.flush();
    return { ok: true, booking: booking };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function getClientByToken_(token) {
  const normalizedToken = String(token || '').trim();
  if (!/^[a-f0-9]{64}$/i.test(normalizedToken)) return null;

  const sheet = getSpreadsheet_().getSheetByName(CFG.CLIENT_SHEET);
  if (!sheet) throw new Error('Missing ' + CFG.CLIENT_SHEET);

  const values = sheet.getDataRange().getDisplayValues();
  if (!values.length) return null;
  const headers = header_(values[0]);
  requireHeaders_(headers, [
    'SA', 'CLIENTE', 'DIRECCION', 'POBLACION',
    'CLIENTE_ID', 'BLOQUE', 'TOKEN', 'ESTADO_CITA',
    'CITA_FECHA', 'CITA_HORA',
  ]);

  let firstRowIndex = -1;
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (value_(values[rowIndex], headers, 'TOKEN') === normalizedToken) {
      firstRowIndex = rowIndex;
      break;
    }
  }
  if (firstRowIndex === -1) return null;

  const firstRow = values[firstRowIndex];
  const clientId = value_(firstRow, headers, 'CLIENTE_ID');
  if (!clientId) return null;
  const rowNumbers = [];
  const sas = [];
  const blocks = {};
  let bookingStatus = '';
  let bookingDate = '';
  let bookingTime = '';

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const sameClientId = clientId && value_(row, headers, 'CLIENTE_ID') === clientId;
    const sameToken = value_(row, headers, 'TOKEN') === normalizedToken;
    if (sameToken && !sameClientId) return null;
    if (!sameClientId) continue;
    if (!sameToken || value_(row, headers, 'ESTADO_CITA') === 'ARCHIVADO') return null;

    rowNumbers.push(rowIndex + 1);
    const sa = value_(row, headers, 'SA');
    if (sa) sas.push(sa);

    const block = value_(row, headers, 'BLOQUE');
    if (block) blocks[block] = true;

    if (value_(row, headers, 'ESTADO_CITA') === 'CONFIRMADO') {
      bookingStatus = 'CONFIRMADO';
      if (!bookingDate) bookingDate = value_(row, headers, 'CITA_FECHA');
      if (!bookingTime) bookingTime = value_(row, headers, 'CITA_HORA');
    } else if (!bookingStatus) {
      bookingStatus = value_(row, headers, 'ESTADO_CITA');
    }
  }

  const blockNames = Object.keys(blocks);
  if (blockNames.length > 1) {
    throw new Error('Booking unit spans multiple blocks: ' + blockNames.join(', '));
  }

  return {
    rowNumber: firstRowIndex + 1,
    rowNumbers: rowNumbers,
    id: clientId,
    name: value_(firstRow, headers, 'CLIENTE'),
    address: value_(firstRow, headers, 'DIRECCION'),
    city: value_(firstRow, headers, 'POBLACION'),
    block: blockNames[0] || '',
    bookingStatus: bookingStatus,
    bookingDate: bookingDate,
    bookingTime: bookingTime,
    sas: sas,
  };
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
    firstName: String(client.name || '').trim().split(/\s+/)[0],
  };
}

function timeMinutes_(value) {
  var parts = String(value || '').split(':'); return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

function compareSlots_(a, b) {
  return a.date.localeCompare(b.date) || timeMinutes_(a.time) - timeMinutes_(b.time);
}

function bookingUnitKey_(row, headers) {
  return [
    normalizeUnitText_(value_(row, headers, 'CLIENTE')),
    normalizePhone_(value_(row, headers, 'TELEFONO')),
    normalizeUnitText_(value_(row, headers, 'DIRECCION')),
    normalizeUnitText_(value_(row, headers, 'POBLACION')),
  ].join('|');
}

function normalizeUnitText_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizePhone_(value) {
  return String(value || '').replace(/\D/g, '');
}

function setCellIfDifferent_(sheet, row, column, currentValue, nextValue) {
  const current = String(currentValue == null ? '' : currentValue).trim();
  const next = String(nextValue == null ? '' : nextValue).trim();
  if (current === next) return false;
  sheet.getRange(row, column).setValue(nextValue);
  return true;
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
  return (
    Utilities.getUuid().replace(/-/g, '') +
    Utilities.getUuid().replace(/-/g, '')
  ).slice(0, length);
}

function buildBookingUrl_(token) {
  const configured = PropertiesService.getScriptProperties().getProperty('PUBLIC_BASE_URL');
  const base = String(configured || CFG.PUBLIC_BASE_URL).replace(/\/$/, '');
  return base + '/#c=' + encodeURIComponent(token);
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
