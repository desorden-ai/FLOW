const ADMIN_DEFAULT_PASSWORD_SHA256 = 'f06be6f822432aaf9837dee1c733f9abf76874e89367d05d5a105ce93e451c5d';
const ADMIN_PASSWORD_PROPERTY = 'ADMIN_PASSWORD_SHA256';
const ADMIN_SCHEDULE_PROPERTY_PREFIX = 'ADMIN_SCHEDULE_V2_';
const ADMIN_DEFAULT_TIMES = ['09:00', '10:30', '12:00', '15:30'];
const ADMIN_MAX_DATES = 8;
const ADMIN_MAX_TIMES_PER_DATE = 8;
const ADMIN_MAX_SAS = 8;
const ADMIN_ARCHIVED_STATUS = 'ARCHIVADO';

function adminSnapshot_(adminKey, metadataReady) {
  requireAdmin_(adminKey);
  if (!metadataReady) {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try { syncClientMetadata(); } finally { if (lock.hasLock()) lock.releaseLock(); }
  }

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
    const rowStatus = value_(row, headers, 'ESTADO_CITA') || 'PENDIENTE';
    if (!units[id]) {
      units[id] = {
        id: id,
        block: block,
        name: value_(row, headers, 'CLIENTE'),
        phone: value_(row, headers, 'TELEFONO'),
        address: value_(row, headers, 'DIRECCION'),
        city: value_(row, headers, 'POBLACION'),
        bookingUrl: value_(row, headers, 'URL_CITA'),
        status: rowStatus,
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

    if (rowStatus === 'CONFIRMADO') {
      unit.status = 'CONFIRMADO';
      unit.date = value_(row, headers, 'CITA_FECHA') || unit.date;
      unit.time = value_(row, headers, 'CITA_HORA') || unit.time;
    } else if (unit.status !== 'CONFIRMADO' && rowStatus === ADMIN_ARCHIVED_STATUS) {
      unit.status = ADMIN_ARCHIVED_STATUS;
    }

    if (block && rowStatus !== ADMIN_ARCHIVED_STATUS) {
      adminEnsureBlock_(blocks, block);
      blocks[block].visits[id] = true;
      const city = value_(row, headers, 'POBLACION');
      if (city) blocks[block].cities[city] = true;
    }
  });

  const allUnits = Object.keys(units).map(function(id) { return units[id]; });
  const unitList = allUnits.filter(function(unit) {
    return unit.status !== ADMIN_ARCHIVED_STATUS && Boolean(unit.block);
  });
  const confirmed = unitList.filter(function(unit) { return unit.status === 'CONFIRMADO'; });

  unitList.forEach(function(unit) {
    adminEnsureBlock_(blocks, unit.block);
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
    if (!block || !date || !time || !status) return;

    adminEnsureBlock_(blocks, block);
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

    item.slots.sort(function(a, b) {
      return a.date.localeCompare(b.date) || timeMinutes_(a.time) - timeMinutes_(b.time);
    });
    item.clients.sort(function(a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''), 'es');
    });
    item.conflicts.sort(function(a, b) {
      return a.date.localeCompare(b.date) || timeMinutes_(a.time) - timeMinutes_(b.time);
    });

    return {
      block: block,
      label: adminBlockLabel_(block, Object.keys(item.cities).sort()),
      visits: Object.keys(item.visits).length,
      pending: item.pending,
      free: item.free,
      reserved: item.reserved,
      schedule: adminScheduleForBlock_(block, item.slots),
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
    return String(a.date).localeCompare(String(b.date)) || timeMinutes_(a.time) - timeMinutes_(b.time);
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
    limits: {
      maxDates: ADMIN_MAX_DATES,
      maxTimesPerDate: ADMIN_MAX_TIMES_PER_DATE,
      maxSasPerClient: ADMIN_MAX_SAS,
    },
  };
}

function adminEnsureBlock_(blocks, block) {
  if (!blocks[block]) {
    blocks[block] = {
      visits: {}, cities: {}, pending: 0, free: 0, reserved: 0,
      slots: [], clients: [], conflicts: [],
    };
  }
  return blocks[block];
}

