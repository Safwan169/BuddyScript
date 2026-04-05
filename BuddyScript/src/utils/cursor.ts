import { Types } from 'mongoose';
import { AppError } from '../middleware/errorHandler';

export interface Cursor {
  before: string;
  beforeId: string;
}

export const parseLimit = (value: unknown, fallback: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(Math.floor(parsed), max);
};

export const parseCursor = (before: unknown, beforeId: unknown): Cursor | null => {
  if (!before) {
    return null;
  }

  if (typeof before !== 'string') {
    throw new AppError(400, 'Invalid cursor');
  }

  const date = new Date(before);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, 'Invalid cursor timestamp');
  }

  let normalizedBeforeId = '';
  if (beforeId !== undefined) {
    if (typeof beforeId !== 'string' || !Types.ObjectId.isValid(beforeId)) {
      throw new AppError(400, 'Invalid cursor id');
    }

    normalizedBeforeId = beforeId;
  }

  return {
    before: date.toISOString(),
    beforeId: normalizedBeforeId,
  };
};

export const addBeforeCursorFilter = (
  filter: Record<string, any>,
  cursor: Cursor | null,
  dateField = 'createdAt'
): Record<string, any> => {
  if (!cursor) {
    return filter;
  }

  const cursorDate = new Date(cursor.before);
  const clause = cursor.beforeId
    ? {
        $or: [
          { [dateField]: { $lt: cursorDate } },
          {
            [dateField]: cursorDate,
            _id: { $lt: new Types.ObjectId(cursor.beforeId) },
          },
        ],
      }
    : { [dateField]: { $lt: cursorDate } };

  if (filter.$and) {
    filter.$and.push(clause);
  } else {
    filter.$and = [clause];
  }

  return filter;
};

export const buildCursorPage = <T extends { _id: any; createdAt: Date | string }>(
  rows: T[],
  limit: number
) => {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  const last = items[items.length - 1];
  const nextCursor = hasMore && last
    ? {
        before: new Date(last.createdAt).toISOString(),
        beforeId: last._id.toString(),
      }
    : null;

  return {
    items,
    nextCursor,
  };
};
