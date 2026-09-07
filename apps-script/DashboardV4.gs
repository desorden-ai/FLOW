const DASHBOARD_V4_CFG = {
  SHEET: 'DASHBOARD',
  FIRST_BLOCK_ROW: 11,
  LAST_BLOCK_ROW: 19,
  APPLY_COLUMN: 1,
  DATE_START_COLUMN: 5,
  TIME_END_COLUMN: 10,
  STATUS_COLUMN: 13,
  BLOCK_COLUMN: 14,
  APPOINTMENT_START_ROW: 23,
  APPOINTMENT_COLUMNS: 7,
};

/**
 * Installs the V4 dashboard controller.
 * Safe to run repeatedly: it creates each trigger only when missing.
 */
function installDashboardV4() {
  const spreadsheet = getSpreadsheet_();
  const triggers = ScriptApp.getProjectTriggers();
  const handlers = {};
  triggers.forEach(function (trigger) {
    handlers[trigger.getHandlerFunction()] = true;
  });

  let editTriggerCreated = false;
  let refreshTriggerCreated = false;

  if (!handlers.handleDashboardEditV4) {
    ScriptApp.newTrigger('handleDashboardEditV4')
      .forSpreadsheet(spreadsheet)
      .onEdit()
      .create();
    editTriggerCreated = true;
  }

  if (!handlers.refreshDashboardV4) {
    ScriptApp.newTrigger('refreshDashboardV4')
      .timeBased()
      .everyMinutes(5)
      .create();
    refreshTriggerCreated = true;
  }

  const result = refreshDashboardV4();
  return {
    ok: true,
    editTriggerCreated: editTriggerCreated,
    refreshTriggerCreated: refreshTriggerCreated,
    dashboard: result,
  };
}

/**
 * Installed onEdit handler for DASHBOARD.
 * - Editing FECHA/HORA marks the row as pending when it diverges from FRANJAS.
 * - Checking APLICAR safely replaces only the free availability for that block.
 */
function handleDashboardEditV4(e) {
  if (!e || !e.range) return;

  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName() !== DASHBOARD_V4_CFG.SHEET) return;

  const row = range.getRow();
  const column = range.getColumn();
  if (row < DASHBOARD_V4_CFG.FIRST_BLOCK_ROW || row > DASHBOARD_V4_CFG.LAST_BLOCK_ROW) return;

  if (column >= DASHBOARD_V4_CFG.DATE_START_COLUMN && column <= DASHBOARD_V4_CFG.TIME_END_COLUMN) {
    refreshDashboardBlockStateV4_(sheet, row);
    return;
  }

  if (column !== DASHBOARD_V4_CFG.APPLY_COLUMN || String(e.value || '').toUpperCase() !== 'TRUE') return;

  try {
    applyDashboardAvailabilityV4(row);
    getSpreadsheet_().toast('Disponibilidad actualizada', 'DESORDEN CITA', 5);
  } catch (error) {
    sheet.getRange(row, DASHBOARD_V4_CFG.APPLY_COLUMN).setValue(false);
    sheet.getRange(row, DASHBOARD_V4_CFG.STATUS_COLUMN).setValue('ERROR');
    getSpreadsheet_().toast(
      error instanceof Error ? error.message : String(error),
      'No se pudo aplicar',
      8
    );
    throw error;
  }
}

/**
 * Applies one availability row from DASHBOARD.
 * Existing CONFIRMADO slots are immutable and are always preserved.
 * Existing LIBRE slots for the block are replaced by the edited 2 x 4 schedule.
 */
function applyDashboardAvailabilityV4(rowNumber) {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(DASHBOARD_V4_CFG.SHEET);
  if (!sheet) throw new Error('Missing sheet: ' + DASHBOARD_V4_CFG.SHEET);

  const row = Number(rowNumber);
  if (!Number.isInteger(row) || row < DASHBOARD_V4_CFG.FIRST_BLOCK_ROW || row > DASHBOARD_V4_CFG.LAST_BLOCK_ROW) {
    throw new Error('Invalid dashboard row');
  }

  const values = sheet.getRange(row, 5, 1, 10).getValues()[0]; // E:N
  const block = String(values[9] || '').trim();
  if (!block) throw new Error('Missing block');

  const date1 = normalizeDate_(values[0]);
  const date2 = normalizeDate_(values[1]);
  if (date1 === date2) throw new Error('Las dos fechas deben ser distintas');

  const times = values.slice(2, 6).map(normalizeTime_);
  if (times.length !== 4 || Object.keys(times.reduce(function (map, time) {
    map[time] = true;
    return map;
  }, {})).length !== 4) {
    throw new Error('Las cuatro horas deben ser válidas y distintas');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    replaceBlockAvailabilityV4_(block, [date1, date2], times);
    sheet.getRange(row, DASHBOARD_V4_CFG.APPLY_COLUMN).setValue(false);
    SpreadsheetApp.flush();
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }

  return refreshDashboardV4();
}

