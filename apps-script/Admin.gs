const ADMIN_PASSWORD_SHA256 = 'f06be6f822432aaf9837dee1c733f9abf76874e89367d05d5a105ce93e451c5d';
const ADMIN_DASHBOARD_SHEET = 'DASHBOARD';
const ADMIN_FIRST_BLOCK_ROW = 11;
const ADMIN_LAST_BLOCK_ROW = 19;

function adminSnapshot_(adminKey) {
  requireAdmin_(adminKey);
  syncClientMetadata();

  const spreadsheet = getSpreadsheet_();
  const clientSheet = spreadsheet.getSheetByName(CFG.CLIENT_SHEET);
  const slotSheet = spreadsheet.getSheetByName(CFG.SLOT_SHEET);
  const dashboard = spreadsheet.getSheetByName(ADMIN_DASHBOARD_SHEET);
  if (!clientSheet || !slotSheet || !dashboard) throw new Error('ADMIN_DATA_NOT_READY');

  const clientValues = clientSheet.getDataRange().getDisplayValues();
  const headers = header_(clientValues[0]);
  requireHeaders_(headers, ['SA','CLIENTE','DIRECCION','POBLACION','CLIENTE_ID','BLOQUE','ESTADO_CITA','CITA_FECHA','CITA_HORA']);

  const units = {};
  clientValues.slice(1).forEach(function(row) {
    const id = value_(row, headers, 'CLIENTE_ID');
    if (!id) return;
    if (!units[id]) {
      units[id] = {
        id: id,
        block: value_(row, headers, 'BLOQUE'),
        name: value_(row, headers, 'CLIENTE'),
        address: value_(row, headers, 'DIRECCION'),
        city: value_(row, headers, 'POBLACION'),
        status: value_(row, headers, 'ESTADO_CITA') || 'PENDIENTE',
        date: value_(row, headers, 'CITA_FECHA'),
        time: value_(row, headers, 'CITA_HORA'),
        sas: {},
      };
    }
    const unit = units[id];
    const sa = value_(row, headers, 'SA');
    if (sa) unit.sas[sa] = true;
    if (value_(row, headers, 'ESTADO_CITA') === 'CONFIRMADO') {
      unit.status = 'CONFIRMADO';
      unit.date = value_(row, headers, 'CITA_FECHA') || unit.date;
      unit.time = value_(row, headers, 'CITA_HORA') || unit.time;
    }
  });

  const unitList = Object.keys(units).map(function(id) { return units[id]; });
  const confirmed = unitList.filter(function(unit) { return unit.status === 'CONFIRMADO'; });

  const blockMetrics = {};
  unitList.forEach(function(unit) {
    if (!unit.block) return;
    if (!blockMetrics[unit.block]) blockMetrics[unit.block] = { visits: 0, pending: 0, free: 0, reserved: 0 };
    blockMetrics[unit.block].visits += 1;
    if (unit.status !== 'CONFIRMADO') blockMetrics[unit.block].pending += 1;
  });

  const slotValues = slotSheet.getDataRange().getDisplayValues();
  const slotHeaders = header_(slotValues[0]);
  requireHeaders_(slotHeaders, SLOT_HEADERS);
  let freeSlots = 0;
  let reservedSlots = 0;
  slotValues.slice(1).forEach(function(row) {
    const block = value_(row, slotHeaders, 'BLOQUE');
    const status = value_(row, slotHeaders, 'ESTADO');
    if (!block || !status) return;
    if (!blockMetrics[block]) blockMetrics[block] = { visits: 0, pending: 0, free: 0, reserved: 0 };
    if (status === 'LIBRE') { blockMetrics[block].free += 1; freeSlots += 1; }
    if (status === 'CONFIRMADO') { blockMetrics[block].reserved += 1; reservedSlots += 1; }
  });

  const config = dashboard.getRange(ADMIN_FIRST_BLOCK_ROW, 1, ADMIN_LAST_BLOCK_ROW - ADMIN_FIRST_BLOCK_ROW + 1, 14).getDisplayValues();
  const blocks = config.map(function(row) {
    const block = String(row[13] || '').trim();
    const metrics = blockMetrics[block] || { visits: 0, pending: 0, free: 0, reserved: 0 };
    return {
      block: block,
      label: String(row[1] || block),
      visits: metrics.visits,
      pending: metrics.pending,
      free: metrics.free,
      reserved: metrics.reserved,
      date1: adminNormalizeDate_(row[4]),
      date2: adminNormalizeDate_(row[5]),
      times: [row[6], row[7], row[8], row[9]].map(function(v) { return String(v || ''); }),
    };
  }).filter(function(item) { return item.block; });

  const appointments = confirmed.map(function(unit) {
    return {
      date: unit.date,
      time: unit.time,
      name: unit.name,
      city: unit.city,
      address: unit.address,
      sas: Object.keys(unit.sas).sort(),
    };
  }).sort(function(a, b) {
    return (String(a.date) + '|' + String(a.time)).localeCompare(String(b.date) + '|' + String(b.time));
  });

  return {
    ok: true,
    summary: {
      visits: unitList.length,
      confirmed: confirmed.length,
      pending: unitList.length - confirmed.length,
      freeSlots: freeSlots,
      reservedSlots: reservedSlots,
      blocks: blocks.length,
    },
    blocks: blocks,
    appointments: appointments,
  };
}

