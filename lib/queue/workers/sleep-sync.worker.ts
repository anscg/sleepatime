import { Job } from 'bullmq';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SyncJobData {
  userId?: string; // Optional - if provided, sync only this user
}

export async function sleepSyncProcessor(job: Job<SyncJobData>) {
  console.log(`Processing sleep sync job ${job.id}`);
  
  try {
    // Get all users or specific user
    const users = job.data.userId 
      ? [await prisma.user.findUnique({ where: { userId: job.data.userId } })]
      : await prisma.user.findMany({
          where: { 
            accessToken: { not: null },
            tokenExpires: { gt: new Date() } 
          }
        });
    
    if (!users.length) {
      console.log('No valid users to sync');
      return { success: true, usersProcessed: 0 };
    }
    
    let successCount = 0;
    
    for (const user of users) {
      if (!user) continue;
      
      // Check if token needs refresh
      if (user.tokenExpires && new Date(user.tokenExpires) <= new Date()) {
        await refreshFitbitToken(user);
      }
      
      // Get yesterday's sleep data
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      
      // Fetch sleep data from Fitbit
      const sleepData = await fetchFitbitSleepData(user, dateStr);
      
      // Format and send to WakaTime
      if (sleepData) {
        await sendSleepDataToWakaTime(user, sleepData);
        successCount++;
      }
    }
    
    console.log(`Successfully synced ${successCount} users`);
    return { success: true, usersProcessed: successCount };
  } catch (error) {
    console.error('Error in sleep sync job:', error);
    throw error;
  }
}

async function refreshFitbitToken(user: any) {
  try {
    const tokenResponse = await axios.post(
      'https://api.fitbit.com/oauth2/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: user.refreshToken
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`
          ).toString('base64')}`
        }
      }
    );
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Update token expiration
    const expirationDate = new Date();
    expirationDate.setSeconds(expirationDate.getSeconds() + expires_in);
    
    // Update user tokens
    await prisma.user.update({
      where: { userId: user.userId },
      data: {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpires: expirationDate
      }
    });
    
    return access_token;
  } catch (error) {
    console.error('Error refreshing Fitbit token:', error);
    throw error;
  }
}

async function fetchFitbitSleepData(user: any, date: string) {
  try {
    const response = await axios.get(
      `https://api.fitbit.com/1.2/user/-/sleep/date/${date}.json`,
      {
        headers: {
          Authorization: `Bearer ${user.accessToken}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching Fitbit sleep data for user ${user.userId}:`, error);
    return null;
  }
}
  
async function sendSleepDataToWakaTime(user: any, sleepData: any) {
  if (!sleepData || !sleepData.sleep || sleepData.sleep.length === 0) {
    console.log(`No sleep data for user ${user.userId}`);
    return;
  }
  
  try {
    // Parse sleep data
    const mainSleep = sleepData.sleep.find((s: any) => s.isMainSleep) || sleepData.sleep[0];
    
    // Extract important metrics
    const startTime = new Date(mainSleep.startTime).toISOString();
    const endTime = new Date(mainSleep.endTime).toISOString();
    const minutesAsleep = mainSleep.minutesAsleep;
    const efficiency = mainSleep.efficiency;
    
    // Send data to WakaTime API
    await axios.post(
      'https://api.wakatime.com/api/v1/users/current/durations',
      {
        time: startTime,
        duration: minutesAsleep * 60, // Convert minutes to seconds for WakaTime
        project: 'Sleep',
        category: 'Sleep',
        entity: 'Sleep',
        type: 'sleep',
        language: 'sleep',
        dependencies: [
          `efficiency:${efficiency}`,
          `sleepStart:${startTime}`,
          `sleepEnd:${endTime}`
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${user.wakatimeApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`Successfully sent sleep data for user ${user.userId}`);
    return true;
  } catch (error) {
    console.error(`Error sending data to WakaTime for user ${user.userId}:`, error);
    return false;
  }
}