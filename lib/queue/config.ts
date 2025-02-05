import { sleepSyncQueue } from './queues';

export async function setupQueues() {
  // Clear existing jobs
  await sleepSyncQueue.obliterate({ force: true });
  
  // Add recurring job for every 30 minutes
  await sleepSyncQueue.add(
    'sync-all-users',
    {},
    {
      repeat: {
        pattern: '*/30 * * * *'
      }
    }
  );
  
  console.log('Sleep sync queue initialized');
}