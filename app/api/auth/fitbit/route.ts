import axios from 'axios';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { prisma } from '@/lib/prisma';
import { SessionData } from '@/lib/session';

const FITBIT_CLIENT_ID = process.env.FITBIT_CLIENT_ID as string;
const FITBIT_CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET as string;
const FITBIT_REDIRECT_URI = process.env.FITBIT_REDIRECT_URI as string;

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user_id: string;
  expires_in: number;
  token_type: string;
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    const authUrl = `https://www.fitbit.com/oauth2/authorize?response_type=code&client_id=${FITBIT_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      FITBIT_REDIRECT_URI
    )}&scope=sleep`;
    return NextResponse.redirect(authUrl);
  }

  try {
    console.log('Authorization Code:', code);

    // Exchange authorization code for access token
    const tokenResponse = await axios.post<TokenResponse>(
      'https://api.fitbit.com/oauth2/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        redirect_uri: FITBIT_REDIRECT_URI,
        code: code,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
      }
    );

    const { access_token, refresh_token, user_id, expires_in } = tokenResponse.data;
    
    // Calculate token expiration date
    const expirationDate = new Date();
    expirationDate.setSeconds(expirationDate.getSeconds() + expires_in);
    
    // Store or update user in database
    await prisma.user.upsert({
      where: { userId: user_id },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpires: expirationDate,
      },
      create: {
        userId: user_id,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpires: expirationDate,
      },
    });
    
    // Set session
    const session = await getIronSession<SessionData>(cookies(), {
      password: process.env.SESSION_SECRET as string,
      cookieName: 'sleeptime-session',
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      },
    });
    
    session.userId = user_id;
    session.isLoggedIn = true;
    await session.save();
    
    // Redirect to dashboard or homepage after successful login
    return NextResponse.redirect(new URL('/', request.url));

  } catch (error: any) {
    console.error('Error exchanging token:', error.response?.data || error);
    return NextResponse.json(
      {
        error: 'Failed to authenticate with Fitbit',
        details: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}
