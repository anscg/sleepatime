import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, defaultSession } from '@/lib/session';
import { NextResponse } from 'next/server';

export async function POST() {
  const session = await getIronSession<SessionData>(cookies(), {
    password: process.env.SESSION_SECRET as string,
    cookieName: 'sleeptime-session',
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  });

  // Reset session to default values
  session.userId = defaultSession.userId;
  session.isLoggedIn = defaultSession.isLoggedIn;
  await session.save();
  
  return NextResponse.redirect(new URL('/', process.env.FITBIT_REDIRECT_URI as string));
}
