import { createClient } from 'redis';
import { config } from '../config/env';

type MediaJob = {
  imageUrl: string;
  source: 'media-upload' | 'post-create' | 'post-update';
  createdAt: string;
};

const JOB_QUEUE_KEY = 'jobs:media:postprocess';
let redisQueueClient: any = null;
let workerStarted = false;

const getRedisQueueClient = async (): Promise<any | null> => {
  if (!config.redisUrl) {
    return null;
  }

  if (redisQueueClient) {
    return redisQueueClient;
  }

  const client = createClient({ url: config.redisUrl });
  client.on('error', (error) => {
    console.error('Redis media queue client error:', error);
  });

  await client.connect();
  redisQueueClient = client;

  return client;
};

const processMediaJob = async (job: MediaJob) => {
  // Placeholder for background enhancements like thumbnail generation,
  // moderation scans, or metadata extraction.
  console.log(`[media-job] processed source=${job.source} imageUrl=${job.imageUrl}`);
};

export const enqueueMediaProcessingJob = async (
  imageUrl: string,
  source: MediaJob['source']
): Promise<void> => {
  if (!imageUrl) {
    return;
  }

  const payload: MediaJob = {
    imageUrl,
    source,
    createdAt: new Date().toISOString(),
  };

  const queueClient = await getRedisQueueClient();

  if (queueClient) {
    await queueClient.lPush(JOB_QUEUE_KEY, JSON.stringify(payload));
    return;
  }

  setImmediate(() => {
    void processMediaJob(payload);
  });
};

const startRedisWorkerLoop = async () => {
  const queueClient = await getRedisQueueClient();
  if (!queueClient) {
    return;
  }

  while (workerStarted) {
    try {
      const result = await queueClient.brPop(JOB_QUEUE_KEY, 3);
      if (!result?.element) {
        continue;
      }

      const parsed = JSON.parse(result.element) as MediaJob;
      await processMediaJob(parsed);
    } catch (error) {
      console.error('Media job worker error:', error);
    }
  }
};

export const startMediaJobWorker = async (): Promise<void> => {
  if (workerStarted || !config.enableMediaJobWorker) {
    return;
  }

  workerStarted = true;
  void startRedisWorkerLoop();
};
