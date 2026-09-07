const ADMIN_DEFAULT_PASSWORD_SHA256 = 'f06be6f822432aaf9837dee1c733f9abf76874e89367d05d5a105ce93e451c5d';
const ADMIN_PASSWORD_PROPERTY = 'ADMIN_PASSWORD_SHA256';
const ADMIN_DEFAULT_TIMES = ['09:00', '10:30', '12:00', '15:30'];

function adminSnapshot_(adminKey) {
  requireAdmin_(adminKey);
  syncClientMetadata();

  const spreadsheet = getSpreadsheet_();
  const clientSheet = spreadsheet.getSheetByName(CFG.CLIENT_SHEET);
  const slotSheet = spreadsheet.getSheetByName(CFG.SLOT_SHEET);
  if (!clientSheet || !slotSheet) throw new Error('ADMIN_DATA_NOT_READY');

  const clientValues = clientSheet.getDataRange().getDisplayValues();
  const headers = header_(clientValues[0]);
  requireHeaders_(headers, [
    'SA', 'CLIENTE', 'TELEFONO', 'DIRECCION', 'POBLACION', 'CLIENTE_ID', 'BLOQUE',
    'ESTADO_CITA', 'CITA_FECHA', 'CITA_HORA', 'URL_CITA',
  ]);

  const units = {};
  const blocks = {};

  clientValues.slice(1).forEach(function(row) {
    const id = value_(row, headers, 'CLIENTE_ID');
    if (!id) return;

    const block = value_(row, headers, 'BLOQUE');
    if (!units[id]) {
      units[id] = {
        id: id,
        block: block,
        name: value_(row, headers, 'CLIENTE'),
        phone: value_(row, headers, 'TELEFONO'),
        address: value_(row, headers, 'DIRECCION'),
        city: value_(row, headers, 'POBLACION'),
        bookingUrl: value_(row, headers, 'URL_CITA'),
        status: value_(row, headers, 'ESTADO_CITA') || 'PENDIENTE',
        date: value_(row, headers, 'CITA_FECHA'),
        time: value_(row, headers, 'CITA_HORA'),
        sas: {},
      };
    }

    const unit = units[id];
    const sa = value_(row, headers, 'SA');
    if (sa) unit.sas[sa] = true;
    if (!unit.phone) unit.phone = value_(row, headers, 'TELEFONO');
    if (!unit.bookingUrl) unit.bookingUrl = value_(row, headers, 'URL_CITA');

    if (value_(row, headers, 'ESTADO_CITA') === 'CONFIRMADO') {
      unit.status = 'CONFIRMADO';
      unit.date = value_(row, headers, 'CITA_FECHA') || unit.date;
      unit.time = value_(row, headers, 'CITA_HORA') || unit.time;
    }

    if (block) {
      if (!blocks[block]) {
        blocks[block] = {
          visits: {}, cities: {}, pending: 0, free: 0, reserved: 0,
          dates: {}, times: {}, slots: [], clients: [], conflicts: [],
        };
      }
      blocks[block].visits[id] = true;
      const city = value_(row, headers, 'POBLACION');
      if (city) blocks[block].cities[city] = true;
    }
  });

  const unitList = Object.keys(units).map(function(id) { return units[id]; });
  const confirmed = unitList.filter(function(unit) { return unit.status === 'CONFIRMADO'; });

  unitList.forEach(function(unit) {
    if (!unit.block || !blocks[unit.block]) return;
    if (unit.status !== 'CONFIRMADO') blocks[unit.block].pending += 1;
    blocks[unit.block].clients.push({
      id: unit.id,
      name: unit.name,
      phone: unit.phone,
      address: unit.address,
      city: unit.city,
      status: unit.status || 'PENDIENTE',
      date: unit.date,
      time: unit.time,
      sas: Object.keys(unit.sas).sort(),
      bookingUrl: unit.bookingUrl,
    });
  });

  const slotValues = slotSheet.getDataRange().getDisplayValues();
  const slotHeaders = header_(slotValues[0]);
  requireHeaders_(slotHeaders, SLOT_HEADERS);

  const scheduleIndex = {};
  let freeSlots = 0;
  let reservedSlots = 0;

  slotValues.slice(1).forEach(function(row) {
    const block = value_(row, slotHeaders, 'BLOQUE');
    const status = value_(row, slotHeaders, 'ESTADO');
    const date = value_(row, slotHeaders, 'FECHA');
    const time = value_(row, slotHeaders, 'HORA');
    const clientId = value_(row, slotHeaders, 'CLIENTE_ID');
    if (!block || !blocks[block] || !date || !time || !status) return;

    blocks[block].dates[date] = true;
    blocks[block].times[time] = true;
    blocks[block].slots.push({
      date: date,
      time: time,
      status: status,
      clientId: clientId,
    });

    if (status === 'LIBRE') {
      blocks[block].free += 1;
      freeSlots += 1;
    }
    if (status === 'CONFIRMADO') {
      blocks[block].reserved += 1;
      reservedSlots += 1;
    }

    const key = date + '|' + time;
    if (!scheduleIndex[key]) scheduleIndex[key] = [];
    scheduleIndex[key].push({ block: block, status: status });
  });

  Object.keys(scheduleIndex).forEach(function(key) {
    const entries = scheduleIndex[key];
    const distinctBlocks = {};
    entries.forEach(function(entry) { distinctBlocks[entry.block] = true; });
    const names = Object.keys(distinctBlocks);
    if (names.length < 2) return;

    const parts = key.split('|');
    names.forEach(function(block) {
      if (!blocks[block]) return;
      const others = names.filter(function(name) { return name !== block; });
      const otherStatuses = {};
      entries.forEach(function(entry) {
        if (entry.block !== block) otherStatuses[entry.status] = true;
      });
      blocks[block].conflicts.push({
        date: parts[0],
        time: parts[1],
        blocks: others,
        hasConfirmed: Boolean(otherStatuses.CONFIRMADO),
      });
    });
  });

  const blockList = Object.keys(blocks).sort().map(function(block) {
    const item = blocks[block];
    const dates = Object.keys(item.dates).sort();
    const times = Object.keys(item.times).sort();

    item.slots.sort(function(a, b) {
      return (a.date + '|' + a.time).localeCompare(b.date + '|' + b.time);
    });
    item.clients.sort(function(a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''), 'es');
    });
    item.conflicts.sort(function(a, b) {
      return (a.date + '|' + a.time).localeCompare(b.date + '|' + b.time);
    });

    return {
      block: block,
      label: adminBlockLabel_(block, Object.keys(item.cities).sort()),
      visits: Object.keys(item.visits).length,
      pending: item.pending,
      free: item.free,
      reserved: item.reserved,
      date1: dates[0] || '',
      date2: dates[1] || '',
      times: times.length ? times.slice(0, 4) : ADMIN_DEFAULT_TIMES.slice(),
      slots: item.slots,
      clients: item.clients,
      conflicts: item.conflicts,
    };
  });

  const appointments = confirmed.map(function(unit) {
    return {
      date: unit.date,
      time: unit.time,
      name: unit.name,
      phone: unit.phone,
      city: unit.city,
      address: unit.address,
      sas: Object.keys(unit.sas).sort(),
      bookingUrl: unit.bookingUrl,
      block: unit.block,
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
      blocks: blockList.length,
    },
    blocks: blockList,
    appointments: appointments,
  };
}