/**
 * Replaces only LIBRE rows for one block while preserving every CONFIRMADO row.
 * If a desired date/time is already confirmed, no duplicate free slot is created.
 */
function replaceBlockAvailabilityV4_(block, dates, times) {
  const spreadsheet = getSpreadsheet_();
  const slotSheet = spreadsheet.getSheetByName(CFG.SLOT_SHEET);
  if (!slotSheet) throw new Error('Missing ' + CFG.SLOT_SHEET);

  const values = slotSheet.getDataRange().getValues();
  if (!values.length) throw new Error('Missing FRANJAS headers');
  const headers = header_(values[0]);
  requireHeaders_(headers, SLOT_HEADERS);

  const output = [];
  const confirmedKeys = {};

  values.slice(1).forEach(function (row) {
    const id = String(row[headers.ID] || '').trim();
    if (!id) return;

    const rowBlock = String(row[headers.BLOQUE] || '').trim();
    const status = String(row[headers.ESTADO] || '').trim();
    const date = normalizeSlotDateV4_(row[headers.FECHA]);
    const time = normalizeSlotTimeV4_(row[headers.HORA]);

    if (rowBlock === block && status === 'CONFIRMADO') {
      confirmedKeys[date + '|' + time] = true;
      output.push(row.slice(0, SLOT_HEADERS.length));
      return;
    }

    if (rowBlock === block && status === 'LIBRE') return;
    output.push(row.slice(0, SLOT_HEADERS.length));
  });

  dates.forEach(function (date) {
    times.forEach(function (time) {
      const key = date + '|' + time;
      if (confirmedKeys[key]) return;
      output.push([
        'SLT-' + randomHex_(12),
        block,
        date,
        time,
        'LIBRE',
        '',
        '',
      ]);
    });
  });

  output.sort(function (a, b) {
    const left = String(a[headers.BLOQUE] || '') + '|' + normalizeSlotDateV4_(a[headers.FECHA]) + '|' + normalizeSlotTimeV4_(a[headers.HORA]);
    const right = String(b[headers.BLOQUE] || '') + '|' + normalizeSlotDateV4_(b[headers.FECHA]) + '|' + normalizeSlotTimeV4_(b[headers.HORA]);
    return left.localeCompare(right);
  });

  const oldRows = Math.max(slotSheet.getLastRow() - 1, 0);
  const clearRows = Math.max(oldRows, output.length);
  if (clearRows) slotSheet.getRange(2, 1, clearRows, SLOT_HEADERS.length).clearContent();
  if (output.length) slotSheet.getRange(2, 1, output.length, SLOT_HEADERS.length).setValues(output);

  if (output.length) {
    slotSheet.getRange(2, headers.CONFIRMADO_EN + 1, output.length, 1)
      .setNumberFormat('yyyy-mm-dd hh:mm:ss');
  }
  SpreadsheetApp.flush();
}

/**
 * Refreshes dashboard metrics and the confirmed-appointments table.
 * Editable availability cells E:J are never overwritten.
 */
