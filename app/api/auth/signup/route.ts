import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { hashPassword, signJWT } from '@/lib/jwt';
import { createServiceClient } from '@/lib/supabase/service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    // Validation
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await store.getUserByEmail(normalizedEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in.' },
        { status: 400 }
      );
    }

    // Hash password
    const { hash, salt } = await hashPassword(password);

    // Create user in store
    const user = await store.createUser({
      email: normalizedEmail,
      name: name ? String(name).trim() : undefined,
      passwordHash: hash,
      salt,
    });

    // Optionally sync with Supabase if configured and available
    try {
      const supabaseAdmin = createServiceClient();
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { name: user.name },
      });
    } catch {
      // Supabase is optional; local JWT auth works independently
    }

    // Generate JWT token
    const token = await signJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      },
      { status: 201 }
    );

    // Set HTTP-only JWT cookie
    response.cookies.set('repogym_jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err) {
    console.error('Sign up error:', err);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
