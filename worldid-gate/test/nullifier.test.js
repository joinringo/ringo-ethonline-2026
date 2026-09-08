import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeNullifier, isCanonical } from '../src/nullifier.js';

test('strips leading zeros, because "123" and "0123" are distinct index keys', () => {
  assert.equal(canonicalizeNullifier('123'), '123');
  assert.equal(canonicalizeNullifier('0123'), '123');
  assert.equal(canonicalizeNullifier('000000123'), '123');
  // The whole point: every spelling collapses to one key.
  const spellings = ['123', '0123', '00123', '0000000000123'];
  const canonical = new Set(spellings.map(canonicalizeNullifier));
  assert.equal(canonical.size, 1, 'all spellings of one human must collapse to one key');
});

test('converts 0x-hex, which is what IDKit actually returns', () => {
  assert.equal(canonicalizeNullifier('0x7b'), '123');
  assert.equal(canonicalizeNullifier('0x007b'), '123');
  assert.equal(canonicalizeNullifier('0X7B'), '123');
  // Hex and decimal spellings of one human must also collapse together.
  assert.equal(canonicalizeNullifier('0x7b'), canonicalizeNullifier('123'));
});

test('a real 32-byte nullifier survives without precision loss', () => {
  const hex = '0x2a1b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f809';
  const dec = canonicalizeNullifier(hex);
  assert.equal(dec, BigInt(hex).toString());
  // Number() would have rounded this; BigInt does not.
  assert.notEqual(dec, String(Number(hex)));
  assert.equal(canonicalizeNullifier(dec), dec, 'decimal round-trips');
});

test('rejects zero: it would pin the whole fence to one row', () => {
  assert.equal(canonicalizeNullifier('0'), null);
  assert.equal(canonicalizeNullifier('0000'), null);
  assert.equal(canonicalizeNullifier('0x0'), null);
  assert.equal(canonicalizeNullifier('0x000'), null);
});

test('rejects anything that is not a field element', () => {
  for (const bad of [
    '', '   ', 'abc', '12.5', '-1', '1e3', '0x', '0xzz', '1 2',
    '12345678901234567890123456789012345678901234567890123456789012345678901234567890', // 80 digits
    null, undefined, {}, [], true, Symbol.iterator,
  ]) {
    assert.equal(canonicalizeNullifier(bad), null, `should reject ${String(bad)}`);
  }
});

test('is total: a throwing toString cannot crash the payment path', () => {
  const hostile = { toString() { throw new Error('boom'); } };
  assert.equal(canonicalizeNullifier(hostile), null);
});

test('trims surrounding whitespace but not internal', () => {
  assert.equal(canonicalizeNullifier('  123  '), '123');
  assert.equal(canonicalizeNullifier('1 23'), null);
});

test('isCanonical only accepts the canonical spelling', () => {
  assert.equal(isCanonical('123'), true);
  assert.equal(isCanonical('0123'), false);
  assert.equal(isCanonical('0x7b'), false);
});
