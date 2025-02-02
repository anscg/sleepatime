import axios from 'axios';
import { NextResponse } from 'next/server';

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

    const { access_token, refresh_token, user_id } = tokenResponse.data;

    return NextResponse.json({ access_token, refresh_token, user_id });
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
