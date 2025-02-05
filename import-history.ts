import { PrismaClient } from '@prisma/client';
import axios from 'axios';

import {
  refreshFitbitToken,
  refreshWakatimeToken,
  fetchFitbitSleepData,
  sendSleepDataToWakaTime
} from './utils';

const prisma = new PrismaClient();

/**
 * Imports sleep data for a specific user for the past months
 * @param userId The user ID to import data for
 * @param months Number of months of history to import (default: 3)
 */
async function importHistoricalSleepData(userId: string, months: number = 3): Promise<{success: boolean; daysProcessed: number}> {
  console.log(`Importing ${months} months of sleep data for user ${userId}`);
  
  try {
    const user = await prisma.user.findUnique({ where: { userId } });
    
    if (!user) {
      console.error(`User ${userId} not found`);
      return { success: false, daysProcessed: 0 };
    }
    
    if (user.tokenExpires && new Date(user.tokenExpires) <= new Date()) {
      await refreshFitbitToken(user);
    }
    
    if (user.wakatimeTokenExpires && new Date(user.wakatimeTokenExpires) <= new Date()) {
      await refreshWakatimeToken(user);
    }
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    
    console.log(`Fetching sleep data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    const currentDate = new Date(startDate);
    let successCount = 0;
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      console.log(`Processing date: ${dateStr}`);
      
      const sleepData = await fetchFitbitSleepData(user, dateStr);
      
      if (sleepData) {
        const success = await sendSleepDataToWakaTime(user, sleepData);
        if (success) {
          successCount++;
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
      //i hate rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Successfully imported ${successCount} days of sleep data`);
    return { success: true, daysProcessed: successCount };
  } catch (error) {
    console.error('Error importing historical sleep data:', error);
    return { success: false, daysProcessed: 0 };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const userId = args[0];
  const months = parseInt(args[1]) || 3;
  
  if (!userId) {
    console.error('Please provide a user ID as the first argument');
    process.exit(1);
  }
  
  try {
    const result = await importHistoricalSleepData(userId, months);
    console.log('Import completed:', result);
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();
