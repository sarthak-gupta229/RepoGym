'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserInfo {
  id: string;
  email: string;
  name?: string;
}

export function NavbarAuth() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      // 1. Check local storage first for instant render
      const cached = localStorage.getItem('repogym_user');
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch {
          // ignore
        }
      }

      // 2. Fetch fresh user state from server
      const token = localStorage.getItem('repogym_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/auth/me', { headers });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user) {
          localStorage.setItem('repogym_user', JSON.stringify(data.user));
        }
      } else {
        setUser(null);
        localStorage.removeItem('repogym_user');
        localStorage.removeItem('repogym_token');
      }
    } catch {
      // network/fetch error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();

    const handleAuthChange = () => {
      fetchUser();
    };

    window.addEventListener('auth-state-change', handleAuthChange);
    return () => {
      window.removeEventListener('auth-state-change', handleAuthChange);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('repogym_token');
      localStorage.removeItem('repogym_user');
      setUser(null);
      window.dispatchEvent(new Event('auth-state-change'));
      router.push('/signin');
      router.refresh();
    }
  };

  if (loading && !user) {
    return <div className="w-16 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />;
  }

  if (user) {
    const displayName = user.name || user.email.split('@')[0];
    const initial = displayName.charAt(0).toUpperCase();

    return (
      <div className="flex items-center gap-2.5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-xs text-zinc-700 dark:text-zinc-200"
        >
          <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
            {initial}
          </div>
          <span className="font-medium max-w-[120px] truncate" title={user.email}>
            {displayName}
          </span>
        </Link>
        <button
          onClick={handleSignOut}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/signin"
        className="text-xs font-medium px-3 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
      >
        Sign In
      </Link>
      <Link
        href="/signup"
        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition"
      >
        Sign Up
      </Link>
    </div>
  );
}
