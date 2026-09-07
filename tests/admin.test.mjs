import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAdminApi } from '../src/worker.js';

const VALID_KEY = 'this-is-a-valid-length-key';

function adminRequest(body) {
  return new Request('https://cita.example/api/admin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${VALID_KEY}`,
    },
    body: JSON.stringify(body),
  });
}

test('admin API rejects malformed bearer keys before upstream access', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error('upstream should not be called');
  };

  try {
    const response = await handleAdminApi(new Request('https://cita.example/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer short',
      },
      body: JSON.stringify({ action: 'snapshot' }),
    }), { APPS_SCRIPT_URL: 'https://script.example/exec' });

    assert.equal(response.status, 401);
    assert.equal(called, false);
    assert.deepEqual(await response.json(), { ok: false, error: 'UNAUTHORIZED' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('admin API forwards a structurally valid key to Apps Script for authoritative validation', async () => {
  const originalFetch = globalThis.fetch;
  let forwarded;
  globalThis.fetch = async (_url, init) => {
    forwarded = JSON.parse(init.body);
    return new Response(JSON.stringify({ ok: false, error: 'UNAUTHORIZED' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const response = await handleAdminApi(adminRequest({ action: 'snapshot' }), {
      APPS_SCRIPT_URL: 'https://script.example/exec',
    });

    assert.equal(response.status, 401);
    assert.equal(forwarded.action, 'adminSnapshot');
    assert.equal(forwarded.adminKey, VALID_KEY);
    assert.deepEqual(await response.json(), { ok: false, error: 'UNAUTHORIZED' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('admin API accepts and forwards eight dates with eight distinct times each', async () => {
  const originalFetch = globalThis.fetch;
  let forwarded;
  globalThis.fetch = async (_url, init) => {
    forwarded = JSON.parse(init.body);
    return new Response(JSON.stringify({
      ok: true,
      summary: {},
      blocks: [],
      appointments: [],
      limits: { maxDates: 8, maxTimesPerDate: 8, maxSasPerClient: 8 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
  const days = Array.from({ length: 8 }, (_, index) => ({
    date: `2026-09-${String(10 + index).padStart(2, '0')}`,
    times,
  }));

  try {
    const response = await handleAdminApi(adminRequest({
      action: 'updateAvailability',
      block: 'BLK-MARTORELL-01',
      days,
    }), { APPS_SCRIPT_URL: 'https://script.example/exec' });

    assert.equal(response.status, 200);
    assert.equal(forwarded.action, 'adminUpdateAvailability');
    assert.equal(forwarded.days.length, 8);
    assert.equal(forwarded.days[0].times.length, 8);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('admin API rejects a ninth date before upstream access', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error('should not call upstream'); };
  const days = Array.from({ length: 9 }, (_, index) => ({
    date: `2026-10-${String(index + 1).padStart(2, '0')}`,
    times: ['09:00'],
  }));

  try {
    const response = await handleAdminApi(adminRequest({
      action: 'updateAvailability', block: 'BLK-MARTORELL-01', days,
    }), { APPS_SCRIPT_URL: 'https://script.example/exec' });
    assert.equal(response.status, 400);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('admin API rejects a ninth time on one date before upstream access', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error('should not call upstream'); };
  const days = [{
    date: '2026-10-01',
    times: ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
  }];

  try {
    const response = await handleAdminApi(adminRequest({
      action: 'updateAvailability', block: 'BLK-MARTORELL-01', days,
    }), { APPS_SCRIPT_URL: 'https://script.example/exec' });
    assert.equal(response.status, 400);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('admin API validates and forwards createClient without exposing arbitrary fields', async () => {
  const originalFetch = globalThis.fetch;
  let forwarded;
  globalThis.fetch = async (_url, init) => {
    forwarded = JSON.parse(init.body);
    return new Response(JSON.stringify({
      ok: true,
      summary: {},
      blocks: [],
      appointments: [],
      limits: {},
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const response = await handleAdminApi(adminRequest({
      action: 'createClient',
      client: {
        name: 'Cliente Test',
        phone: '+34 600 000 000',
        address: 'Calle Test 1',
        city: 'Martorell',
        block: 'BLK-MARTORELL-01',
        sas: ['SA-10001', 'SA-10002'],
        injected: 'should-not-pass',
      },
    }), { APPS_SCRIPT_URL: 'https://script.example/exec' });

    assert.equal(response.status, 200);
    assert.equal(forwarded.action, 'adminUpdateAvailability');
    assert.equal(forwarded.mode, 'createClient');
    assert.deepEqual(forwarded.client.sas, ['SA-10001', 'SA-10002']);
    assert.equal('injected' in forwarded.client, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('admin API rejects malformed client data before upstream access', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error('should not call upstream'); };

  try {
    const response = await handleAdminApi(adminRequest({
      action: 'createClient',
      client: { name: '', address: '', city: '', block: 'bad block', sas: [] },
    }), { APPS_SCRIPT_URL: 'https://script.example/exec' });

    assert.equal(response.status, 400);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('admin API maps confirmed-client archive protection to conflict', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    ok: false,
    error: 'CLIENT_CONFIRMED_CANNOT_ARCHIVE',
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    const response = await handleAdminApi(adminRequest({
      action: 'archiveClient',
      clientId: 'CLI-abcdef123456',
    }), { APPS_SCRIPT_URL: 'https://script.example/exec' });

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      ok: false,
      error: 'CLIENT_CONFIRMED_CANNOT_ARCHIVE',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
