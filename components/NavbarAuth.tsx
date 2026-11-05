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
    return <div className="w-16 h-6 bg-[#171717] border border-[#262626] animate-pulse" />;
  }

  if (user) {
    const displayName = (user.name || user.email.split('@')[0]).toUpperCase();

    return (
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-2.5 py-1 bg-[#171717] border border-[#262626] hover:border-[#333333] transition-colors text-[#EDEDED]"
          title={user.email}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#EDEDED]" />
          <span className="truncate max-w-[120px] tracking-wide">{displayName}</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="px-2.5 py-1 bg-transparent border border-[#333333] text-[#A1A1A1] hover:text-[#EDEDED] hover:border-[#EDEDED] transition-colors cursor-pointer tracking-wider"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
      <Link
        href="/signin"
        className="px-2.5 py-1 bg-transparent border border-[#333333] text-[#A1A1A1] hover:text-[#EDEDED] hover:border-[#EDEDED] transition-colors"
      >
        Sign In
      </Link>
      <Link
        href="/signup"
        className="px-3 py-1 bg-[#EDEDED] text-[#000000] border border-[#EDEDED] hover:bg-white font-medium transition-colors"
      >
        Sign Up
      </Link>
    </div>
  );
}
