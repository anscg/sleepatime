import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';

export default async function Dashboard() {
  const session = await getSession();
  
  if (!session.isLoggedIn) {
    redirect('/');
  }
  
  // Fetch user data from database
  const user = await prisma.user.findUnique({
    where: {
      userId: session.userId,
    },
  });
  
  if (!user) {
    redirect('/');
  }
  
  // Check if the user has connected to WakaTime
  const isWakaTimeConnected = !!user.wakatimeApiKey;
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-900 via-indigo-900 to-blue-900 text-white p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 shadow-xl">
        <h1 className="text-3xl font-bold text-center mb-6">Dashboard</h1>
        <p className="text-center mb-4">You're logged in with Fitbit!</p>
        <p className="text-center mb-6 text-sm text-blue-200">User ID: {user.userId}</p>
        
        <div className="flex flex-col items-center gap-4 mb-6">
          {isWakaTimeConnected ? (
            <div className="text-center p-3 bg-green-500/20 rounded-md border border-green-500/30">
              <p className="text-green-300 font-medium">✓ Connected to WakaTime</p>
            </div>
          ) : (
            <a href="/api/auth/wakatime" className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-md transition text-center">
              Sync with WakaTime
            </a>
          )}
        </div>
        
        <form action="/api/auth/logout" method="post" className="flex justify-center">
          <button 
            type="submit"
            className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-md transition"
          >
            Logout
          </button>
        </form>
      </div>
    </div>
  );
}
