import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { apiKey, apiUrl } = await request.json();
    
    // Update user with WakaTime settings
    await prisma.user.update({
      where: { userId: session.userId },
      data: {
        wakatimeApiKey: apiKey,
        wakatimeApiUrl: apiUrl || null,
      },
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error saving WakaTime settings:', error);
    return NextResponse.json(
      { error: 'Failed to save WakaTime settings' },
      { status: 500 }
    );
  }
}