function adminUpdateAvailability_(payload) {
  if (payload && payload.mode === 'changePassword') {
    return adminChangePassword_(payload);
  }

  requireAdmin_(payload && payload.adminKey);
  const block = String((payload && payload.block) || '').trim();
  const date1 = adminNormalizeDate_((payload && payload.date1) || '');
  const date2 = adminNormalizeDate_((payload && payload.date2) || '');
  const times = Array.isArray(payload && payload.times) ? payload.times.map(adminNormalizeTime_) : [];

  if (!block) throw new Error('INVALID_BLOCK');
  if (!date1 || !date2 || date1 === date2) throw new Error('INVALID_DATES');
  if (times.length !== 4 || Object.keys(times.reduce(function(map, time) {
    map[time] = true;
    return map;
  }, {})).length !== 4) {
    throw new Error('INVALID_TIMES');
  }

  const spreadsheet = getSpreadsheet_();
  const clientSheet = spreadsheet.getSheetByName(CFG.CLIENT_SHEET);
  const slotSheet = spreadsheet.getSheetByName(CFG.SLOT_SHEET);
  if (!clientSheet || !slotSheet) throw new Error('ADMIN_DATA_NOT_READY');

  const clientValues = clientSheet.getDataRange().getDisplayValues();
  const clientHeaders = header_(clientValues[0]);
  const knownBlock = clientValues.slice(1).some(function(row) {
    return value_(row, clientHeaders, 'BLOQUE') === block;
  });
  if (!knownBlock) throw new Error('UNKNOWN_BLOCK');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const values = slotSheet.getDataRange().getValues();
    const display = slotSheet.getDataRange().getDisplayValues();
    const slotHeaders = header_(display[0]);
    requireHeaders_(slotHeaders, SLOT_HEADERS);

    const output = [];
    const confirmedKeys = {};
    for (let index = 1; index < values.length; index += 1) {
      const rawRow = values[index];
      const shownRow = display[index];
      const id = value_(shownRow, slotHeaders, 'ID');
      if (!id) continue;
      const rowBlock = value_(shownRow, slotHeaders, 'BLOQUE');
      const status = value_(shownRow, slotHeaders, 'ESTADO');
      const date = value_(shownRow, slotHeaders, 'FECHA');
      const time = value_(shownRow, slotHeaders, 'HORA');

      if (rowBlock === block && status === 'CONFIRMADO') {
        confirmedKeys[date + '|' + time] = true;
        output.push(rawRow.slice(0, SLOT_HEADERS.length));
      } else if (rowBlock !== block) {
        output.push(rawRow.slice(0, SLOT_HEADERS.length));
      }
    }

    [date1, date2].forEach(function(date) {
      times.forEach(function(time) {
        if (confirmedKeys[date + '|' + time]) return;
        output.push(['SLT-' + randomHex_(12), block, date, time, 'LIBRE', '', '']);
      });
    });

    output.sort(function(a, b) {
      return (String(a[1] || '') + '|' + adminCellDate_(a[2]) + '|' + adminCellTime_(a[3]))
        .localeCompare(String(b[1] || '') + '|' + adminCellDate_(b[2]) + '|' + adminCellTime_(b[3]));
    });

    const oldRows = Math.max(slotSheet.getLastRow() - 1, 0);
    const clearRows = Math.max(oldRows, output.length);
    if (clearRows) slotSheet.getRange(2, 1, clearRows, SLOT_HEADERS.length).clearContent();
    if (output.length) slotSheet.getRange(2, 1, output.length, SLOT_HEADERS.length).setValues(output);
    SpreadsheetApp.flush();
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }

  return adminSnapshot_(payload.adminKey);
}

