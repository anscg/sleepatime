import { createWorker, createScheduler, sleepSyncQueue } from './queues';
import { sleepSyncProcessor } from './workers/sleep-sync.worker';
import { setupQueues } from './config';

// Initialize scheduler
const sleepSyncScheduler = createScheduler('sleep-sync');

// Initialize worker
const sleepSyncWorker = createWorker('sleep-sync', sleepSyncProcessor);

// Handle worker events
sleepSyncWorker.on('completed', job => {
  console.log(`Sleep sync job ${job.id} completed successfully`);
});

sleepSyncWorker.on('failed', (job, err) => {
  console.error(`Sleep sync job ${job?.id} failed:`, err);
});

export async function initializeQueues() {
  // Setup recurring jobs
  await setupQueues();
  console.log('Queue system initialized');
}

export { sleepSyncQueue };
