import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { sendAdminNotification } from '@/lib/email';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${validated.email}
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, 10);

    // Create user
    const result = await sql`
      INSERT INTO users (email, password_hash, name)
      VALUES (${validated.email}, ${passwordHash}, ${validated.name || null})
      RETURNING id, email, name
    `;

    // Send admin notification (non-blocking)
    sendAdminNotification(
      'New User Signup',
      `A new user has signed up for Strategy Reality Check.`,
      {
        email: validated.email,
        name: validated.name || 'Not provided',
        timestamp: new Date().toISOString(),
      }
    ).catch(err => console.error('Failed to send signup notification:', err));

    return NextResponse.json({
      success: true,
      user: {
        id: result[0].id,
        email: result[0].email,
        name: result[0].name,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    );
  }
}
