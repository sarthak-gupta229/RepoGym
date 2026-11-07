'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#000000] text-[#EDEDED]">
      <header className="border-b border-[#262626] bg-[#000000] px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="px-1.5 py-0.5 bg-[#EDEDED] text-[#000000] font-mono font-bold text-xs">
            RG
          </span>
          <span className="font-bold text-sm tracking-tight uppercase">
            RepoGym
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <div className="flex-1 flex flex-col justify-center items-center px-4 py-12">
        <Suspense fallback={<div className="text-[10px] font-mono uppercase text-[#A1A1A1]">Loading sign up...</div>}>
          <AuthForm initialMode="signup" />
        </Suspense>
      </div>
    </div>
  );
}
