import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NullifierStore } from '../src/store.js';

function store() { return new NullifierStore(':memory:'); }

test('records a nullifier once and reports it thereafter', () => {
  const s = store();
  assert.equal(s.has('123'), false);
  assert.equal(s.record('123', '4.0', 'claim'), true, 'first write is new');
  assert.equal(s.has('123'), true);
  assert.equal(s.count(), 1);
  s.close();
});

test('a second write of the same nullifier is not new, and does not duplicate', () => {
  const s = store();
  s.record('123', '4.0', 'claim');
  assert.equal(s.record('123', '4.0', 'claim'), false, 'repeat write is not first-time');
  assert.equal(s.count(), 1, 'the primary key prevents a second row');
  assert.equal(s.has('123'), true);
  s.close();
});

test('the uniqueness is the key, not a prior read', () => {
  // Two callers that both saw has() === false must not both record a new row.
  const s = store();
  const a = s.has('999') === false;
  const b = s.has('999') === false;
  assert.ok(a && b, 'both callers observed absent');
  const firstA = s.record('999', '4.0', null);
  const firstB = s.record('999', '4.0', null);
  assert.equal(firstA, true);
  assert.equal(firstB, false, 'only one of two racing writers may be first');
  assert.equal(s.count(), 1);
  s.close();
});

test('distinct nullifiers are distinct humans', () => {
  const s = store();
  s.record('123', '4.0', null);
  s.record('124', '4.0', null);
  assert.equal(s.count(), 2);
  assert.equal(s.has('123'), true);
  assert.equal(s.has('125'), false);
  s.close();
});
