import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Protect /challenges — requires session cookie
  if (pathname.startsWith('/challenges')) {
    const cookie = request.cookies.get('arp_session');
    if (!cookie?.value) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/challenges/:path*'],
};
