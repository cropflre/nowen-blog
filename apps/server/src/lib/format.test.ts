import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateReadingTime, nowIso, randomId, slugify } from './format';

describe('format helpers', () => {
  test('slugify keeps Unicode letters and normalizes separators', () => {
    assert.equal(slugify('  React + SQLite 入门  '), 'react-sqlite-入门');
    assert.equal(slugify('Hello___World'), 'hello-world');
  });

  test('estimateReadingTime always returns at least one minute', () => {
    assert.equal(estimateReadingTime(''), 1);
    assert.ok(estimateReadingTime('中文内容'.repeat(500)) > 1);
  });

  test('randomId applies prefix and remains unique enough for sequential calls', () => {
    const first = randomId('test_');
    const second = randomId('test_');
    assert.match(first, /^test_/);
    assert.notEqual(first, second);
  });

  test('nowIso returns an ISO timestamp', () => {
    const value = nowIso();
    assert.equal(new Date(value).toISOString(), value);
  });
});
