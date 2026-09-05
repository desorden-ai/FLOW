const CFG = {
  CLIENTS_SHEET: 'CLIENTES',
  SLOTS_SHEET: 'FRANJAS',
  TZ: 'Europe/Madrid',
};

function doGet(e) {
  try {
    const action = String(e.parameter.action || '');
    if (action !== 'availability') return json_({ ok: false, error: 'UNKNOWN_ACTION' });
    return json_(availability_(e.parameter.token));
  } catch (error) {
    console.error(error);
    return json_({ ok: false, error: 'SERVER_ERROR' });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || '{}');
    if (payload.action !== 'book') return json_({ ok: false, error: 'UNKNOWN_ACTION' });
    return json_(book_(payload.token, payload.slotId));
  } catch (error) {
    console.error(error);
    return json_({ ok: false, error: 'SERVER_ERROR' });
  }
}

function availability_(token) {
  const client = getClientByToken_(token);
  if (!client) return { ok: false, error: 'INVALID_TOKEN' };

  const slots = getSlots_();
  const existing = slots.find(
    (slot) => slot.block === client.block &&
      slot.status === 'CONFIRMADO' &&
      slot.clientId === client.id
  );

  if (existing) {
    return {
      ok: true,
      client: publicClient_(client),
      booking: bookingView_(existing),
      slots: [],
    };
  }

  const freeSlots = slots
    .filter((slot) => slot.block === client.block && slot.status === 'LIBRE')
    .map((slot) => ({ id: slot.id, date: slot.date, time: slot.time }));

  return {
    ok: true,
    client: publicClient_(client),
    booking: null,
    slots: freeSlots,
  };
}

function book_(token, slotId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const client = getClientByToken_(token);
    if (!client) return { ok: false, error: 'INVALID_TOKEN' };
    if (!slotId) return { ok: false, error: 'INVALID_SLOT' };

    const sheet = SpreadsheetApp.getActive().getSheetByName(CFG.SLOTS_SHEET);
    if (!sheet) throw new Error('Missing FRANJAS');

    const values = sheet.getDataRange().getDisplayValues();
    const headers = header_(values[0]);

    const existingRow = findConfirmedClientRow_(values, headers, client);
    if (existingRow !== -1) {
      return {
        ok: false,
        error: 'ALREADY_BOOKED',
        booking: bookingViewFromRow_(values[existingRow], headers),
      };
    }

    for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
      const row = values[rowIndex];
      if (row[headers.ID] !== String(slotId)) continue;
      if (row[headers.BLOQUE] !== client.block) return { ok: false, error: 'INVALID_SLOT' };
      if (row[headers.ESTADO] !== 'LIBRE') return { ok: false, error: 'SLOT_TAKEN' };

      sheet.getRange(rowIndex + 1, headers.ESTADO + 1).setValue('CONFIRMADO');
      sheet.getRange(rowIndex + 1, headers.CLIENTE_ID + 1).setValue(client.id);
      sheet
        .getRange(rowIndex + 1, headers.CONFIRMADO_EN + 1)
        .setValue(new Date())
        .setNumberFormat('yyyy-mm-dd hh:mm:ss');

      SpreadsheetApp.flush();

      return {
        ok: true,
        booking: {
          date: row[headers.FECHA],
          time: row[headers.HORA],
          status: 'CONFIRMADO',
        },
      };
    }

    return { ok: false, error: 'SLOT_NOT_FOUND' };
  } finally {
    lock.releaseLock();
  }
}

function getClientByToken_(token) {
  if (!token) return null;

  const sheet = SpreadsheetApp.getActive().getSheetByName(CFG.CLIENTS_SHEET);
  if (!sheet) throw new Error('Missing CLIENTES');

  const values = sheet.getDataRange().getDisplayValues();
  const headers = header_(values[0]);

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    if (row[headers.TOKEN] !== String(token)) continue;

    return {
      id: row[headers.ID],
      name: row[headers.NOMBRE],
      address: row[headers.DIRECCION],
      city: row[headers.POBLACION],
      block: row[headers.BLOQUE],
    };
  }

  return null;
}

function getSlots_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CFG.SLOTS_SHEET);
  if (!sheet) throw new Error('Missing FRANJAS');

  const values = sheet.getDataRange().getDisplayValues();
  const headers = header_(values[0]);

  return values.slice(1).map((row) => ({
    id: row[headers.ID],
    block: row[headers.BLOQUE],
    date: row[headers.FECHA],
    time: row[headers.HORA],
    status: row[headers.ESTADO],
    clientId: row[headers.CLIENTE_ID],
  }));
}

function findConfirmedClientRow_(values, headers, client) {
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    if (
      row[headers.BLOQUE] === client.block &&
      row[headers.ESTADO] === 'CONFIRMADO' &&
      row[headers.CLIENTE_ID] === client.id
    ) {
      return rowIndex;
    }
  }
  return -1;
}

function bookingViewFromRow_(row, headers) {
  return {
    date: row[headers.FECHA],
    time: row[headers.HORA],
    status: row[headers.ESTADO],
  };
}

function bookingView_(slot) {
  return { date: slot.date, time: slot.time, status: slot.status };
}

function publicClient_(client) {
  return {
    name: client.name,
    address: client.address,
    city: client.city,
  };
}

function header_(row) {
  return row.reduce((map, key, index) => {
    map[String(key).trim().toUpperCase()] = index;
    return map;
  }, {});
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