function refreshDashboardV4() {
  syncClientMetadata();

  const spreadsheet = getSpreadsheet_();
  const dashboard = spreadsheet.getSheetByName(DASHBOARD_V4_CFG.SHEET);
  const clientSheet = spreadsheet.getSheetByName(CFG.CLIENT_SHEET);
  if (!dashboard) throw new Error('Missing sheet: ' + DASHBOARD_V4_CFG.SHEET);
  if (!clientSheet) throw new Error('Missing sheet: ' + CFG.CLIENT_SHEET);

  const clientValues = clientSheet.getDataRange().getDisplayValues();
  const clientHeaders = header_(clientValues[0]);
  requireHeaders_(clientHeaders, [
    'SA', 'CLIENTE', 'DIRECCION', 'POBLACION', 'CLIENTE_ID', 'BLOQUE',
    'ESTADO_CITA', 'CITA_FECHA', 'CITA_HORA',
  ]);

  const units = {};
  const blocks = {};

  clientValues.slice(1).forEach(function (row) {
    const id = value_(row, clientHeaders, 'CLIENTE_ID');
    if (!id) return;

    const block = value_(row, clientHeaders, 'BLOQUE');
    if (block) blocks[block] = true;

    if (!units[id]) {
      units[id] = {
        id: id,
        block: block,
        status: '',
        date: '',
        time: '',
        name: value_(row, clientHeaders, 'CLIENTE'),
        city: value_(row, clientHeaders, 'POBLACION'),
        address: value_(row, clientHeaders, 'DIRECCION'),
        sas: {},
      };
    }

    const unit = units[id];
    const sa = value_(row, clientHeaders, 'SA');
    if (sa) unit.sas[sa] = true;

    const status = value_(row, clientHeaders, 'ESTADO_CITA');
    if (status === 'CONFIRMADO') {
      unit.status = 'CONFIRMADO';
      if (!unit.date) unit.date = value_(row, clientHeaders, 'CITA_FECHA');
      if (!unit.time) unit.time = value_(row, clientHeaders, 'CITA_HORA');
    } else if (!unit.status) {
      unit.status = status || 'PENDIENTE';
    }
  });

  const unitList = Object.keys(units).map(function (id) { return units[id]; });
  const confirmed = unitList.filter(function (unit) { return unit.status === 'CONFIRMADO'; });
  const pending = unitList.filter(function (unit) { return unit.status !== 'CONFIRMADO'; });

  const blockMetrics = {};
  Object.keys(blocks).forEach(function (block) {
    blockMetrics[block] = {
      visits: 0,
      pending: 0,
      free: 0,
      reserved: 0,
      freeKeys: {},
      confirmedKeys: {},
    };
  });

  unitList.forEach(function (unit) {
    if (!unit.block) return;
    if (!blockMetrics[unit.block]) {
      blockMetrics[unit.block] = { visits: 0, pending: 0, free: 0, reserved: 0, freeKeys: {}, confirmedKeys: {} };
    }
    blockMetrics[unit.block].visits += 1;
    if (unit.status !== 'CONFIRMADO') blockMetrics[unit.block].pending += 1;
  });

  let freeSlots = 0;
  let reservedSlots = 0;
  getSlots_().forEach(function (slot) {
    if (!blockMetrics[slot.block]) {
      blockMetrics[slot.block] = { visits: 0, pending: 0, free: 0, reserved: 0, freeKeys: {}, confirmedKeys: {} };
    }
    const key = slot.date + '|' + slot.time;
    if (slot.status === 'LIBRE') {
      freeSlots += 1;
      blockMetrics[slot.block].free += 1;
      blockMetrics[slot.block].freeKeys[key] = true;
    } else if (slot.status === 'CONFIRMADO') {
      reservedSlots += 1;
      blockMetrics[slot.block].reserved += 1;
      blockMetrics[slot.block].confirmedKeys[key] = true;
    }
  });

  dashboard.getRange('A6').setValue(unitList.length);
  dashboard.getRange('C6').setValue(confirmed.length);
  dashboard.getRange('E6').setValue(pending.length);
  dashboard.getRange('G6').setValue(freeSlots);
  dashboard.getRange('I6').setValue(reservedSlots);
  dashboard.getRange('K6').setValue(Object.keys(blocks).length);
  dashboard.getRange('I3').setValue(
    'Actualizado · ' + Utilities.formatDate(new Date(), CFG.TZ, 'dd/MM/yyyy HH:mm')
  );

  const rowCount = DASHBOARD_V4_CFG.LAST_BLOCK_ROW - DASHBOARD_V4_CFG.FIRST_BLOCK_ROW + 1;
  const configRows = dashboard.getRange(DASHBOARD_V4_CFG.FIRST_BLOCK_ROW, 5, rowCount, 10).getValues(); // E:N
  const leftMetrics = [];
  const rightMetrics = [];

  configRows.forEach(function (row) {
    const block = String(row[9] || '').trim();
    const metrics = blockMetrics[block] || { visits: 0, pending: 0, free: 0, reserved: 0, freeKeys: {}, confirmedKeys: {} };
    leftMetrics.push([metrics.visits, metrics.pending]);
    rightMetrics.push([
      metrics.free,
      metrics.reserved,
      dashboardBlockStatusV4_(row, metrics),
    ]);
  });

  dashboard.getRange(DASHBOARD_V4_CFG.FIRST_BLOCK_ROW, 3, rowCount, 2).setValues(leftMetrics);
  dashboard.getRange(DASHBOARD_V4_CFG.FIRST_BLOCK_ROW, 11, rowCount, 3).setValues(rightMetrics);

  renderConfirmedAppointmentsV4_(dashboard, confirmed);
  SpreadsheetApp.flush();

  return {
    visits: unitList.length,
    confirmed: confirmed.length,
    pending: pending.length,
    freeSlots: freeSlots,
    reservedSlots: reservedSlots,
    blocks: Object.keys(blocks).length,
  };
}

