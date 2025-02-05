import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await getSession();
  
  if (!session.isLoggedIn) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  
  // If no code is present, redirect to WakaTime auth
  if (!code) {
    const wakatimeAuthUrl = `https://wakatime.com/oauth/authorize?client_id=${process.env.WAKATIME_CLIENT_ID}&response_type=code&scope=email,read_stats,write_heartbeats&redirect_uri=${encodeURIComponent(process.env.WAKATIME_REDIRECT_URI || '')}`;
    return NextResponse.redirect(wakatimeAuthUrl);
  }
  
  // Exchange code for access token
  try {
    const tokenResponse = await fetch('https://wakatime.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.WAKATIME_CLIENT_ID || '',
        client_secret: process.env.WAKATIME_CLIENT_SECRET || '',
        redirect_uri: process.env.WAKATIME_REDIRECT_URI || '',
        grant_type: 'authorization_code',
        code,
      }),
    });
    
    if (!tokenResponse.ok) {
      console.error('WakaTime token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(new URL('/dashboard?error=wakatime_auth_failed', request.url));
    }
    
    // Parse the response text first to debug issues
    const responseText = await tokenResponse.text();
    console.log('WakaTime token response:', responseText);
    
    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse WakaTime token response as JSON:', e);
      // Try parsing a different way - some APIs return URL encoded format
      const params = new URLSearchParams(responseText);
      tokenData = {
        access_token: params.get('access_token'),
        refresh_token: params.get('refresh_token'),
        expires_in: params.get('expires_in')
      };
      
      if (!tokenData.access_token) {
        throw new Error('Could not extract access token from WakaTime response');
      }
    }
    
    // Calculate token expiration date if expires_in is available
    let tokenExpires = null;
    if (tokenData.expires_in) {
      tokenExpires = new Date();
      tokenExpires.setSeconds(tokenExpires.getSeconds() + parseInt(tokenData.expires_in));
    }
    
    // Get user data from WakaTime
    const userResponse = await fetch('https://wakatime.com/api/v1/users/current', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    
    if (!userResponse.ok) {
      console.error('Failed to fetch WakaTime user data');
      return NextResponse.redirect(new URL('/dashboard?error=wakatime_user_fetch_failed', request.url));
    }
    
    const userData = await userResponse.json();
    
    // Update user in database
    await prisma.user.update({
      where: {
        userId: session.userId,
      },
      data: {
        wakatimeApiKey: tokenData.access_token,
        wakatimeRefreshToken: tokenData.refresh_token,
        wakatimeTokenExpires: tokenExpires,
        wakatimeApiUrl: userData.data.api_url,
      },
    });
    
    // Redirect back to dashboard - use absolute URL
    return NextResponse.redirect(new URL('/dashboard?success=wakatime_connected', request.url));
  } catch (error) {
    console.error('Error during WakaTime authentication:', error);
    return NextResponse.redirect(new URL('/dashboard?error=wakatime_auth_error', request.url));
  }
}
