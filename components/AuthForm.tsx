'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Tutorial } from './Tutorial';

interface AuthFormProps {
  initialMode?: 'signin' | 'signup';
}

export function AuthForm({ initialMode = 'signin' }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get('redirect') || searchParams?.get('next') || '/dashboard';
  const errorParam = searchParams?.get('error');

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam === 'auth_failed'
      ? 'Authentication failed. Please verify credentials.'
      : null
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const calculateStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };

  const strength = calculateStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/signin';
      const payload: Record<string, string> = {
        email: email.trim(),
        password,
      };
      if (mode === 'signup' && name.trim()) {
        payload.name = name.trim();
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.token) {
        try {
          localStorage.setItem('repogym_token', data.token);
          localStorage.setItem('repogym_user', JSON.stringify(data.user));
        } catch {
          // ignore
        }
      }

      setSuccessMessage(
        mode === 'signup'
          ? 'ACCOUNT CREATED. REDIRECTING...'
          : 'SIGNED IN SUCCESSFULLY. REDIRECTING...'
      );

      window.dispatchEvent(new Event('auth-state-change'));

      setTimeout(() => {
        router.push(redirect);
        router.refresh();
      }, 700);
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err instanceof Error ? err.message : 'An error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@repogym.dev');
    setPassword('password123');
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'demo@repogym.dev',
          password: 'password123',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Demo login failed');
      }

      if (data.token) {
        try {
          localStorage.setItem('repogym_token', data.token);
          localStorage.setItem('repogym_user', JSON.stringify(data.user));
        } catch {
          // ignore
        }
      }

      setSuccessMessage('LOGGED IN AS DEMO. REDIRECTING...');
      window.dispatchEvent(new Event('auth-state-change'));
      setTimeout(() => {
        router.push(redirect);
        router.refresh();
      }, 500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthGitHub = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            redirect
          )}`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'GitHub authentication is currently unavailable.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-[#171717] border border-[#262626] p-6 sm:p-8 text-left">
      <div className="mb-3 flex justify-end"><Tutorial chapter="account" /></div>

      {/* Brand Header */}
      <div className="flex flex-col items-start mb-6">
        <Link href="/" className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 bg-[#EDEDED] text-[#000000] font-mono font-bold text-xs">
            RG
          </span>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#EDEDED]">
            RepoGym // Identity
          </span>
        </Link>
        <h1 className="text-xl font-bold uppercase tracking-tight text-[#EDEDED]">
          {mode === 'signup' ? 'Create Account' : 'Authenticate Session'}
        </h1>
        <p className="text-xs text-[#A1A1A1] mt-1">
          {mode === 'signup'
            ? 'Access analyzed repositories, track execution traces, and log session scores.'
            : 'Sign in to access your saved repositories and trace history.'}
        </p>
      </div>

      {/* Tabs */}
      <div data-tour="auth-mode" className="grid grid-cols-2 gap-2 mb-6 font-mono text-[10px] uppercase tracking-wider">
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`py-2 transition-colors cursor-pointer border ${
            mode === 'signin'
              ? 'bg-[#EDEDED] text-[#000000] border-[#EDEDED] font-semibold'
              : 'bg-transparent text-[#A1A1A1] border-[#333333] hover:text-[#EDEDED] hover:border-[#EDEDED]'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup');
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`py-2 transition-colors cursor-pointer border ${
            mode === 'signup'
              ? 'bg-[#EDEDED] text-[#000000] border-[#EDEDED] font-semibold'
              : 'bg-transparent text-[#A1A1A1] border-[#333333] hover:text-[#EDEDED] hover:border-[#EDEDED]'
          }`}
        >
          Sign Up
        </button>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-[#000000] border border-[#DC8381] text-xs font-mono text-[#DC8381]">
          <strong className="uppercase">Error: </strong> {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-[#000000] border border-[#EDEDED] text-xs font-mono text-[#EDEDED]">
          {successMessage}
        </div>
      )}

      {/* Quick Demo Pill */}
      {mode === 'signin' && (
        <button
          type="button"
          data-tour="auth-demo"
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full mb-4 py-2 px-3 bg-[#000000] border border-[#333333] hover:border-[#EDEDED] text-[#EDEDED] font-mono text-[10px] uppercase tracking-wider flex items-center justify-between transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EDEDED] animate-pulse" />
            <span>Test: <strong>demo@repogym.dev</strong></span>
          </span>
          <span className="text-[#A1A1A1] hover:text-[#EDEDED]">1-Click Sign In &rarr;</span>
        </button>
      )}

      {/* GitHub OAuth Button */}
      <button
        type="button"
        data-tour="auth-github"
        onClick={handleOAuthGitHub}
        disabled={loading}
        className="w-full py-2.5 px-4 bg-[#000000] border border-[#333333] hover:border-[#EDEDED] text-[#EDEDED] font-mono text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-40 cursor-pointer"
      >
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          />
        </svg>
        <span>Continue with GitHub</span>
      </button>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#262626]" />
        </div>
        <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-wider">
          <span className="bg-[#171717] px-2 text-[#555555]">
            or with email & JWT
          </span>
        </div>
      </div>

      {/* Form Fields */}
      <form data-tour="auth-form" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {mode === 'signup' && (
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-[#A1A1A1] mb-1">
              Full Name <span className="text-[#555555]">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Developer Name"
              className="w-full text-xs px-3 py-2 bg-[#000000] border border-[#333333] text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#EDEDED] font-mono transition-colors"
            />
          </div>
        )}

        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider text-[#A1A1A1] mb-1">
            Email address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dev@example.com"
            className="w-full text-xs px-3 py-2 bg-[#000000] border border-[#333333] text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#EDEDED] font-mono transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1 font-mono text-[10px] uppercase tracking-wider">
            <label className="text-[#A1A1A1]">
              Password
            </label>
            {mode === 'signin' && (
              <span className="text-[#555555]">
                Default: password123
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-xs px-3 py-2 pr-10 bg-[#000000] border border-[#333333] text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#EDEDED] font-mono transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#555555] hover:text-[#EDEDED]"
            >
              {showPassword ? 'HIDE' : 'SHOW'}
            </button>
          </div>

          {mode === 'signup' && password.length > 0 && (
            <div className="mt-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider">
              <div className="flex-1 h-1 bg-[#262626]">
                <div
                  className={`h-full transition-all ${
                    strength <= 1
                      ? 'w-1/4 bg-[#DC8381]'
                      : strength <= 3
                      ? 'w-2/4 bg-[#E6A360]'
                      : 'w-full bg-[#EDEDED]'
                  }`}
                />
              </div>
              <span className="text-[#A1A1A1]">
                {strength <= 1 ? 'WEAK' : strength <= 3 ? 'GOOD' : 'STRONG'}
              </span>
            </div>
          )}
        </div>

        {mode === 'signup' && (
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-[#A1A1A1] mb-1">
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-xs px-3 py-2 bg-[#000000] border border-[#333333] text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#EDEDED] font-mono transition-colors"
            />
          </div>
        )}

        {mode === 'signin' && (
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-[#A1A1A1] select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="bg-[#000000] border-[#333333] text-[#EDEDED] w-3 h-3"
              />
              Remember me
            </label>
            <span className="text-[#555555] hover:text-[#A1A1A1] cursor-pointer">
              Forgot?
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-3 py-2.5 px-4 bg-[#EDEDED] text-[#000000] border border-[#EDEDED] hover:bg-white font-mono text-[10px] uppercase tracking-wider font-semibold transition-all duration-140 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Processing...</span>
            </>
          ) : mode === 'signup' ? (
            'Create Account &rarr;'
          ) : (
            'Sign In &rarr;'
          )}
        </button>
      </form>

      {/* Switch Mode Footer */}
      <div className="mt-5 pt-4 border-t border-[#262626] font-mono text-[10px] uppercase tracking-wider text-center text-[#A1A1A1]">
        {mode === 'signup' ? (
          <>
            Already registered?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="text-[#EDEDED] underline hover:text-white cursor-pointer ml-1"
            >
              Sign In
            </button>
          </>
        ) : (
          <>
            Need an account?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="text-[#EDEDED] underline hover:text-white cursor-pointer ml-1"
            >
              Sign Up
            </button>
          </>
        )}
      </div>
    </div>
  );
}
