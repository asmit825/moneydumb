'use client';

import { useState } from 'react';
import { authenticate, loginDemoUser } from '@/app/lib/actions'; // Import the new action

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDemoClick = async () => {
    setLoading(true);
    await loginDemoUser(); // Calls the server action we just made
  };

  return (
    <div className="min-h-screen bg-retro-black flex flex-col items-center justify-center p-4 font-mono text-retro-green">
      
      {/* HEADER REBRAND */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter drop-shadow-[0_0_10px_rgba(51,255,0,0.6)] animate-pulse">
          MONEY_DUMB
        </h1>
        <p className="text-xs text-retro-dim mt-2 tracking-widest">
          v1.0.0 // AUTH_REQUIRED
        </p>
      </div>

      {/* LOGIN CARD */}
      <div className="w-full max-w-md border border-retro-green/50 p-8 shadow-[0_0_15px_rgba(51,255,0,0.1)] relative bg-retro-gray/5">
        
        {/* NEW: PREVIEW / SANDBOX BUTTON */}
        <div className="mb-8 border-b border-retro-dim pb-6 text-center">
          <p className="text-[10px] text-retro-dim uppercase mb-3">
            Just browsing?
          </p>
          <button 
            onClick={handleDemoClick}
            disabled={loading}
            className="w-full bg-retro-dim/20 hover:bg-retro-green hover:text-retro-black border border-retro-dim text-retro-green py-3 text-xs uppercase tracking-widest transition-all duration-300"
          >
            {loading ? 'INITIALIZING_DEMO...' : '>> ENTER_SANDBOX_MODE'}
          </button>
        </div>

        {/* AUTH FORM */}
        <form action={authenticate} className="space-y-6">
          
          {/* Identity Input */}
          <div className="space-y-2">
            <label className="text-xs uppercase text-retro-dim tracking-widest">
              IDENTITY
            </label>
            <input
              name="username"
              type="text"
              placeholder="ENTER_ID"
              required
              className="w-full bg-transparent border-b border-retro-green text-retro-green p-2 focus:outline-none focus:border-retro-green focus:shadow-[0_1px_0_0_rgba(51,255,0,1)] placeholder-retro-dim/30 transition-all"
            />
          </div>

          {/* Password Input with TOGGLE */}
          <div className="space-y-2 relative">
            <label className="text-xs uppercase text-retro-dim tracking-widest">
              PASSCODE
            </label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="********"
                required
                className="w-full bg-transparent border-b border-retro-green text-retro-green p-2 focus:outline-none focus:border-retro-green focus:shadow-[0_1px_0_0_rgba(51,255,0,1)] placeholder-retro-dim/30 transition-all pr-10"
              />
              {/* EYE TOGGLE BUTTON */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2 text-retro-green/70 hover:text-retro-green focus:outline-none"
              >
                {showPassword ? (
                  // "Hide" Icon (Simple SVG)
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  // "Show" Icon (Simple SVG)
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button className="w-full bg-retro-green text-retro-black font-bold py-3 mt-8 hover:bg-retro-green/90 transition-opacity uppercase tracking-widest shadow-[0_0_10px_rgba(51,255,0,0.4)]">
            AUTHENTICATE
          </button>
        </form>

        <div className="mt-8 text-center">
          <a href="/register" className="text-[10px] text-retro-dim hover:text-retro-green transition-colors border-b border-transparent hover:border-retro-green pb-0.5 uppercase tracking-widest cursor-pointer">
            Create New Identity &gt;&gt;
          </a>
        </div>

      </div>
      
      {/* Footer Info */}
      <div className="fixed bottom-4 text-[10px] text-retro-dim opacity-40">
        SECURE_CONNECTION // ENCRYPTED
      </div>
    </div>
  );
}