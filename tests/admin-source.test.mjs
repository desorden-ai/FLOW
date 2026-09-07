import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../apps-script/Admin.gs', import.meta.url), 'utf8');

test('client archive preserves source rows instead of physically deleting them', () => {
  assert.match(source, /setValue\(ADMIN_ARCHIVED_STATUS\)/);
  assert.doesNotMatch(source, /deleteRow\s*\(/);
  assert.doesNotMatch(source, /deleteRows\s*\(/);
});

test('confirmed clients are protected from archive and block moves', () => {
  assert.match(source, /CLIENT_CONFIRMED_CANNOT_ARCHIVE/);
  assert.match(source, /CLIENT_CONFIRMED_BLOCK_LOCKED/);
});

test('admin client creation reuses booking metadata synchronization', () => {
  assert.match(source, /adminCreateClient_/);
  assert.match(source, /syncClientMetadata\(\)/);
});
