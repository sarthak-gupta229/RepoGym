'use client';

import React, { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';

export default function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#000000] text-[#EDEDED] px-4 py-12">
      <Suspense fallback={<div className="text-[10px] font-mono uppercase text-[#A1A1A1]">Loading authentication...</div>}>
        <AuthForm initialMode="signin" />
      </Suspense>
    </div>
  );
}
