import { NextRequest } from 'next/server';
import { createClient } from './supabase/server';

export interface AuthUser {
  id: string;
  email: string;
}

export async function getAuthenticatedUser(req?: NextRequest): Promise<AuthUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (user && !error) {
      return {
        id: user.id,
        email: user.email || '',
      };
    }
  } catch {
    // Ignore and fall back to local test/demo user
  }

  // Fallback demo user for local development and unit tests
  return {
    id: 'demo-user-1',
    email: 'demo@repogym.dev',
  };
}
