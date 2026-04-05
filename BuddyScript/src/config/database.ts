import mongoose from "mongoose";
import { config } from './env';

const MONGODB_URI = config.mongoUri;

export const connectDatabase = async (): Promise<void> => {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured');
  }

  // Reuse the current connection in warm serverless instances.
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 30000,
      connectTimeoutMS: 10000,
    });
  } catch (error) {
    throw error;
  }
};

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  process.exit(0);
});