function adminUpdateAvailability_(payload) {
  if (payload && payload.mode === 'changePassword') return adminChangePassword_(payload);
  if (payload && payload.mode === 'importClients') return adminImportClients_(payload);
  if (payload && payload.mode === 'regenerateBookingToken') return adminRegenerateBookingToken_(payload);
  if (payload && payload.mode === 'createClient') return adminCreateClient_(payload);
  if (payload && payload.mode === 'updateClient') return adminUpdateClient_(payload);
  if (payload && payload.mode === 'archiveClient') return adminArchiveClient_(payload);

  requireAdmin_(payload && payload.adminKey);
  const block = String((payload && payload.block) || '').trim();
  const schedule = adminNormalizeSchedule_(payload && payload.days);

  if (!block) throw new Error('INVALID_BLOCK');

  const spreadsheet = getSpreadsheet_();
  const clientSheet = spreadsheet.getSheetByName(CFG.CLIENT_SHEET);
  const slotSheet = spreadsheet.getSheetByName(CFG.SLOT_SHEET);
  if (!clientSheet || !slotSheet) throw new Error('ADMIN_DATA_NOT_READY');

  const clientValues = clientSheet.getDataRange().getDisplayValues();
  const clientHeaders = header_(clientValues[0]);
  const knownBlock = clientValues.slice(1).some(function(row) {
    return value_(row, clientHeaders, 'BLOQUE') === block;
  }) || getSlots_().some(function(slot) { return slot.block === block; });
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

    schedule.forEach(function(day) {
      day.times.forEach(function(time) {
        if (confirmedKeys[day.date + '|' + time]) return;
        output.push(['SLT-' + randomHex_(12), block, day.date, time, 'LIBRE', '', '']);
      });
    });

    output.sort(function(a, b) {
      const blockOrder = String(a[1] || '').localeCompare(String(b[1] || ''));
      if (blockOrder) return blockOrder;
      const dateOrder = adminCellDate_(a[2]).localeCompare(adminCellDate_(b[2]));
      return dateOrder || timeMinutes_(adminCellTime_(a[3])) - timeMinutes_(adminCellTime_(b[3]));
    });

    const oldRows = Math.max(slotSheet.getLastRow() - 1, 0);
    const clearRows = Math.max(oldRows, output.length);
    if (clearRows) slotSheet.getRange(2, 1, clearRows, SLOT_HEADERS.length).clearContent();
    if (output.length) slotSheet.getRange(2, 1, output.length, SLOT_HEADERS.length).setValues(output);

    PropertiesService.getScriptProperties().setProperty(
      ADMIN_SCHEDULE_PROPERTY_PREFIX + block,
      JSON.stringify(schedule)
    );

    SpreadsheetApp.flush();
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }

  return adminSnapshot_(payload.adminKey);
}

function adminCreateClient_(payload) {
  return adminImportClients_({ adminKey: payload && payload.adminKey, clients: [payload && payload.client] }, true);
}