function refreshDashboardBlockStateV4_(dashboard, rowNumber) {
  const config = dashboard.getRange(rowNumber, 5, 1, 10).getValues()[0];
  const block = String(config[9] || '').trim();
  if (!block) return;

  const metrics = { visits: 0, pending: 0, free: 0, reserved: 0, freeKeys: {}, confirmedKeys: {} };
  getSlots_().forEach(function (slot) {
    if (slot.block !== block) return;
    const key = slot.date + '|' + slot.time;
    if (slot.status === 'LIBRE') {
      metrics.free += 1;
      metrics.freeKeys[key] = true;
    } else if (slot.status === 'CONFIRMADO') {
      metrics.reserved += 1;
      metrics.confirmedKeys[key] = true;
    }
  });

  dashboard.getRange(rowNumber, DASHBOARD_V4_CFG.STATUS_COLUMN)
    .setValue(dashboardBlockStatusV4_(config, metrics));
}

function dashboardBlockStatusV4_(configRow, metrics) {
  let date1 = '';
  let date2 = '';
  const times = [];

  try {
    date1 = normalizeDate_(configRow[0]);
    date2 = normalizeDate_(configRow[1]);
    configRow.slice(2, 6).forEach(function (value) { times.push(normalizeTime_(value)); });
  } catch (error) {
    return 'SIN CONFIGURAR';
  }

  if (!date1 || !date2 || date1 === date2 || times.length !== 4) return 'SIN CONFIGURAR';

  const expectedFree = {};
  [date1, date2].forEach(function (date) {
    times.forEach(function (time) {
      const key = date + '|' + time;
      if (!metrics.confirmedKeys[key]) expectedFree[key] = true;
    });
  });

  const actualKeys = Object.keys(metrics.freeKeys).sort();
  const expectedKeys = Object.keys(expectedFree).sort();
  const same = actualKeys.length === expectedKeys.length && actualKeys.every(function (key, index) {
    return key === expectedKeys[index];
  });

  if (same) return 'ACTIVO';
  if (!metrics.free && !metrics.reserved) return 'LISTO';
  return 'CAMBIOS PENDIENTES';
}

function renderConfirmedAppointmentsV4_(dashboard, confirmedUnits) {
  const maxRows = dashboard.getMaxRows() - DASHBOARD_V4_CFG.APPOINTMENT_START_ROW + 1;
  if (maxRows > 0) {
    dashboard.getRange(
      DASHBOARD_V4_CFG.APPOINTMENT_START_ROW,
      1,
      maxRows,
      DASHBOARD_V4_CFG.APPOINTMENT_COLUMNS
    ).clearContent();
  }

  if (!confirmedUnits.length) {
    dashboard.getRange(DASHBOARD_V4_CFG.APPOINTMENT_START_ROW, 1)
      .setValue('Todavía no hay citas confirmadas.');
    return;
  }

  const rows = confirmedUnits
    .slice()
    .sort(function (a, b) {
      return (a.date + ' ' + a.time).localeCompare(b.date + ' ' + b.time);
    })
    .map(function (unit) {
      return [
        unit.date,
        unit.time,
        unit.name,
        unit.city,
        unit.address,
        Object.keys(unit.sas).sort().join(' / '),
        'CONFIRMADA',
      ];
    });

  dashboard.getRange(
    DASHBOARD_V4_CFG.APPOINTMENT_START_ROW,
    1,
    rows.length,
    DASHBOARD_V4_CFG.APPOINTMENT_COLUMNS
  ).setValues(rows);
}

function normalizeSlotDateV4_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, CFG.TZ, 'yyyy-MM-dd');
  }
  return String(value == null ? '' : value).trim();
}

function normalizeSlotTimeV4_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, CFG.TZ, 'HH:mm');
  }
  const text = String(value == null ? '' : value).trim();
  const match = /^(\d|[01]\d|2[0-3]):([0-5]\d)$/.exec(text);
  if (!match) return text;
  return ('0' + Number(match[1])).slice(-2) + ':' + match[2];
}
