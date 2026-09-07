import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAdminApi } from '../src/worker.js';

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
    const response = await handleAdminApi(new Request('https://cita.example/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer this-is-a-valid-length-key',
      },
      body: JSON.stringify({ action: 'snapshot' }),
    }), { APPS_SCRIPT_URL: 'https://script.example/exec' });

    assert.equal(response.status, 401);
    assert.equal(forwarded.action, 'adminSnapshot');
    assert.equal(forwarded.adminKey, 'this-is-a-valid-length-key');
    assert.deepEqual(await response.json(), { ok: false, error: 'UNAUTHORIZED' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
