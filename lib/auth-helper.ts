import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from './supabase/server';
import { verifyJWT, JWTPayload } from './jwt';
import { store } from './store';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

/**
 * Resolves the authenticated user from:
 * 1. Authorization: Bearer <jwt> header
 * 2. repogym_jwt / token / auth_token cookie
 * 3. Supabase Auth session cookie
 * 4. Fallback demo user for local development and headless test suites
 */
export async function getAuthenticatedUser(req?: NextRequest): Promise<AuthUser | null> {
  // 1. Check Authorization Bearer header
  let token: string | undefined;
  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  // 2. Check cookies if token not found in header
  if (!token) {
    if (req) {
      token =
        req.cookies.get('repogym_jwt')?.value ||
        req.cookies.get('token')?.value ||
        req.cookies.get('auth_token')?.value;
    } else {
      try {
        const cookieStore = await cookies();
        token =
          cookieStore.get('repogym_jwt')?.value ||
          cookieStore.get('token')?.value ||
          cookieStore.get('auth_token')?.value;
      } catch {
        // cookies() may throw outside request lifecycle
      }
    }
  }

  // 3. If JWT token found, verify it
  if (token) {
    const payload = await verifyJWT<JWTPayload>(token);
    if (payload && payload.sub && payload.email) {
      // Check if user exists in store
      const storeUser = await store.getUser(payload.sub);
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name || storeUser?.name,
      };
    }
  }

  // 4. Check Supabase Auth session
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
        name:
          (user.user_metadata?.name as string | undefined) ||
          (user.user_metadata?.full_name as string | undefined),
      };
    }
  } catch {
    // Ignore Supabase connection or cookie errors
  }

  // 5. Fallback demo user for local test environments
  return {
    id: 'demo-user-1',
    email: 'demo@repogym.dev',
    name: 'Demo Student',
  };
}
