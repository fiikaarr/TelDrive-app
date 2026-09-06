import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Cloud, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#5c94fc] p-4 select-none relative overflow-hidden">
      <div className="absolute top-10 left-10 opacity-30 pointer-events-none">
        <Cloud className="w-32 h-32 fill-white text-white" />
      </div>
      <div className="absolute bottom-10 right-10 opacity-30 pointer-events-none">
        <Cloud className="w-40 h-40 fill-white text-white" />
      </div>

      <div className="bg-[#fff3d1] border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full p-8 relative z-10">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <svg viewBox="0 0 64 64" className="w-28 h-28 drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <path d="M16 40 C10 40 6 36 6 30 C6 24 11 20 16 20 C18 14 24 10 32 10 C40 10 46 14 48 20 C54 20 58 24 58 30 C58 36 54 40 48 40 Z" fill="#ffffff" stroke="#000000" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>
              <g transform="translate(18, 18) scale(0.65)">
                <path d="M16 28 C14 28 12 26 12 22 L12 16 C12 14 14 12 16 12 L32 12 C34 12 36 14 36 16 L36 22 C36 26 34 28 32 28 Z" fill="#ffebcd" stroke="#000000" strokeWidth="4" strokeLinejoin="round"/>
                <path d="M8 14 C8 6 16 2 24 2 C32 2 40 6 40 14 C40 18 36 20 32 20 L16 20 C12 20 8 18 8 14 Z" fill="#e52521" stroke="#000000" strokeWidth="4" strokeLinejoin="round"/>
                <circle cx="18" cy="10" r="3.5" fill="#ffffff"/>
                <circle cx="30" cy="10" r="3.5" fill="#ffffff"/>
              </g>
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-wider uppercase drop-shadow-[2px_2px_0px_rgba(255,255,255,1)]">
            TELDRIVE
          </h1>
          <p className="text-xs font-bold text-slate-600 mt-1 uppercase tracking-wide">
            🍄 Super Cloud Bros Storage
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500 text-white border-2 border-black rounded-xl text-xs font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-xs font-black uppercase text-slate-800 mb-1.5">
              Player Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 stroke-[2.5]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mario@nintendo.com"
                className="w-full pl-10 pr-4 py-3 bg-white border-3 border-black rounded-xl text-sm font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:bg-yellow-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-800 mb-1.5">
              Password Key
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 stroke-[2.5]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-white border-3 border-black rounded-xl text-sm font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:bg-yellow-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#e52521] hover:bg-[#d41c18] text-white font-black text-sm uppercase tracking-wider rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin stroke-[3]" />
            ) : (
              <>
                <span>{isSignUp ? 'START NEW GAME (SIGN UP)' : 'PRESS START (SIGN IN)'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs font-black text-slate-700 hover:text-red-600 uppercase tracking-wide transition-colors"
          >
            {isSignUp ? 'Already have a saved game? Sign In' : "Don't have a game save? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}