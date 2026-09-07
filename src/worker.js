const SECURITY_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

function secureResponse(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const ERROR_CODES = new Set(['INVALID_TOKEN', 'CLIENT_NOT_READY', 'BAD_REQUEST', 'INVALID_SLOT', 'SLOT_NOT_FOUND', 'SLOT_TAKEN', 'ALREADY_BOOKED', 'SERVER_ERROR', 'UNAUTHORIZED', 'INVALID_CLIENT', 'INVALID_SAS', 'INVALID_BATCH', 'UNKNOWN_BLOCK', 'CLIENT_NOT_FOUND', 'CLIENT_ALREADY_EXISTS', 'CLIENT_CONFIRMED_BLOCK_LOCKED', 'CLIENT_CONFIRMED_CANNOT_ARCHIVE', 'INVALID_NEW_PASSWORD', 'INVALID_DATES', 'INVALID_TIMES', 'INVALID_TIME', 'ADMIN_DATA_NOT_READY']);
function safeError(value) { return ERROR_CODES.has(value) ? value : 'UPSTREAM_ERROR'; }

async function readPayload(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_JSON');
  let size = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 262144) { await reader.cancel(); throw new Error('INVALID_JSON'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const payload = JSON.parse(new TextDecoder().decode(bytes));
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('INVALID_JSON');
  return payload;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...SECURITY_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function upstreamUrl(env) {
  const value = String(env.APPS_SCRIPT_URL || '').trim();
  if (!value) throw new Error('APPS_SCRIPT_URL_NOT_CONFIGURED');
  return value;
}

function safeToken(value) {
  const token = String(value || '').trim();
  return /^[a-f0-9]{64}$/i.test(token) ? token : '';
}

function safeSlotId(value) {
  const id = String(value || '').trim();
  return id.length >= 4 && id.length <= 128 ? id : '';
}

function safeBlock(value) {
  const block = String(value || '').trim();
  return /^[A-Z0-9-]{4,80}$/.test(block) ? block : '';
}

function safeDate(value) {
  const date = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
}

function safeSchedule(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) return [];
  const dates = new Set();
  const schedule = [];

  for (const item of value) {
    const date = safeDate(item && item.date);
    if (!date || dates.has(date)) return [];
    dates.add(date);

    const rawTimes = item && item.times;
    if (!Array.isArray(rawTimes) || rawTimes.length < 1 || rawTimes.length > 8) return [];
    const times = rawTimes.map((entry) => String(entry || '').trim());
    if (!times.every((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))) return [];
    if (new Set(times).size !== times.length) return [];
    schedule.push({ date, times });
  }

  return schedule;
}

function safeAdminPassword(value) {
  const key = String(value || '').trim();
  return key.length >= 12 && key.length <= 128 ? key : '';
}

function safeText(value, maxLength, required = false) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (required && !text) return '';
  if (text.length > maxLength) return '';
  return text;
}

function safeClientId(value) {
  const id = String(value || '').trim();
  return /^CLI-[A-Za-z0-9_-]{4,80}$/.test(id) ? id : '';
}

function safeClientPayload(value, includeSas) {
  const source = value || {};
  if (typeof source !== 'object' || Array.isArray(source)) return null;
  for (const [key, max] of Object.entries({ name:160, phone:40, address:220, city:120 })) {
    if (source[key] != null && (typeof source[key] !== 'string' || source[key].length > max)) return null;
  }
  const name = safeText(source.name, 160, true);
  const phone = safeText(source.phone, 40, false);
  const address = safeText(source.address, 220, true);
  const city = safeText(source.city, 120, true);
  const block = safeBlock(source.block);
  if (!name || !address || !city || !block) return null;

  let sas = [];
  if (includeSas) {
    if (!Array.isArray(source.sas) || source.sas.length > 8) return null;
    const seen = new Set();
    for (const raw of source.sas) {
      if (typeof raw !== 'string' || raw.length > 40) return null;
      const sa = safeText(raw, 40, false);
      if (!sa) continue;
      if (seen.has(sa)) continue;
      seen.add(sa);
      sas.push(sa);
    }
  }

  return { name, phone, address, city, block, sas };
}

function adminKeyFromRequest(request) {
  const header = String(request.headers.get('Authorization') || '');
  if (!header.startsWith('Bearer ')) return '';
  return safeAdminPassword(header.slice(7));
}

async function readUpstream(response) {
  const text = await response.text();
  if (!response.ok) {
    return { ok: false, status: 502, payload: { ok: false, error: 'UPSTREAM_HTTP_ERROR' } };
  }

  try {
    return { ok: true, status: 200, payload: JSON.parse(text) };
  } catch {
    return { ok: false, status: 502, payload: { ok: false, error: 'UPSTREAM_INVALID_JSON' } };
  }
}

function sanitizeBooking(booking) {
  if (!booking) return null;
  return {
    date: String(booking.date || ''),
    time: String(booking.time || ''),
    status: String(booking.status || ''),
  };
}

function sanitizeAvailability(payload) {
  if (!payload || payload.ok !== true) {
    return { ok: false, error: safeError(payload && payload.error) };
  }

  const client = payload.client || {};
  const slots = Array.isArray(payload.slots) ? payload.slots : [];

  return {
    ok: true,
    client: {
      firstName: String(client.firstName || client.name || '').trim().split(/\s+/)[0],
    },
    booking: sanitizeBooking(payload.booking),
    slots: slots.map((slot) => ({
      slotId: String(slot.slotId || slot.id || ''),
      date: String(slot.date || ''),
      time: String(slot.time || ''),
    })),
  };
}

function sanitizeBookingResult(payload) {
  if (!payload || payload.ok !== true) {
    const result = { ok: false, error: safeError(payload && payload.error) };
    if (payload && payload.booking) result.booking = sanitizeBooking(payload.booking);
    return result;
  }

  return { ok: true, booking: sanitizeBooking(payload.booking) };
}

function sanitizeAdminSnapshot(payload) {
  if (!payload || payload.ok !== true) {
    return { ok: false, error: safeError(payload && payload.error) };
  }

  const summary = payload.summary || {};
  const blocks = Array.isArray(payload.blocks) ? payload.blocks : [];
  const appointments = Array.isArray(payload.appointments) ? payload.appointments : [];
  const limits = payload.limits || {};

  return {
    ok: true,
    summary: {
      visits: Number(summary.visits || 0),
      confirmed: Number(summary.confirmed || 0),
      pending: Number(summary.pending || 0),
      freeSlots: Number(summary.freeSlots || 0),
      reservedSlots: Number(summary.reservedSlots || 0),
      blocks: Number(summary.blocks || 0),
    },
    limits: {
      maxDates: Math.min(Math.max(Number(limits.maxDates || 8), 1), 8),
      maxTimesPerDate: Math.min(Math.max(Number(limits.maxTimesPerDate || 8), 1), 8),
      maxSasPerClient: Math.min(Math.max(Number(limits.maxSasPerClient || 8), 1), 8),
    },
    blocks: blocks.map((block) => ({
      block: String(block.block || ''),
      label: String(block.label || ''),
      visits: Number(block.visits || 0),
      pending: Number(block.pending || 0),
      free: Number(block.free || 0),
      reserved: Number(block.reserved || 0),
      schedule: Array.isArray(block.schedule) ? block.schedule.slice(0, 8).map((day) => ({
        date: String(day.date || ''),
        times: Array.isArray(day.times) ? day.times.slice(0, 8).map((time) => String(time || '')) : [],
      })) : [],
      slots: Array.isArray(block.slots) ? block.slots.map((slot) => ({
        date: String(slot.date || ''),
        time: String(slot.time || ''),
        status: String(slot.status || ''),
        clientId: String(slot.clientId || ''),
      })) : [],
      clients: Array.isArray(block.clients) ? block.clients.map((client) => ({
        id: String(client.id || ''),
        name: String(client.name || ''),
        phone: String(client.phone || ''),
        address: String(client.address || ''),
        city: String(client.city || ''),
        status: String(client.status || ''),
        date: String(client.date || ''),
        time: String(client.time || ''),
        sas: Array.isArray(client.sas) ? client.sas.map((sa) => String(sa || '')) : [],
        bookingUrl: String(client.bookingUrl || ''),
      })) : [],
      conflicts: Array.isArray(block.conflicts) ? block.conflicts.map((conflict) => ({
        date: String(conflict.date || ''),
        time: String(conflict.time || ''),
        blocks: Array.isArray(conflict.blocks) ? conflict.blocks.map((name) => String(name || '')) : [],
        hasConfirmed: Boolean(conflict.hasConfirmed),
      })) : [],
    })),
    appointments: appointments.map((item) => ({
      date: String(item.date || ''),
      time: String(item.time || ''),
      name: String(item.name || ''),
      phone: String(item.phone || ''),
      city: String(item.city || ''),
      address: String(item.address || ''),
      sas: Array.isArray(item.sas) ? item.sas.map((sa) => String(sa || '')) : [],
      bookingUrl: String(item.bookingUrl || ''),
      block: String(item.block || ''),
    })),
  };
}

export async function handleApiGet() {
  return jsonResponse({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
}

export async function handleApiPost(request, env) {
  try {
    let payload;
    try {
      payload = await readPayload(request);
    } catch {
      return jsonResponse({ ok: false, error: 'INVALID_JSON' }, 400);
    }

    const token = safeToken(payload.token);
    const slotId = safeSlotId(payload.slotId);
    if (!['availability', 'book'].includes(payload.action) || !token || (payload.action === 'book' && !slotId)) {
      return jsonResponse({ ok: false, error: 'BAD_REQUEST' }, 400);
    }

    const upstream = await fetch(upstreamUrl(env), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload.action === 'availability' ? { action: 'availability', token } : { action: 'book', token, slotId }),
      redirect: 'follow',
    });

    const result = await readUpstream(upstream);
    if (!result.ok) return jsonResponse(result.payload, result.status);
    return jsonResponse(payload.action === 'availability' ? sanitizeAvailability(result.payload) : sanitizeBookingResult(result.payload));
  } catch (error) {
    const code = 'PROXY_ERROR';
    return jsonResponse({ ok: false, error: code }, 500);
  }
}

export async function handleAdminApi(request, env) {
  try {
    if (request.method !== 'POST') return jsonResponse({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    const adminKey = adminKeyFromRequest(request);
    if (!adminKey) return jsonResponse({ ok: false, error: 'UNAUTHORIZED' }, 401);

    let payload;
    try {
      payload = await readPayload(request);
    } catch {
      return jsonResponse({ ok: false, error: 'INVALID_JSON' }, 400);
    }

    let upstreamPayload;
    if (payload.action === 'snapshot') {
      upstreamPayload = { action: 'adminSnapshot', adminKey };
    } else if (payload.action === 'updateAvailability') {
      const block = safeBlock(payload.block);
      const days = safeSchedule(payload.days);
      if (!block || !days.length) return jsonResponse({ ok: false, error: 'BAD_REQUEST' }, 400);
      upstreamPayload = { action: 'adminUpdateAvailability', adminKey, block, days };
    } else if (payload.action === 'changePassword') {
      const newKey = safeAdminPassword(payload.newKey);
      if (!newKey) return jsonResponse({ ok: false, error: 'INVALID_NEW_PASSWORD' }, 400);
      upstreamPayload = {
        action: 'adminUpdateAvailability',
        mode: 'changePassword',
        adminKey,
        newKey,
      };
    } else if (payload.action === 'createClient') {
      const client = safeClientPayload(payload.client, true);
      if (!client) return jsonResponse({ ok: false, error: 'INVALID_CLIENT' }, 400);
      upstreamPayload = {
        action: 'adminUpdateAvailability',
        mode: 'createClient',
        adminKey,
        client,
      };
    } else if (payload.action === 'updateClient') {
      const clientId = safeClientId(payload.clientId);
      const client = safeClientPayload(payload.client, false);
      if (!clientId || !client) return jsonResponse({ ok: false, error: 'INVALID_CLIENT' }, 400);
      upstreamPayload = {
        action: 'adminUpdateAvailability',
        mode: 'updateClient',
        adminKey,
        clientId,
        client,
      };
    } else if (payload.action === 'importClients') {
      if (!Array.isArray(payload.clients) || !payload.clients.length || payload.clients.length > 100) return jsonResponse({ ok:false, error:'INVALID_BATCH' }, 400);
      const clients = payload.clients.map(client => safeClientPayload(client, true));
      if (clients.some(client => !client)) return jsonResponse({ ok:false, error:'INVALID_CLIENT' }, 400);
      upstreamPayload = { action:'adminUpdateAvailability', mode:'importClients', adminKey, clients };
    } else if (payload.action === 'archiveClient' || payload.action === 'regenerateBookingToken') {
      const clientId = safeClientId(payload.clientId);
      if (!clientId) return jsonResponse({ ok: false, error: 'INVALID_CLIENT' }, 400);
      upstreamPayload = {
        action: 'adminUpdateAvailability',
        mode: payload.action,
        adminKey,
        clientId,
      };
    } else {
      return jsonResponse({ ok: false, error: 'BAD_REQUEST' }, 400);
    }

    const upstream = await fetch(upstreamUrl(env), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
      },
      body: JSON.stringify(upstreamPayload),
      redirect: 'follow',
    });

    const result = await readUpstream(upstream);
    if (!result.ok) return jsonResponse(result.payload, result.status);

    if (payload.action === 'changePassword') {
      if (!result.payload || result.payload.ok !== true) {
        const error = safeError(result.payload && result.payload.error);
        return jsonResponse({ ok: false, error }, error === 'UNAUTHORIZED' ? 401 : 400);
      }
      return jsonResponse({ ok: true });
    }

    const clean = sanitizeAdminSnapshot(result.payload);
    if (!clean.ok) {
      if (clean.error === 'UNAUTHORIZED') return jsonResponse(clean, 401);
      const conflictErrors = new Set([
        'CLIENT_ALREADY_EXISTS',
        'CLIENT_CONFIRMED_BLOCK_LOCKED',
        'CLIENT_CONFIRMED_CANNOT_ARCHIVE',
      ]);
      const notFoundErrors = new Set(['CLIENT_NOT_FOUND', 'UNKNOWN_BLOCK']);
      if (conflictErrors.has(clean.error)) return jsonResponse(clean, 409);
      if (notFoundErrors.has(clean.error)) return jsonResponse(clean, 404);
      return jsonResponse(clean, 400);
    }
    if (payload.action === 'importClients') {
      const resultImport = result.payload.import;
      const keys = ['received', 'created', 'duplicates', 'invalid'];
      if (!resultImport || !keys.every(key => Number.isInteger(resultImport[key]) && resultImport[key] >= 0 && resultImport[key] <= 100)
        || resultImport.received !== payload.clients.length || resultImport.created + resultImport.duplicates + resultImport.invalid !== resultImport.received) {
        return jsonResponse({ ok:false, error:'UPSTREAM_ERROR' }, 502);
      }
      clean.import = Object.fromEntries(keys.map(key => [key, resultImport[key]]));
    }
    return jsonResponse(clean);
  } catch (error) {
    const code = 'PROXY_ERROR';
    return jsonResponse({ ok: false, error: code }, 500);
  }
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/api/admin') return handleAdminApi(request, env);
  if (url.pathname !== '/api') {
    return jsonResponse({ ok: false, error: 'NOT_FOUND' }, 404);
  }

  if (request.method === 'GET') return handleApiGet(request, env);
  if (request.method === 'POST') return handleApiPost(request, env);
  return jsonResponse({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
}

function adminAssetRequest(request) {
  const url = new URL(request.url);
  url.pathname = '/admin/index.html';
  return new Request(url.toString(), request);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/contact') return publicContact(request, env);
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    if (!env.ASSETS || typeof env.ASSETS.fetch !== 'function') {
      return secureResponse(new Response('Static asset binding not configured', { status: 500 }));
    }

    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      return secureResponse(await env.ASSETS.fetch(adminAssetRequest(request)));
    }
    const cleanUrl = new URL(request.url);
    cleanUrl.search = ''; cleanUrl.hash = '';
    return secureResponse(await env.ASSETS.fetch(new Request(cleanUrl, request)));
  },
};

function publicContact(request, env) {
  if (request.method !== 'GET') return jsonResponse({ ok:false, error:'METHOD_NOT_ALLOWED' },405);
  const ca = new URL(request.url).searchParams.get('lang') !== 'es';
  const phone = String(env.WHATSAPP_TARGET || '').replace(/\D/g, '');
  if (!/^[1-9]\d{8,14}$/.test(phone)) return secureResponse(new Response(ca ? 'El contacte no està disponible.' : 'El contacto no está disponible.', { status:503 }));
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/Madrid', hour:'2-digit', hourCycle:'h23' }).format(new Date()));
  const greeting = ca ? (hour < 14 ? 'Bon dia' : 'Bona tarda') : (hour < 14 ? 'Buenos días' : 'Buenas tardes');
  const message = greeting + '.\n\n' + (ca ? 'No puc en cap de les hores proposades per al manteniment Panasonic. Podem buscar una altra data?' : 'No puedo en ninguna de las horas propuestas para el mantenimiento Panasonic. ¿Podemos buscar otra fecha?');
  return secureResponse(new Response(null, { status:302, headers:{ Location:'https://wa.me/' + phone + '?text=' + encodeURIComponent(message) } }));
}
