import { Queue, Worker, QueueScheduler } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection
export const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

// Queue options
export const defaultQueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  },
};

// Define specific queue instances
export const sleepSyncQueue = createQueue('sleep-sync');

// Factory functions to create queue components
export function createQueue(name: string) {
  return new Queue(name, defaultQueueOptions);
}

export function createWorker(name: string, processor: any) {
  return new Worker(name, processor, {
    connection,
    concurrency: 5,
  });
}

export function createScheduler(name: string) {
  return new QueueScheduler(name, { connection });
}