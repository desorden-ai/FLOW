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

async function handleApi(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== '/api') {
    return jsonResponse({ ok: false, error: 'NOT_FOUND' }, 404);
  }

  if (request.method === 'GET') return handleApiGet(request, env);
  if (request.method === 'POST') return handleApiPost(request, env);
  return jsonResponse({ ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
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
    return env.ASSETS.fetch(request);
  },
};
