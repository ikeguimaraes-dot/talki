import test from 'node:test';
import assert from 'node:assert/strict';
import { miniToday, isMiniToday } from '../src/lib/mini.ts';
test('today follows Brasilia across UTC midnight', () => {
  assert.equal(miniToday(new Date('2026-10-03T01:30:00Z')), '2026-10-02');
});
test('today includes overdue and work already started, excludes future and undated', () => {
  const day='2026-10-02';
  assert.equal(isMiniToday({ inicio: null, prazo: '2026-10-01' }, day), true);
  assert.equal(isMiniToday({ inicio: '2026-10-01', prazo: '2026-10-09' }, day), true);
  assert.equal(isMiniToday({ inicio: null, prazo: '2026-10-03' }, day), false);
  assert.equal(isMiniToday({ inicio: null, prazo: null }, day), false);
});