// Every validation dependent on Sheet state runs under the same booking lock.
function adminImportClients_(payload, single) {
  requireAdmin_(payload && payload.adminKey);
  const clients = payload && payload.clients;
  if (!Array.isArray(clients) || !clients.length || clients.length > 100) return { ok:false, error:'INVALID_BATCH' };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  const result = { received:clients.length, created:0, duplicates:0, invalid:0 };
  try {
    const sheet = getSpreadsheet_().getSheetByName(CFG.CLIENT_SHEET);
    if (!sheet) return { ok:false, error:'ADMIN_DATA_NOT_READY' };
    const values = sheet.getDataRange().getDisplayValues();
    const headers = header_(values[0]);
    requireHeaders_(headers, ['SA','CLIENTE','TELEFONO','DIRECCION','POBLACION','CLIENTE_ID','BLOQUE','TOKEN','URL_CITA','ESTADO_CITA']);
    const knownBlocks = new Set(values.slice(1).map(function(row) { return value_(row, headers, 'BLOQUE'); }).filter(Boolean));
    getSlots_().forEach(function(slot) { if (slot.block) knownBlocks.add(slot.block); });
    const identities = new Set(values.slice(1).filter(function(row) {
      return value_(row, headers, 'ESTADO_CITA') !== ADMIN_ARCHIVED_STATUS;
    }).map(function(row) { return bookingUnitKey_(row, headers); }));
    const rows = [];
    const width = values[0].length;
    for (let i = 0; i < clients.length; i += 1) {
      const normalized = adminNormalizeClientInput_(clients[i], true);
      if (!normalized.ok || !knownBlocks.has(normalized.client.block)) {
        if (single) return normalized.ok ? { ok:false, error:'UNKNOWN_BLOCK' } : normalized;
        result.invalid += 1; continue;
      }
      const client = normalized.client;
      const sample = new Array(width).fill('');
      sample[headers.CLIENTE] = client.name;
      sample[headers.TELEFONO] = client.phone;
      sample[headers.DIRECCION] = client.address;
      sample[headers.POBLACION] = client.city;
      const key = bookingUnitKey_(sample, headers);
      if (identities.has(key)) {
        if (single) return { ok:false, error:'CLIENT_ALREADY_EXISTS' };
        result.duplicates += 1; continue;
      }
      identities.add(key);
      const id = 'CLI-' + randomHex_(12);
      const token = randomToken_();
      sample[headers.CLIENTE_ID] = id;
      sample[headers.BLOQUE] = client.block;
      sample[headers.TOKEN] = token;
      sample[headers.URL_CITA] = buildBookingUrl_(token);
      sample[headers.ESTADO_CITA] = 'PENDIENTE';
      (client.sas.length ? client.sas : ['']).forEach(function(sa) {
        const row = sample.slice(); row[headers.SA] = sa;
        rows.push(row.map(adminSheetText_));
      });
      result.created += 1;
    }
    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, width).setValues(rows);
      SpreadsheetApp.flush();
      syncClientMetadata();
    }
  } finally { if (lock.hasLock()) lock.releaseLock(); }
  const snapshot = adminSnapshot_(payload.adminKey, true);
  if (!single) snapshot.import = result;
  return snapshot;
}

function adminRegenerateBookingToken_(payload) {
  requireAdmin_(payload && payload.adminKey);
  const clientId = String((payload && payload.clientId) || '');
  if (!/^CLI-[A-Za-z0-9_-]{4,80}$/.test(clientId)) return { ok:false, error:'INVALID_CLIENT' };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSpreadsheet_().getSheetByName(CFG.CLIENT_SHEET);
    const values = sheet.getDataRange().getDisplayValues();
    const headers = header_(values[0]);
    requireHeaders_(headers, ['CLIENTE_ID','TOKEN','URL_CITA']);
    const indexes = [];
    values.slice(1).forEach(function(row, index) {
      if (value_(row, headers, 'CLIENTE_ID') === clientId) indexes.push(index + 2);
    });
    if (!indexes.length) return { ok:false, error:'CLIENT_NOT_FOUND' };
    const token = randomToken_();
    const url = buildBookingUrl_(token);
    indexes.forEach(function(row) {
      sheet.getRange(row, headers.TOKEN + 1).setValue(token);
      sheet.getRange(row, headers.URL_CITA + 1).setValue(url);
    });
    SpreadsheetApp.flush();
  } finally { if (lock.hasLock()) lock.releaseLock(); }
  return adminSnapshot_(payload.adminKey, true);
}

// Google Sheets interprets a leading equals sign as a formula in setValues.
function adminSheetText_(value) { return String(value).startsWith('=') ? "'" + value : value; }

