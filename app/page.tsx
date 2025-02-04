import { LoginButton } from "@/components/login-button";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();
  
  if (session.isLoggedIn) {
    redirect('/dashboard');
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-900 via-indigo-900 to-blue-900 text-white p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 shadow-xl">
        <div className="flex justify-center mb-6">
          <div className="relative">
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 flex items-center justify-center gap-2">
          <span>sleepatime ✨</span>
        </h1>

        <p className="text-xl text-center mb-6 text-purple-200">Track your sleep like you track your code</p>

        <p className="text-center mb-8 text-blue-200">
          Automatically sync your Fitbit sleep data to WakaTime and discover how your rest affects your productivity.
        </p>

        <div className="flex justify-center">
          <LoginButton />
        </div>

        <div className="mt-8 text-center text-xs text-blue-200 opacity-70">
          Your data is only synced with your permission
        </div>
      </div>
    </div>
  )
}