function adminChangePassword_(payload) {
  requireAdmin_(payload && payload.adminKey);
  const newKey = String((payload && payload.newKey) || '').trim();
  if (newKey.length < 12 || newKey.length > 128) throw new Error('INVALID_NEW_PASSWORD');
  PropertiesService.getScriptProperties().setProperty(ADMIN_PASSWORD_PROPERTY, adminSha256_(newKey));
  return { ok: true };
}

function requireAdmin_(key) {
  const hash = adminSha256_(String(key || ''));
  if (hash !== adminPasswordHash_()) throw new Error('UNAUTHORIZED');
}

function adminPasswordHash_() {
  return PropertiesService.getScriptProperties().getProperty(ADMIN_PASSWORD_PROPERTY) || ADMIN_DEFAULT_PASSWORD_SHA256;
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

function adminCellDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, CFG.TZ, 'yyyy-MM-dd');
  }
  return String(value || '');
}

function adminCellTime_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, CFG.TZ, 'HH:mm');
  }
  return String(value || '');
}

function adminBlockLabel_(block, cities) {
  if (block === 'BLK-PALLEJA-01') return 'Pallejà · Grupo 1';
  if (block === 'BLK-PALLEJA-02') return 'Pallejà · Grupo 2';
  return cities.length ? cities.join(' / ') : block;
}
