'use client';

import React, { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';

export default function AuthPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      <Suspense fallback={<div className="text-xs text-zinc-500">Loading authentication...</div>}>
        <AuthForm initialMode="signin" />
      </Suspense>
    </div>
  );
}
