import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app';
import { connectDatabase } from '../src/config/database';

let dbReady = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!dbReady) {
      await connectDatabase();
      dbReady = true;
    }

    return app(req, res);
  } catch (error) {
    console.error('Vercel handler startup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server initialization failed',
    });
  }
}
