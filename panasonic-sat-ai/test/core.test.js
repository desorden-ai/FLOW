import test from 'node:test';
import assert from 'node:assert/strict';
import { corsHeaders, normalize, parseAndValidateInput } from '../src/core.js';

test('accepts bounded ServicePro text', () => {
  assert.deepEqual(parseAndValidateInput({ text: 'WO-123' }, 18), { text: 'WO-123', image: '', mimeType: '' });
});

test('rejects unsupported image types', () => {
  assert.throws(() => parseAndValidateInput({ image: 'YWJj', mimeType: 'image/gif' }, 30), error => error.code === 'IMAGE_TYPE_NOT_ALLOWED');
});

test('accepts and strips the Capacitor data URL', () => {
  assert.deepEqual(
    parseAndValidateInput({ image: 'data:image/jpeg;base64,YWJj', mimeType: 'image/jpeg' }, 64),
    { text: '', image: 'YWJj', mimeType: 'image/jpeg' }
  );
});

test('normalizes and clamps Gemini output', () => {
  const result = normalize({ customer: { name: ' Ana ' }, meta: { confidence: 140, warnings: [' duda '] } });
  assert.equal(result.customer.name, 'Ana');
  assert.equal(result.meta.confidence, 100);
  assert.deepEqual(result.meta.warnings, ['duda']);
  assert.equal(result.servicePro.workOrder, '');
});

test('CORS is limited to the Capacitor origin', () => {
  assert.equal(corsHeaders('https://localhost')['access-control-allow-origin'], 'https://localhost');
  assert.equal(corsHeaders('https://attacker.example')['access-control-allow-origin'], undefined);
});
