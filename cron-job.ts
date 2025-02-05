import * as cron from "node-cron";
import { syncSleepData } from './utils';

console.log("Sleep sync cron job started. Scheduling task...");

// Schedule to run once a day at midnight
cron.schedule("0 0 * * *", async () => {
  console.log("Running daily sleep sync job...");
  try {
    const result = await syncSleepData();
    console.log("Sleep sync job finished:", result);
  } catch (error) {
    console.error("Error running sleep sync job:", error);
  }
});

// Keep the script running
process.stdin.resume();
