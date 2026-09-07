import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAdminApi } from '../src/worker.js';

test('admin API rejects requests without a valid bearer key before upstream access', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error('upstream should not be called');
  };

  try {
    const response = await handleAdminApi(new Request('https://cita.example/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'snapshot' }),
    }), { APPS_SCRIPT_URL: 'https://script.example/exec' });

    assert.equal(response.status, 401);
    assert.equal(called, false);
    assert.deepEqual(await response.json(), { ok: false, error: 'UNAUTHORIZED' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