function adminUpdateClient_(payload) {
  requireAdmin_(payload && payload.adminKey);
  const clientId = String((payload && payload.clientId) || '').trim();
  if (!clientId) return { ok: false, error: 'INVALID_CLIENT' };

  const data = adminNormalizeClientInput_(payload && payload.client, false);
  if (!data.ok) return data;

  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(CFG.CLIENT_SHEET);
  if (!sheet) return { ok: false, error: 'ADMIN_DATA_NOT_READY' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
  const values = sheet.getDataRange().getDisplayValues();
  const headers = header_(values[0]);
  requireHeaders_(headers, [
    'CLIENTE', 'TELEFONO', 'DIRECCION', 'POBLACION', 'CLIENTE_ID', 'BLOQUE', 'ESTADO_CITA',
  ]);

  const indexes = [];
  let currentBlock = '';
  let confirmed = false;
  values.slice(1).forEach(function(row, index) {
    if (value_(row, headers, 'CLIENTE_ID') !== clientId) return;
    indexes.push(index + 2);
    if (!currentBlock) currentBlock = value_(row, headers, 'BLOQUE');
    if (value_(row, headers, 'ESTADO_CITA') === 'CONFIRMADO') confirmed = true;
  });

  if (!indexes.length) return { ok: false, error: 'CLIENT_NOT_FOUND' };
  if (confirmed && data.client.block !== currentBlock) {
    return { ok: false, error: 'CLIENT_CONFIRMED_BLOCK_LOCKED' };
  }
  if (!adminBlockKnown_(data.client.block, values, headers)) {
    return { ok: false, error: 'UNKNOWN_BLOCK' };
  }
  if (adminClientIdentityExists_(clientId, data.client, values, headers)) {
    return { ok: false, error: 'CLIENT_ALREADY_EXISTS' };
  }

    indexes.forEach(function(rowNumber) {
      sheet.getRange(rowNumber, headers.CLIENTE + 1).setValue(adminSheetText_(data.client.name));
      sheet.getRange(rowNumber, headers.TELEFONO + 1).setValue(adminSheetText_(data.client.phone));
      sheet.getRange(rowNumber, headers.DIRECCION + 1).setValue(adminSheetText_(data.client.address));
      sheet.getRange(rowNumber, headers.POBLACION + 1).setValue(adminSheetText_(data.client.city));
      sheet.getRange(rowNumber, headers.BLOQUE + 1).setValue(data.client.block);
    });
    SpreadsheetApp.flush();
    syncClientMetadata();
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }

  return adminSnapshot_(payload.adminKey, true);
}

function adminArchiveClient_(payload) {
  requireAdmin_(payload && payload.adminKey);
  const clientId = String((payload && payload.clientId) || '').trim();
  if (!clientId) return { ok: false, error: 'INVALID_CLIENT' };

  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(CFG.CLIENT_SHEET);
  if (!sheet) return { ok: false, error: 'ADMIN_DATA_NOT_READY' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
  const values = sheet.getDataRange().getDisplayValues();
  const headers = header_(values[0]);
  requireHeaders_(headers, [
    'CLIENTE_ID', 'BLOQUE', 'ESTADO_CITA', 'CITA_FECHA', 'CITA_HORA', 'CONFIRMADO_EN',
  ]);

  const indexes = [];
  let confirmed = false;
  values.slice(1).forEach(function(row, index) {
    if (value_(row, headers, 'CLIENTE_ID') !== clientId) return;
    indexes.push(index + 2);
    if (value_(row, headers, 'ESTADO_CITA') === 'CONFIRMADO') confirmed = true;
  });

  if (!indexes.length) return { ok: false, error: 'CLIENT_NOT_FOUND' };
  if (confirmed) return { ok: false, error: 'CLIENT_CONFIRMED_CANNOT_ARCHIVE' };

    indexes.forEach(function(rowNumber) {
      sheet.getRange(rowNumber, headers.BLOQUE + 1).setValue('');
      sheet.getRange(rowNumber, headers.ESTADO_CITA + 1).setValue(ADMIN_ARCHIVED_STATUS);
      sheet.getRange(rowNumber, headers.CITA_FECHA + 1).setValue('');
      sheet.getRange(rowNumber, headers.CITA_HORA + 1).setValue('');
      sheet.getRange(rowNumber, headers.CONFIRMADO_EN + 1).setValue('');
    });
    SpreadsheetApp.flush();
    syncClientMetadata();
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }

  return adminSnapshot_(payload.adminKey, true);
}

