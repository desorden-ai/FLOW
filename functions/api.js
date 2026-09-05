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

function sanitizeAvailability(payload, contactWhatsApp) {
  if (!payload || payload.ok !== true) return payload;

  const client = payload.client || {};
  const booking = payload.booking || null;
  const slots = Array.isArray(payload.slots) ? payload.slots : [];

  return {
    ok: true,
    client: {
      name: String(client.name || ''),
      address: String(client.address || ''),
      city: String(client.city || ''),
    },
    booking: booking ? {
      date: String(booking.date || ''),
      time: String(booking.time || ''),
      status: String(booking.status || ''),
    } : null,
    slots: slots.map((slot) => ({
      id: String(slot.id || ''),
      date: String(slot.date || ''),
      time: String(slot.time || ''),
    })),
    contactWhatsApp: String(contactWhatsApp || '').replace(/\D/g, ''),
  };
}

export async function onRequestGet(context) {
  try {
    const requestUrl = new URL(context.request.url);
    const action = requestUrl.searchParams.get('action');
    const token = safeToken(requestUrl.searchParams.get('token'));

    if (action !== 'availability' || !token) {
      return jsonResponse({ ok: false, error: 'BAD_REQUEST' }, 400);
    }

    const url = new URL(upstreamUrl(context.env));
    url.searchParams.set('action', 'availability');
    url.searchParams.set('token', token);

    const upstream = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: { Accept: 'application/json' },
    });

    const result = await readUpstream(upstream);
    if (!result.ok) return jsonResponse(result.payload, result.status);

    const sanitized = sanitizeAvailability(result.payload, context.env.WHATSAPP_TARGET);
    return jsonResponse(sanitized);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PROXY_ERROR';
    return jsonResponse({ ok: false, error: code }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    let payload;
    try {
      payload = await context.request.json();
    } catch {
      return jsonResponse({ ok: false, error: 'INVALID_JSON' }, 400);
    }

    const token = safeToken(payload.token);
    const slotId = safeSlotId(payload.slotId);
    if (payload.action !== 'book' || !token || !slotId) {
      return jsonResponse({ ok: false, error: 'BAD_REQUEST' }, 400);
    }

    const upstream = await fetch(upstreamUrl(context.env), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
      },
      body: JSON.stringify({ action: 'book', token, slotId }),
      redirect: 'follow',
    });

    const result = await readUpstream(upstream);
    return jsonResponse(result.payload, result.status);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PROXY_ERROR';
    return jsonResponse({ ok: false, error: code }, 500);
  }
}
