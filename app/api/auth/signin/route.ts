import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { verifyPassword, signJWT, hashPassword } from '@/lib/jwt';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Try finding user in in-memory / persistent store
    const user = await store.getUserByEmail(normalizedEmail);

    if (user) {
      const creds = await store.getUserCredentials(user.id);
      if (creds) {
        const isMatch = await verifyPassword(password, creds.passwordHash, creds.salt);
        if (!isMatch) {
          return NextResponse.json(
            { error: 'Invalid email or password' },
            { status: 401 }
          );
        }
      } else {
        // User exists without stored password (e.g. demo user), set new password credentials
        const { hash, salt } = await hashPassword(password);
        await store.updateUserPassword(user.id, hash, salt);
      }

      // Generate JWT
      const token = await signJWT({
        sub: user.id,
        email: user.email,
        name: user.name,
      });

      const response = NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      });

      // Set cookie
      response.cookies.set('repogym_jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });

      return response;
    }

    // 2. If not found in store, check Supabase Auth
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!error && data.user) {
        const supabaseUser = data.user;
        const newUser = await store.createUser({
          email: supabaseUser.email || normalizedEmail,
          name: (supabaseUser.user_metadata?.name as string) || undefined,
        });

        const token = await signJWT({
          sub: newUser.id,
          email: newUser.email,
          name: newUser.name,
        });

        const response = NextResponse.json({
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
          },
          token,
        });

        response.cookies.set('repogym_jwt', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60,
        });

        return response;
      }
    } catch {
      // Supabase is offline or unconfigured
    }

    // Invalid credentials
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    );
  } catch (err) {
    console.error('Sign in error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred during sign-in' },
      { status: 500 }
    );
  }
}
