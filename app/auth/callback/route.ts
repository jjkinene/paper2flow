import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Supabase email confirmation with PKCE redirects here with a one-time code.
// Exchange it for a cookie-backed session before returning to the dashboard.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next');
  const destination = next?.startsWith('/') && !next.startsWith('//')
    && (next === '/admin' || next === '/signup' || next === '/reset-password')
    ? next
    : '/admin';

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(destination, request.url));
    }
  }

  const url = new URL(destination === '/signup' ? '/signup' : '/login', request.url);
  url.searchParams.set(destination === '/signup' ? 'oauth' : 'verification', 'failed');
  return NextResponse.redirect(url);
}
