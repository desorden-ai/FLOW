function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function upstreamUrl(env) {
  const value = String(env.APPS_SCRIPT_URL || '').trim();
  if (!value) throw new Error('APPS_SCRIPT_URL_NOT_CONFIGURED');
  return value;
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

export async function onRequestGet(context) {
  try {
    const requestUrl = new URL(context.request.url);
    const action = requestUrl.searchParams.get('action');
    const token = requestUrl.searchParams.get('token');

    if (action !== 'availability' || !token) {
      return jsonResponse({ ok: false, error: 'BAD_REQUEST' }, 400);
    }

    const url = new URL(upstreamUrl(context.env));
    url.searchParams.set('action', 'availability');
    url.searchParams.set('token', token);

    const upstream = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
    });

    const result = await readUpstream(upstream);
    if (!result.ok) return jsonResponse(result.payload, result.status);

    if (result.payload.ok) {
      result.payload.contactWhatsApp = String(context.env.WHATSAPP_TARGET || '').replace(/\D/g, '');
    }

    return jsonResponse(result.payload);
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

    if (payload.action !== 'book' || !payload.token || !payload.slotId) {
      return jsonResponse({ ok: false, error: 'BAD_REQUEST' }, 400);
    }

    const upstream = await fetch(upstreamUrl(context.env), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        action: 'book',
        token: String(payload.token),
        slotId: String(payload.slotId),
      }),
      redirect: 'follow',
    });

    const result = await readUpstream(upstream);
    return jsonResponse(result.payload, result.status);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PROXY_ERROR';
    return jsonResponse({ ok: false, error: code }, 500);
  }
}
