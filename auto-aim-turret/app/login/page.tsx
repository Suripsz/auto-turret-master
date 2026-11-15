'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg('Account created successfully! Checking session...');
          if (data.session) {
            router.push('/');
            router.refresh();
          } else {
            setSuccessMsg('Check your email for the confirmation link.');
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          router.push('/');
          router.refresh();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-grid-pattern text-zinc-100 flex flex-col items-center justify-center p-6 selection:bg-rose-500/30 selection:text-rose-200">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-2">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-wider uppercase text-zinc-100">
            AUTO-AIM TURRET
          </h1>
          <p className="text-xs text-zinc-400 font-mono">
            COMMAND CENTER // SECURE SYSTEM AUTHENTICATION
          </p>
        </div>

        {/* Card Form */}
        <div className="glass-panel p-8 rounded-2xl border border-zinc-800 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide">
              {isSignUp ? 'Create Operator Account' : 'Operator Login'}
            </h2>
            <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
              ENCRYPTED
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@turret.io"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-zinc-950/80 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/80 transition-colors font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 block">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-zinc-950/80 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/80 transition-colors font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-rose-950/40 transition-all flex items-center justify-center gap-2 border border-rose-400/30 mt-2"
            >
              <span>{loading ? 'Authenticating...' : isSignUp ? 'Create Account' : 'Authenticate & Enter'}</span>
              <ArrowRight className="w-4 h-4 text-rose-200" />
            </button>
          </form>

          {/* Toggle Sign Up / Sign In */}
          <div className="pt-2 text-center border-t border-zinc-800/80">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-mono"
            >
              {isSignUp ? (
                <>Already have credentials? <span className="text-rose-400 underline">Sign In</span></>
              ) : (
                <>Need an operator account? <span className="text-rose-400 underline">Sign Up</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
