'use client';

import { useState } from 'react';
import { registerUser, loginUser } from './lib/actions'; // Notice the single "."
import { useRouter } from 'next/navigation';

export default function Home() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setMessage('PROCESSING...');
    
    if (isRegistering) {
      const result = await registerUser(formData);
      if (result?.success) {
        setMessage('REGISTRATION COMPLETE. PLEASE LOGIN.');
        setIsRegistering(false);
      } else {
        setMessage(`ERROR: ${result?.message}`);
      }
    } else {
      const result = await loginUser(formData);
      if (result?.success) {
        setMessage('ACCESS GRANTED. REDIRECTING...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } else {
        setMessage(`ACCESS DENIED: ${result?.message}`);
      }
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-retro-black text-retro-green font-mono">
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[length:100%_2px,3px_100%] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))]" />

      <div className="z-10 w-full max-w-md space-y-8 text-center">
        <div className="border-b-2 border-retro-dim pb-4">
          <h1 className="text-4xl font-bold tracking-tighter drop-shadow-[0_0_10px_rgba(51,255,0,0.5)]">
            SPENT_SYSTEM
          </h1>
          <p className="text-retro-dim text-sm mt-2">
            v1.0.0 // {isRegistering ? 'NEW_USER_PROTOCOL' : 'AUTH_REQUIRED'}
          </p>
        </div>

        <div className="border border-retro-dim bg-retro-gray/10 p-8 space-y-6 shadow-[0_0_15px_rgba(51,255,0,0.1)]">
          <form action={handleSubmit} className="space-y-6">
            <div className="space-y-2 text-left">
              <label className="text-xs uppercase tracking-widest text-retro-dim">Identity</label>
              <input 
                name="username"
                type="text" 
                required
                className="w-full bg-transparent border-b border-retro-green text-retro-green focus:outline-none focus:border-retro-amber transition-colors p-2"
                placeholder="ENTER_ID"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2 text-left">
              <label className="text-xs uppercase tracking-widest text-retro-dim">Passcode</label>
              <input 
                name="password"
                type="password" 
                required
                className="w-full bg-transparent border-b border-retro-green text-retro-green focus:outline-none focus:border-retro-amber transition-colors p-2"
                placeholder="********"
              />
            </div>

            {message && (
              <div className={`text-xs uppercase tracking-widest ${message.includes('ERROR') || message.includes('DENIED') ? 'text-retro-red' : 'text-retro-green'} animate-pulse`}>
                &gt;&gt; {message}
              </div>
            )}

            <button type="submit" className="w-full bg-retro-green text-retro-black font-bold py-3 hover:bg-retro-dim hover:text-retro-green transition-colors uppercase tracking-widest cursor-pointer">
              {isRegistering ? 'Initialize User' : 'Authenticate'}
            </button>
          </form>

          <button 
            type="button"
            onClick={() => { setIsRegistering(!isRegistering); setMessage(''); }}
            className="text-xs text-retro-dim hover:text-retro-green underline decoration-retro-dim underline-offset-4 cursor-pointer"
          >
            {isRegistering ? '<< RETURN TO LOGIN' : 'CREATE NEW IDENTITY >>'}
          </button>
        </div>
      </div>
    </main>
  );
}