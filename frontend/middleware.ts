import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Decode a JWT payload safely (base64url -> JSON). No signature verification here.
function decodeJWTPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getUserRoleFromCookie(req: NextRequest): string | null {
  const refreshToken = req.cookies.get('refreshToken')?.value;
  if (!refreshToken) return null;
  const payload = decodeJWTPayload(refreshToken);
  return payload?.role ?? null;
}

function getRoleFromRefresh(req: NextRequest): string | null {
  try {
    const token = req.cookies.get('refreshToken')?.value;
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // atob is available in Edge runtime
    const json = atob(base64);
    const payload = JSON.parse(json);
    return payload?.role || null;
  } catch {
    return null;
  }
}

function isAuthRoute(pathname: string) {
  return pathname.startsWith('/auth/login') || pathname.startsWith('/auth/register');
}

function isProtectedRoute(pathname: string) {
  return (
    pathname === '/' ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/results') ||
    pathname.startsWith('/quizzes') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/manage') ||
    pathname.startsWith('/admin')
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Early allow for obvious static paths (additional filter is in config.matcher)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js')
  ) {
    return NextResponse.next();
  }

  const hasRefresh = !!req.cookies.get('refreshToken')?.value;
  const role = getUserRoleFromCookie(req);

  // Root redirect
  if (pathname === '/') {
    if (!hasRefresh) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
    const dest = role === 'admin' ? '/admin/dashboard' : '/dashboard';
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Auth routes: redirect to app if already authenticated
  if (isAuthRoute(pathname)) {
    if (hasRefresh) {
      const dest = role === 'admin' ? '/admin/dashboard' : '/dashboard';
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  // Admin section protection
  if (pathname.startsWith('/admin')) {
    if (!hasRefresh) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // Generic protected routes
  if (isProtectedRoute(pathname)) {
    if (!hasRefresh) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
    return NextResponse.next();
  }

  // Redirect '/' and '/auth/login' based on refreshToken cookie role
  const roleFromRefresh = getRoleFromRefresh(req);
  if (pathname === '/') {
    if (!roleFromRefresh) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
    if (roleFromRefresh === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (pathname === '/auth/login' && roleFromRefresh) {
    if (roleFromRefresh === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Default allow
  return NextResponse.next();
}

// Run middleware on all routes except Next internals and common static assets
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js)$).*)',
    '/',
    '/auth/login',
  ],
};
