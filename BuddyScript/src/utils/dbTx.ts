import mongoose, { ClientSession } from 'mongoose';

const isTransactionUnsupportedError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  return (
    message.includes('transaction numbers are only allowed') ||
    message.includes('replica set') ||
    message.includes('standalone')
  );
};

export const runInTransaction = async <T>(
  operation: (session?: ClientSession) => Promise<T>
): Promise<T> => {
  const session = await mongoose.startSession();

  try {
    let result: T | undefined;

    await session.withTransaction(async () => {
      result = await operation(session);
    });

    return result as T;
  } catch (error) {
    if (isTransactionUnsupportedError(error)) {
      return operation(undefined);
    }

    throw error;
  } finally {
    await session.endSession();
  }
};