function adminUpdateAvailability_(payload) {
  requireAdmin_(payload && payload.adminKey);
  const block = String((payload && payload.block) || '').trim();
  const date1 = adminNormalizeDate_((payload && payload.date1) || '');
  const date2 = adminNormalizeDate_((payload && payload.date2) || '');
  const times = Array.isArray(payload && payload.times) ? payload.times.map(adminNormalizeTime_) : [];

  if (!block) throw new Error('INVALID_BLOCK');
  if (!date1 || !date2 || date1 === date2) throw new Error('INVALID_DATES');
  if (times.length !== 4 || Object.keys(times.reduce(function(map, time) { map[time] = true; return map; }, {})).length !== 4) {
    throw new Error('INVALID_TIMES');
  }

  const spreadsheet = getSpreadsheet_();
  const dashboard = spreadsheet.getSheetByName(ADMIN_DASHBOARD_SHEET);
  if (!dashboard) throw new Error('ADMIN_DATA_NOT_READY');

  const rows = dashboard.getRange(ADMIN_FIRST_BLOCK_ROW, 14, ADMIN_LAST_BLOCK_ROW - ADMIN_FIRST_BLOCK_ROW + 1, 1).getDisplayValues();
  let targetRow = 0;
  rows.forEach(function(row, index) {
    if (String(row[0] || '').trim() === block) targetRow = ADMIN_FIRST_BLOCK_ROW + index;
  });
  if (!targetRow) throw new Error('UNKNOWN_BLOCK');

  const d1 = new Date(date1 + 'T12:00:00');
  const d2 = new Date(date2 + 'T12:00:00');
  dashboard.getRange(targetRow, 5, 1, 2).setValues([[d1, d2]]).setNumberFormat('yyyy-mm-dd');
  dashboard.getRange(targetRow, 7, 1, 4).setValues([times]);
  SpreadsheetApp.flush();
  return adminSnapshot_(payload.adminKey);
}

function requireAdmin_(key) {
  const hash = adminSha256_(String(key || ''));
  if (hash !== ADMIN_PASSWORD_SHA256) throw new Error('UNAUTHORIZED');
}

function adminSha256_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8);
  return bytes.map(function(byte) {
    const normalized = byte < 0 ? byte + 256 : byte;
    return ('0' + normalized.toString(16)).slice(-2);
  }).join('');
}

function adminNormalizeDate_(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return '';
  return match[3] + '-' + ('0' + match[2]).slice(-2) + '-' + ('0' + match[1]).slice(-2);
}

function adminNormalizeTime_(value) {
  const text = String(value || '').trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) throw new Error('INVALID_TIME');
  return text;
}
