import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { onRequestGet, onRequestPost } from '../functions/api.js';

test('Apps Script source parses as JavaScript', () => {
  const source = fs.readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
  assert.doesNotThrow(() => new vm.Script(source));
});

test('GET rejects missing/invalid token before upstream call', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error('should not be called');
  };

  try {
    const response = await onRequestGet({
      request: new Request('https://cita.example/api?action=availability&token=x'),
      env: { APPS_SCRIPT_URL: 'https://script.example/exec' },
    });
    assert.equal(response.status, 400);
    assert.equal(called, false);
    assert.deepEqual(await response.json(), { ok: false, error: 'BAD_REQUEST' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GET forwards availability and strips unknown customer fields', async () => {
  const originalFetch = globalThis.fetch;
  let forwardedUrl = '';
  globalThis.fetch = async (url) => {
    forwardedUrl = String(url);
    return new Response(JSON.stringify({
      ok: true,
      client: {
        name: 'Cliente Prueba',
        address: 'C/ Exemple 1',
        city: 'Martorell',
        phone: '600000000',
        internalId: 'CLI-SECRET',
      },
      booking: null,
      slots: [{ id: 'SLT-1234', date: '2026-09-10', time: '09:00', secret: 'x' }],
      admin: 'secret',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const token = '1234567890abcdef1234567890abcdef';
    const response = await onRequestGet({
      request: new Request(`https://cita.example/api?action=availability&token=${token}`),
      env: {
        APPS_SCRIPT_URL: 'https://script.example/exec',
        WHATSAPP_TARGET: '+34 600 111 222',
      },
    });

    assert.equal(response.status, 200);
    assert.match(forwardedUrl, /action=availability/);
    assert.match(forwardedUrl, /token=1234567890abcdef/);

    const payload = await response.json();
    assert.deepEqual(payload, {
      ok: true,
      client: {
        name: 'Cliente Prueba',
        address: 'C/ Exemple 1',
        city: 'Martorell',
      },
      booking: null,
      slots: [{ id: 'SLT-1234', date: '2026-09-10', time: '09:00' }],
      contactWhatsApp: '34600111222',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('POST forwards only action, token and slotId', async () => {
  const originalFetch = globalThis.fetch;
  let forwardedBody = null;
  globalThis.fetch = async (_url, init) => {
    forwardedBody = JSON.parse(init.body);
    return new Response(JSON.stringify({
      ok: true,
      booking: { date: '2026-09-10', time: '10:30', status: 'CONFIRMADO' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const response = await onRequestPost({
      request: new Request('https://cita.example/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'book',
          token: '1234567890abcdef1234567890abcdef',
          slotId: 'SLT-123456789abc',
          block: 'ATTACKER-CONTROLLED',
          clientId: 'ATTACKER-CONTROLLED',
        }),
      }),
      env: { APPS_SCRIPT_URL: 'https://script.example/exec' },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(forwardedBody, {
      action: 'book',
      token: '1234567890abcdef1234567890abcdef',
      slotId: 'SLT-123456789abc',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('invalid upstream JSON is normalized to 502', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html>not json</html>', { status: 200 });

  try {
    const response = await onRequestGet({
      request: new Request('https://cita.example/api?action=availability&token=1234567890abcdef1234567890abcdef'),
      env: { APPS_SCRIPT_URL: 'https://script.example/exec' },
    });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { ok: false, error: 'UPSTREAM_INVALID_JSON' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
