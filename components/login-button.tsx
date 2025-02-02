'use client'

import { Button } from "@/components/ui/button"

export function LoginButton() {
  const handleLogin = () => {
    window.location.href = '/api/auth/fitbit';
  };

  return (
    <Button 
      onClick={handleLogin}
      className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-medium px-6 py-6 rounded-full shadow-lg transition-all hover:shadow-xl"
    >
      <span className="flex items-center gap-2 text-lg">
        Connect with Fitbit
      </span>
    </Button>
  );
}
