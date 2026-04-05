import assert from 'node:assert/strict';
import {
  addBeforeCursorFilter,
  buildCursorPage,
  parseCursor,
  parseLimit,
} from '../utils/cursor';
import {
  isPasswordStrong,
  validatePasswordPolicy,
  passwordPolicyMessages,
} from '../utils/passwordPolicy';

const run = () => {
  assert.equal(parseLimit(undefined, 10, 50), 10);
  assert.equal(parseLimit('100', 10, 50), 50);
  assert.equal(parseLimit('5', 10, 50), 5);

  const parsed = parseCursor('2026-01-01T00:00:00.000Z', '507f1f77bcf86cd799439011');
  assert.ok(parsed);
  assert.equal(parsed?.before, '2026-01-01T00:00:00.000Z');
  assert.equal(parsed?.beforeId, '507f1f77bcf86cd799439011');

  assert.throws(() => parseCursor('not-a-date', undefined), /Invalid cursor timestamp/);
  assert.throws(() => parseCursor('2026-01-01T00:00:00.000Z', 'bad-id'), /Invalid cursor id/);

  const filter: Record<string, unknown> = { targetType: 'post' };
  const cursor = parseCursor('2026-01-01T00:00:00.000Z', '507f1f77bcf86cd799439011');
  const result = addBeforeCursorFilter(filter, cursor);
  assert.ok(Array.isArray((result as any).$and));
  assert.equal((result as any).$and.length, 1);

  const rows = [
    { _id: '1', createdAt: '2026-01-03T00:00:00.000Z' },
    { _id: '2', createdAt: '2026-01-02T00:00:00.000Z' },
    { _id: '3', createdAt: '2026-01-01T00:00:00.000Z' },
  ];

  const pageWithMore = buildCursorPage(rows, 2);
  assert.equal(pageWithMore.items.length, 2);
  assert.deepEqual(pageWithMore.nextCursor, {
    before: '2026-01-02T00:00:00.000Z',
    beforeId: '2',
  });

  const finalPage = buildCursorPage(rows.slice(0, 2), 2);
  assert.equal(finalPage.items.length, 2);
  assert.equal(finalPage.nextCursor, null);

  const strong = 'Str0ng!Pass';
  assert.equal(isPasswordStrong(strong), true);
  assert.deepEqual(validatePasswordPolicy(strong), {
    minLength: true,
    uppercase: true,
    lowercase: true,
    number: true,
    symbol: true,
  });

  const weak = 'password';
  const checks = validatePasswordPolicy(weak);
  assert.equal(isPasswordStrong(weak), false);
  assert.equal(checks.uppercase, false);
  assert.equal(checks.number, false);
  assert.equal(checks.symbol, false);
  assert.equal(passwordPolicyMessages.minLength, 'Password must be at least 8 characters long');

  console.log('All backend checks passed.');
};

run();
