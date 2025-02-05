import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function refreshFitbitToken(user: any) {
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

export async function fetchFitbitSleepData(user: any, date: string) {
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

export async function refreshWakatimeToken(user: any) {
  try {
    const tokenResponse = await axios.post(
      'https://wakatime.com/oauth/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: user.wakatimeRefreshToken,
        client_id: process.env.WAKATIME_CLIENT_ID || '',
        client_secret: process.env.WAKATIME_CLIENT_SECRET || '',
        redirect_uri: process.env.WAKATIME_REDIRECT_URI || ''
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
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
        wakatimeApiKey: access_token,
        wakatimeRefreshToken: refresh_token,
        wakatimeTokenExpires: expirationDate
      }
    });
    
    return access_token;
  } catch (error) {
    console.error('Error refreshing WakaTime token:', error);
    throw error;
  }
}

export async function sendSleepDataToWakaTime(user: any, sleepData: any) {
  if (!sleepData || !sleepData.sleep || sleepData.sleep.length === 0) {
    console.log(`No sleep data for user ${user.userId}`);
    return false;
  }
  
  try {
    // Check if WakaTime token needs refresh
    if (user.wakatimeTokenExpires && new Date(user.wakatimeTokenExpires) <= new Date()) {
      console.log(`Refreshing WakaTime token for user ${user.userId}`);
      user.wakatimeApiKey = await refreshWakatimeToken(user);
    }
    
    // Parse sleep data
    const mainSleep = sleepData.sleep.find((s: any) => s.isMainSleep) || sleepData.sleep[0];
    
    // Extract important metrics
    const startTime = new Date(mainSleep.startTime);
    const endTime = new Date(mainSleep.endTime);
    const minutesAsleep = mainSleep.minutesAsleep;
    const efficiency = mainSleep.efficiency;
    
    // Determine the API endpoint to use (default or custom)
    const apiBaseUrl = user.wakatimeApiUrl || 'https://api.wakatime.com';
    const apiEndpoint = `${apiBaseUrl}/api/v1/users/current/external_durations`;
    
    // Create a unique external_id using the date and user to prevent duplicates
    const dateStr = startTime.toISOString().split('T')[0];
    const externalId = `sleep_${user.userId}_${dateStr}`;
    
    // Prepare the external duration data
    const durationData = {
      external_id: externalId,
      entity: `Sleep (${minutesAsleep} min, ${efficiency}% efficiency)`,
      type: 'app',
      category: 'indexing',
      start_time: startTime.getTime() / 1000, // Convert to UNIX timestamp
      end_time: endTime.getTime() / 1000,     // Convert to UNIX timestamp
      project: 'Sleep',
      meta: `Sleep duration: ${minutesAsleep} minutes, Efficiency: ${efficiency}%`
    };
    
    // Send the data to WakaTime
    const response = await axios.post(
      apiEndpoint,
      durationData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.wakatimeApiKey}`
        }
      }
    );
    
    console.log(`Sleep data sent to WakaTime for user ${user.userId}`);
    return true;
  } catch (error) {
    console.error(`Error sending data to WakaTime for user ${user.userId}:`, error);
    return false;
  }
}

export async function syncSleepData(userId?: string): Promise<{ success: boolean; usersProcessed: number }> {
  console.log(`Processing sleep sync for ${userId || 'all users'}`);
  
  try {
    // Get all users or specific user
    const users = userId 
      ? [await prisma.user.findUnique({ where: { userId } })]
      : await prisma.user.findMany({
          where: { 
            accessToken: { not: "" },
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
