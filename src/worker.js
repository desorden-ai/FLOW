function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
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
  return token.length >= 16 && token.length <= 256 ? token : '';
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

function sanitizeAvailability(payload, contactWhatsApp) {
  if (!payload || payload.ok !== true) {
    return { ok: false, error: String((payload && payload.error) || 'UPSTREAM_ERROR') };
  }

  const client = payload.client || {};
  const slots = Array.isArray(payload.slots) ? payload.slots : [];

  return {
    ok: true,
    client: {
      name: String(client.name || ''),
      address: String(client.address || ''),
      city: String(client.city || ''),
    },
    booking: sanitizeBooking(payload.booking),
    slots: slots.map((slot) => ({
      id: String(slot.id || ''),
      date: String(slot.date || ''),
      time: String(slot.time || ''),
    })),
    contactWhatsApp: String(contactWhatsApp || '').replace(/\D/g, ''),
  };
}

function sanitizeBookingResult(payload) {
  if (!payload || payload.ok !== true) {
    const result = { ok: false, error: String((payload && payload.error) || 'UPSTREAM_ERROR') };
    if (payload && payload.booking) result.booking = sanitizeBooking(payload.booking);
    return result;
  }

  return { ok: true, booking: sanitizeBooking(payload.booking) };
}

function sanitizeAdminSnapshot(payload) {
  if (!payload || payload.ok !== true) {
    return { ok: false, error: String((payload && payload.error) || 'UPSTREAM_ERROR') };
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

export async function handleApiGet(request, env) {
  try {
    const requestUrl = new URL(request.url);
    const action = requestUrl.searchParams.get('action');
    const token = safeToken(requestUrl.searchParams.get('token'));

    if (action !== 'availability' || !token) {
      return jsonResponse({ ok: false, error: 'BAD_REQUEST' }, 400);
    }

    const url = new URL(upstreamUrl(env));
    url.searchParams.set('action', 'availability');
    url.searchParams.set('token', token);

    const upstream = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: { Accept: 'application/json' },
    });

    const result = await readUpstream(upstream);
    if (!result.ok) return jsonResponse(result.payload, result.status);

    return jsonResponse(sanitizeAvailability(result.payload, env.WHATSAPP_TARGET));
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PROXY_ERROR';
    return jsonResponse({ ok: false, error: code }, 500);
  }
}

export async function handleApiPost(request, env) {
  try {
    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ ok: false, error: 'INVALID_JSON' }, 400);
    }

    const token = safeToken(payload.token);
    const slotId = safeSlotId(payload.slotId);
    if (payload.action !== 'book' || !token || !slotId) {
      return jsonResponse({ ok: false, error: 'BAD_REQUEST' }, 400);
    }

    const upstream = await fetch(upstreamUrl(env), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
      },
      body: JSON.stringify({ action: 'book', token, slotId }),
      redirect: 'follow',
    });

    const result = await readUpstream(upstream);
    if (!result.ok) return jsonResponse(result.payload, result.status);
    return jsonResponse(sanitizeBookingResult(result.payload));
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PROXY_ERROR';
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
      payload = await request.json();
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
    } else if (payload.action === 'archiveClient') {
      const clientId = safeClientId(payload.clientId);
      if (!clientId) return jsonResponse({ ok: false, error: 'INVALID_CLIENT' }, 400);
      upstreamPayload = {
        action: 'adminUpdateAvailability',
        mode: 'archiveClient',
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
        const error = String((result.payload && result.payload.error) || 'UPSTREAM_ERROR');
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
    return jsonResponse(clean);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PROXY_ERROR';
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
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    if (!env.ASSETS || typeof env.ASSETS.fetch !== 'function') {
      return new Response('Static asset binding not configured', { status: 500 });
    }

    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      return env.ASSETS.fetch(adminAssetRequest(request));
    }
    return env.ASSETS.fetch(request);
  },
};
