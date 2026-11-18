'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=%2Freset-password`,
      });
      if (resetError) {
        setError('We could not send a recovery email right now. Please wait a moment and try again.');
      } else {
        setMessage('If an account matches that email, a password recovery link will arrive shortly. Check your inbox and spam folder.');
      }
    } catch {
      setError('We could not send a recovery email right now. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/login" className="mb-6 inline-flex text-sm font-semibold text-indigo-700 hover:underline">← Back to sign in</Link>
        <div className="rounded-xl border border-gray-200 bg-white px-8 py-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Reset your password</h1>
          <p className="mt-2 text-sm text-gray-700">Enter your account email and we’ll send a secure recovery link if an account matches.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="recovery-email" className="mb-1 block text-sm font-medium text-gray-800">Email</label>
              <input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="you@example.com" />
            </div>
            {message && <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">{message}</p>}
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">{loading ? 'Sending…' : 'Send recovery link'}</button>
          </form>
        </div>
      </div>
    </main>
  );
}
