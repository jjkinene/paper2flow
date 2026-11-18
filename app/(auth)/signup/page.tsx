'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import SocialAuthButtons from '@/components/auth/SocialAuthButtons';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else if (data.session) {
        router.push('/admin');
        router.refresh();
      } else {
        setPassword('');
        setConfirmPassword('');
        setMessage('Request received. Check your inbox and spam folder for a confirmation link. Follow the link to activate your account.');
      }
    } catch {
      setError('Could not create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmation() {
    setError(null);
    setResending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (resendError) {
        setError(resendError.message);
      } else {
        setMessage('Confirmation email requested again. Check your inbox and spam folder.');
      }
    } catch {
      setError('Could not request another confirmation email. Please try again later.');
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">← Back to Paper2Flow home</Link>
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Create your Paper2Flow account</h1>
          <p className="mt-2 text-sm text-gray-600">Start creating and sharing online forms.</p>
        </header>
        <div className="space-y-5 rounded-xl border border-gray-200 bg-white px-8 py-8 shadow-sm">
          {message ? (
            <div className="space-y-4">
              <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
                <p className="font-semibold">Check your email</p>
                <p className="mt-1">{message}</p>
                <p className="mt-2 break-all font-medium">{email}</p>
              </div>
              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
              <button type="button" onClick={resendConfirmation} disabled={resending} className="w-full rounded-lg border border-indigo-500 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
                {resending ? 'Requesting email…' : 'Resend confirmation email'}
              </button>
              <Link href="/login" className="block text-center text-sm font-semibold text-indigo-700 hover:underline">Continue to Sign in</Link>
              <button type="button" onClick={() => { setMessage(null); setError(null); }} className="block w-full text-center text-sm text-gray-600 hover:underline">Use a different email</button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-gray-800">Email</label>
                  <input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="you@example.com" />
                </div>
                <div>
                  <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-gray-800">Password</label>
                  <input id="signup-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="At least 8 characters" />
                </div>
                <div>
                  <label htmlFor="signup-confirm" className="mb-1 block text-sm font-medium text-gray-800">Confirm password</label>
                  <input id="signup-confirm" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Re-enter password" />
                </div>
                {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-50">
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              </form>
              <SocialAuthButtons />
              <p className="text-center text-sm text-gray-700">Already have an account? <Link href="/login" className="font-semibold text-indigo-700 hover:underline">Sign in</Link></p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
