'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import SocialAuthButtons from '@/components/auth/SocialAuthButtons';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const verificationFailed = searchParams.get('verification') === 'failed';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('Could not sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          <span aria-hidden="true">←</span> Back to Paper2Flow home
        </Link>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Paper2Flow</h1>
          <p className="mt-1 text-sm text-gray-700">Sign in to your admin account</p>
        </div>

        {verificationFailed && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">We couldn’t verify that sign-in link. Please request a new confirmation email and try again.</p>}

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white px-8 py-8 shadow-sm">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
          </div>

          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <SocialAuthButtons />
          <p className="text-center text-sm text-gray-700">New to Paper2Flow? <Link href="/signup" className="font-semibold text-indigo-700 hover:underline">Create an account</Link></p>
        </form>
      </div>
    </main>
  );
}
