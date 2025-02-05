import { initializeQueues } from '@/lib/queue';

let initialized = false;

export function initialize() {
  if (!initialized) {
    console.log('Initializing queue system...');
    initializeQueues()
      .then(() => {
        console.log('Queue system initialized successfully');
        initialized = true;
      })
      .catch(error => {
        console.error('Failed to initialize queue system:', error);
      });
  }
}