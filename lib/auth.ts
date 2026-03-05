import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { sql } from './db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email);
        const password = String(credentials.password);

        const user = await sql`
          SELECT id, email, password_hash, name
          FROM users
          WHERE email = ${email}
        `;

        if (user.length === 0) {
          return null;
        }

        const passwordHash = String(user[0].password_hash || '');
        if (!passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: String(user[0].id),
          email: String(user[0].email),
          name: user[0].name ? String(user[0].name) : String(user[0].email),
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
