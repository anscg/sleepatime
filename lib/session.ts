import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';

export type SessionData = {
  userId: string;
  isLoggedIn: boolean;
};

export const defaultSession: SessionData = {
  userId: '',
  isLoggedIn: false,
};

export async function getSession() {
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

  if (!session.isLoggedIn) {
    session.userId = defaultSession.userId;
    session.isLoggedIn = defaultSession.isLoggedIn;
  }

  return session;
}
