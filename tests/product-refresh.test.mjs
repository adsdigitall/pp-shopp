import assert from 'node:assert/strict';
import test from 'node:test';

import { nextRefreshPage } from '../src/services/productRefresh.ts';

test('refresh rotates through result pages and wraps to the first page', () => {
  assert.equal(nextRefreshPage(1), 2);
  assert.equal(nextRefreshPage(2), 3);
  assert.equal(nextRefreshPage(5), 1);
});

test('refresh recovers from invalid page values', () => {
  assert.equal(nextRefreshPage(0), 1);
  assert.equal(nextRefreshPage(Number.NaN), 1);
});
