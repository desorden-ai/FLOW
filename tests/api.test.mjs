import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import worker, { handleApiGet, handleApiPost } from '../src/worker.js';

test('Apps Script source parses as JavaScript', () => {
  const source = fs.readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
  assert.doesNotThrow(() => new vm.Script(source));
});

test('Apps Script models one booking across duplicate service rows', () => {
  const source = fs.readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
  assert.match(source, /function bookingUnitKey_/);
  assert.match(source, /client\.rowNumbers\.forEach/);
  assert.match(source, /totalClients: orderedKeys\.length/);
});

test('Apps Script provides a visual and idempotent slot dashboard', () => {
  const source = fs.readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
  assert.match(source, /CONTROL_SHEET: 'CONTROL_CITAS'/);
  assert.match(source, /function refreshControlDashboard\(\)/);
  assert.match(source, /function generateSelectedSlots\(\)/);
  assert.match(source, /function installControlDashboard\(\)/);
  assert.match(source, /function handleControlEdit\(e\)/);
  assert.match(source, /\.insertCheckboxes\(\)/);
  assert.match(source, /existingBlocks\[block\]/);
  assert.match(source, /createMenu\('DESORDEN CITA'\)/);
  assert.match(source, /\^\(\\d\|\[01\]\\d\|2\[0-3\]\):\(\[0-5\]\\d\)\$/);
});

test('GET is disabled before upstream call', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error('should not be called');
  };

  try {
    const response = await handleApiGet(
      new Request('https://cita.example/api?action=availability&token=x'),
      { APPS_SCRIPT_URL: 'https://script.example/exec' },
    );
    assert.equal(response.status, 405);
    assert.equal(called, false);
    assert.deepEqual(await response.json(), { ok: false, error: 'METHOD_NOT_ALLOWED' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('POST forwards availability without query tokens and strips all private fields', async () => {
  const originalFetch = globalThis.fetch;
  let forwardedUrl = ''; let forwardedInit;
  globalThis.fetch = async (url, init) => {
    forwardedInit = init;
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
    const token = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const response = await handleApiPost(
      new Request('https://cita.example/api', { method:'POST', body:JSON.stringify({action:'availability', token}) }),
      {
        APPS_SCRIPT_URL: 'https://script.example/exec',
        WHATSAPP_TARGET: '+34 600 111 222',
      },
    );

    assert.equal(response.status, 200);
    assert.equal(forwardedUrl, 'https://script.example/exec');
    assert.equal(forwardedInit.method, 'POST');
    assert.deepEqual(JSON.parse(forwardedInit.body), {action:'availability', token});

    assert.deepEqual(await response.json(), {
      ok: true,
      client: {
        firstName: 'Cliente',
      },
      booking: null,
      slots: [{ slotId: 'SLT-1234', date: '2026-09-10', time: '09:00' }],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('POST forwards only action, token and slotId and sanitizes response', async () => {
  const originalFetch = globalThis.fetch;
  let forwardedBody = null;
  globalThis.fetch = async (_url, init) => {
    forwardedBody = JSON.parse(init.body);
    return new Response(JSON.stringify({
      ok: true,
      booking: {
        date: '2026-09-10',
        time: '10:30',
        status: 'CONFIRMADO',
        clientId: 'PRIVATE',
      },
      internal: 'PRIVATE',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const response = await handleApiPost(
      new Request('https://cita.example/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'book',
          token: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          slotId: 'SLT-123456789abc',
          block: 'ATTACKER-CONTROLLED',
          clientId: 'ATTACKER-CONTROLLED',
        }),
      }),
      { APPS_SCRIPT_URL: 'https://script.example/exec' },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(forwardedBody, {
      action: 'book',
      token: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      slotId: 'SLT-123456789abc',
    });
    assert.deepEqual(await response.json(), {
      ok: true,
      booking: { date: '2026-09-10', time: '10:30', status: 'CONFIRMADO' },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('invalid upstream JSON is normalized to 502', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html>not json</html>', { status: 200 });

  try {
    const response = await handleApiPost(
      new Request('https://cita.example/api', {method:'POST', body:JSON.stringify({action:'availability', token:'a'.repeat(64)})}),
      { APPS_SCRIPT_URL: 'https://script.example/exec' },
    );
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { ok: false, error: 'UPSTREAM_INVALID_JSON' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('worker sends non-api requests to static assets binding', async () => {
  let received = '';
  const response = await worker.fetch(new Request('https://cita.example/styles.css'), {
    ASSETS: {
      async fetch(request) {
        received = new URL(request.url).pathname;
        return new Response('asset-ok');
      },
    },
  });
  assert.equal(received, '/styles.css');
  assert.equal(await response.text(), 'asset-ok');
});

test('worker rejects unsupported /api methods', async () => {
  const response = await worker.fetch(new Request('https://cita.example/api', { method: 'PUT' }), {});
  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), { ok: false, error: 'METHOD_NOT_ALLOWED' });
});
