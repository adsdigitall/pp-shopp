import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mergeFreshProducts,
  nextRefreshPage,
  nextRefreshQuery,
  getPullRefreshDistance,
  shouldTriggerPullRefresh,
} from '../src/services/productRefresh.ts';

test('refresh rotates through result pages and wraps to the first page', () => {
  assert.equal(nextRefreshPage(1), 2);
  assert.equal(nextRefreshPage(2), 3);
  assert.equal(nextRefreshPage(5), 1);
});

test('refresh recovers from invalid page values', () => {
  assert.equal(nextRefreshPage(0), 1);
  assert.equal(nextRefreshPage(Number.NaN), 1);
});

test('refresh prioritizes products not shown recently', () => {
  const current = [{ id: 'old-1' }, { id: 'old-2' }];
  const incoming = [{ id: 'old-2' }, { id: 'new-1' }, { id: 'new-2' }];
  assert.deepEqual(
    mergeFreshProducts(current, incoming, new Set(['old-1', 'old-2']), 2).map((item) => item.id),
    ['new-1', 'new-2'],
  );
});

test('refresh rotates discovery categories when no category is selected', () => {
  assert.equal(nextRefreshQuery('', 0).query, 'moda feminina');
  assert.equal(nextRefreshQuery('', 1).query, 'casa e banho');
  assert.deepEqual(nextRefreshQuery('celular', 3), { query: 'celular', nextIndex: 3 });
});

test('pull-to-refresh only activates while pulling down from the top', () => {
  assert.equal(getPullRefreshDistance(100, 240, 0), 70);
  assert.equal(getPullRefreshDistance(100, 240, 12), 0);
  assert.equal(getPullRefreshDistance(240, 100, 0), 0);
  assert.equal(shouldTriggerPullRefresh(70), true);
  assert.equal(shouldTriggerPullRefresh(40), false);
});
