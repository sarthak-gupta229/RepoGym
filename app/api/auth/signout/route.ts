import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Supabase signout error can be safely ignored
  }

  const response = NextResponse.json({
    success: true,
    message: 'Signed out successfully',
  });

  // Clear JWT cookie
  response.cookies.set('repogym_jwt', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
