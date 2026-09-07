import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../apps-script/DashboardV4.gs', import.meta.url), 'utf8');

test('Dashboard V4 source parses as JavaScript', () => {
  assert.doesNotThrow(() => new vm.Script(source));
});

test('Dashboard V4 provides editable availability controller', () => {
  assert.match(source, /function installDashboardV4\(\)/);
  assert.match(source, /function handleDashboardEditV4\(e\)/);
  assert.match(source, /function applyDashboardAvailabilityV4\(rowNumber\)/);
  assert.match(source, /CAMBIOS PENDIENTES/);
  assert.match(source, /everyMinutes\(5\)/);
});

test('Dashboard V4 preserves confirmed slots while replacing free availability', () => {
  assert.match(source, /status === 'CONFIRMADO'/);
  assert.match(source, /status === 'LIBRE'/);
  assert.match(source, /confirmedKeys\[key\]/);
  assert.match(source, /clearContent\(\)/);
  assert.match(source, /'SLT-' \+ randomHex_\(12\)/);
});

test('Dashboard V4 groups confirmed appointments by booking unit', () => {
  assert.match(source, /const units = \{\}/);
  assert.match(source, /units\[id\]/);
  assert.match(source, /Object\.keys\(unit\.sas\)\.sort\(\)\.join\(' \/ '\)/);
  assert.match(source, /renderConfirmedAppointmentsV4_/);
});
