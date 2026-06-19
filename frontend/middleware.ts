import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Route yang boleh diakses tanpa login
const PUBLIC_ROUTES = ['/'];

// Role yang boleh akses route tertentu
const ROLE_ROUTES: Record<string, string[]> = {
  '/dashboard':        ['OWNER', 'ADMIN'],
  '/products':         ['OWNER'],
  '/raw-materials':    ['OWNER', 'ADMIN'],
  '/stock-opname':     ['OWNER', 'ADMIN'],
  '/staff':            ['OWNER'],
  '/reports':          ['OWNER'],
  '/receipt-settings': ['OWNER', 'ADMIN'],
  '/cashier':          ['OWNER', 'ADMIN', 'GUEST'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lewati route publik
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Ambil token dari cookie
  const token = request.cookies.get('mb_token')?.value;

  // Tidak ada token → redirect ke login
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Verifikasi token ke backend
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const res = await fetch(`${apiUrl}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
      // Timeout 3 detik agar tidak hang
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      // Token tidak valid → redirect ke login, hapus cookie
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('mb_token');
      return response;
    }

    const user = await res.json();

    // Cek role untuk route ini
    const allowedRoles = ROLE_ROUTES[pathname];
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      // Role tidak punya akses → redirect ke kasir (fallback aman)
      return NextResponse.redirect(new URL('/cashier', request.url));
    }

    return NextResponse.next();
  } catch {
    // Backend tidak bisa dihubungi → redirect ke login
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo.svg|.*\\.png|.*\\.jpg|.*\\.svg).*)',
  ],
};