function adminNormalizeClientInput_(input, includeSas) {
  const client = input || {};
  if (typeof client !== 'object' || Array.isArray(client)) return { ok:false, error:'INVALID_CLIENT' };
  const bounds = { name:160, phone:40, address:220, city:120 };
  for (const key of Object.keys(bounds)) {
    if (client[key] != null && (typeof client[key] !== 'string' || client[key].length > bounds[key])) return { ok:false, error:'INVALID_CLIENT' };
  }
  const name = adminCleanText_(client.name, 160);
  const phone = adminCleanText_(client.phone, 40);
  const address = adminCleanText_(client.address, 220);
  const city = adminCleanText_(client.city, 120);
  const block = String(client.block || '').trim();

  if (!name || !address || !city || !/^[A-Z0-9-]{4,80}$/.test(block)) return { ok: false, error: 'INVALID_CLIENT' };

  let sas = [];
  if (includeSas) {
    if (!Array.isArray(client.sas) || client.sas.length > ADMIN_MAX_SAS) {
      return { ok: false, error: 'INVALID_SAS' };
    }
    if (client.sas.some(function(sa) { return typeof sa !== 'string' || sa.length > 40; })) return { ok:false, error:'INVALID_SAS' };
    const seen = Object.create(null);
    sas = client.sas.map(function(value) {
      return adminCleanText_(value, 40);
    }).filter(function(value) {
      if (!value || seen[value]) return false;
      seen[value] = true;
      return true;
    });
  }

  return {
    ok: true,
    client: { name: name, phone: phone, address: address, city: city, block: block, sas: sas },
  };
}

function adminCleanText_(value, maxLength) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function adminBlockKnown_(block, values, headers) {
  if (!block) return false;
  const inClients = values.slice(1).some(function(row) {
    return value_(row, headers, 'BLOQUE') === block;
  });
  if (inClients) return true;
  return getSlots_().some(function(slot) { return slot.block === block; });
}

function adminClientIdentityExists_(clientId, client, values, headers) {
  const sample = new Array(values[0].length).fill('');
  sample[headers.CLIENTE] = client.name;
  sample[headers.TELEFONO] = client.phone;
  sample[headers.DIRECCION] = client.address;
  sample[headers.POBLACION] = client.city;
  const candidateKey = bookingUnitKey_(sample, headers);

  return values.slice(1).some(function(row) {
    const rowId = value_(row, headers, 'CLIENTE_ID');
    const status = value_(row, headers, 'ESTADO_CITA');
    if (status === ADMIN_ARCHIVED_STATUS) return false;
    if (clientId && rowId === clientId) return false;
    return bookingUnitKey_(row, headers) === candidateKey;
  });
}

function adminScheduleForBlock_(block, slots) {
  const stored = PropertiesService.getScriptProperties().getProperty(ADMIN_SCHEDULE_PROPERTY_PREFIX + block);
  if (stored) {
    try {
      return adminNormalizeSchedule_(JSON.parse(stored));
    } catch (error) {
      // Ignore malformed stored schedules without logging operational data.
    }
  }

  const grouped = {};
  (slots || []).forEach(function(slot) {
    if (!slot.date || !slot.time) return;
    if (!grouped[slot.date]) grouped[slot.date] = {};
    grouped[slot.date][slot.time] = true;
  });

  const derived = Object.keys(grouped).sort().slice(0, ADMIN_MAX_DATES).map(function(date) {
    return {
      date: date,
      times: Object.keys(grouped[date]).sort(function(a, b) { return timeMinutes_(a) - timeMinutes_(b); }).slice(0, ADMIN_MAX_TIMES_PER_DATE),
    };
  }).filter(function(day) { return day.times.length; });

  if (derived.length) return derived;
  return [];
}

function adminNormalizeSchedule_(days) {
  if (!Array.isArray(days) || days.length < 1 || days.length > ADMIN_MAX_DATES) {
    throw new Error('INVALID_DATES');
  }

  const seenDates = {};
  const normalized = days.map(function(day) {
    const date = adminNormalizeDate_(day && day.date);
    if (!date || seenDates[date]) throw new Error('INVALID_DATES');
    seenDates[date] = true;

    if (!day || !Array.isArray(day.times) || day.times.length < 1 || day.times.length > ADMIN_MAX_TIMES_PER_DATE) {
      throw new Error('INVALID_TIMES');
    }

    const seenTimes = {};
    const times = day.times.map(function(value) {
      const time = adminNormalizeTime_(value);
      if (seenTimes[time]) throw new Error('INVALID_TIMES');
      seenTimes[time] = true;
      return time;
    }).sort(function(a, b) { return timeMinutes_(a) - timeMinutes_(b); });

    return { date: date, times: times };
  });

  normalized.sort(function(a, b) { return a.date.localeCompare(b.date); });
  return normalized;
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
