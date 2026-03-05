import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const session = await getAuth();
  
  // Protect upload and rule-builder routes
  if (request.nextUrl.pathname.startsWith('/upload') || 
      request.nextUrl.pathname.startsWith('/rule-builder')) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/upload/:path*', '/rule-builder/:path*'],
};
