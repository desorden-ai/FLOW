import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const TOKEN_A = 'a'.repeat(64);
const TOKEN_B = 'b'.repeat(64);
const INVALID = 'not-a-valid-token';

function runBootstrap(hash, search, stored) {
  const storage = new Map();
  if (stored) storage.set('desorden_cita_booking_token', stored);
  let replacedPath = null;
  const context = vm.createContext({
    location: {
      hash: hash || '',
      search: search || '',
      pathname: '/',
    },
    sessionStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    history: {
      replaceState: (_state, _title, path) => { replacedPath = path; },
    },
    document: { querySelector: () => null, querySelectorAll: () => [] },
    fetch: () => {},
    Intl,
    URLSearchParams,
    // Expose a variable the test can read:
    _result: '',
  });
  const source = fs.readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
  // Only run the bootstrapToken portion — stop before DOM interaction.
  const bootstrap = source.slice(0, source.indexOf('const COPY'));
  // Replace `const token = bootstrapToken()` so result is accessible on context.
  const patched = bootstrap.replace('const token = bootstrapToken();', '_result = bootstrapToken();');
  vm.runInContext(patched, context);
  return {
    token: context._result,
    storage,
    replacedPath,
  };
}

test('A: URL #c=TOKEN_B overrides sessionStorage TOKEN_A', () => {
  const result = runBootstrap('#c=' + TOKEN_B, '', TOKEN_A);
  assert.equal(result.token, TOKEN_B, 'URL token must win');
  assert.equal(result.storage.get('desorden_cita_booking_token'), TOKEN_B, 'storage updated to TOKEN_B');
  assert.equal(result.replacedPath, '/', 'URL scrubbed');
});

test('B: URL ?c=TOKEN_B (legacy) overrides sessionStorage TOKEN_A', () => {
  const result = runBootstrap('', '?c=' + TOKEN_B, TOKEN_A);
  assert.equal(result.token, TOKEN_B, 'legacy query token must win');
  assert.equal(result.storage.get('desorden_cita_booking_token'), TOKEN_B, 'storage updated to TOKEN_B');
});

test('C: URL #c=INVALID clears sessionStorage, does not reuse TOKEN_A', () => {
  const result = runBootstrap('#c=' + INVALID, '', TOKEN_A);
  assert.equal(result.token, '', 'invalid explicit token yields empty');
  assert.equal(result.storage.has('desorden_cita_booking_token'), false, 'old token removed from storage');
  assert.equal(result.replacedPath, '/', 'URL scrubbed');
});

test('D: no URL c param falls back to sessionStorage TOKEN_A', () => {
  const result = runBootstrap('', '', TOKEN_A);
  assert.equal(result.token, TOKEN_A, 'sessionStorage fallback');
  assert.equal(result.storage.get('desorden_cita_booking_token'), TOKEN_A, 'storage preserved');
});

test('E: regenerated TOKEN_B in URL replaces old TOKEN_A from storage', () => {
  const result = runBootstrap('#c=' + TOKEN_B, '', TOKEN_A);
  assert.equal(result.token, TOKEN_B, 'new regenerated token wins');
  assert.equal(result.storage.get('desorden_cita_booking_token'), TOKEN_B, 'storage now has TOKEN_B');
  assert.notEqual(result.token, TOKEN_A, 'old token not used');
});


test('F: fragment credential has priority over legacy query credential', () => {
  const result = runBootstrap('#c=' + TOKEN_B, '?c=' + TOKEN_A, 'c'.repeat(64));
  assert.equal(result.token, TOKEN_B, 'fragment token must win over query and storage');
  assert.equal(result.storage.get('desorden_cita_booking_token'), TOKEN_B, 'storage updated to fragment token');
});

test('G: explicit empty or malformed c never falls back to sessionStorage', () => {
  const empty = runBootstrap('#c=', '', TOKEN_A);
  assert.equal(empty.token, '', 'empty explicit credential yields no token');
  assert.equal(empty.storage.has('desorden_cita_booking_token'), false, 'stored token removed for empty explicit credential');

  const malformedQuery = runBootstrap('', '?c=bad', TOKEN_A);
  assert.equal(malformedQuery.token, '', 'malformed legacy credential yields no token');
  assert.equal(malformedQuery.storage.has('desorden_cita_booking_token'), false, 'stored token removed for malformed legacy credential');
});
