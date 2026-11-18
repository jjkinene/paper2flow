'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createSupabaseBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true);
        setChecking(false);
      }
    });

    void supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (!active) return;
      if (!sessionError && session) setReady(true);
      setChecking(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Choose a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setReady(false);
        setError('This recovery link is expired or invalid. Request a new password recovery link.');
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError('The password could not be changed. The recovery link may have expired; request a new one and try again.');
        return;
      }
      setSaved(true);
      await supabase.auth.signOut();
      router.refresh();
    } catch {
      setError('The password could not be changed. Please request a new recovery link and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/login" className="mb-6 inline-flex text-sm font-semibold text-indigo-700 hover:underline">← Back to sign in</Link>
        <div className="rounded-xl border border-gray-200 bg-white px-8 py-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Choose a new password</h1>
          {saved ? (
            <div className="mt-5 space-y-4">
              <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">Your password was changed. Sign in with your new password.</p>
              <Link href="/login" className="inline-flex font-semibold text-indigo-700 hover:underline">Continue to sign in</Link>
            </div>
          ) : checking ? (
            <p className="mt-3 text-sm text-gray-700">Verifying your recovery link…</p>
          ) : !ready ? (
            <div className="mt-5 space-y-4">
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">This recovery link is expired or invalid. Request a new link to continue.</p>
              <Link href="/forgot-password" className="inline-flex font-semibold text-indigo-700 hover:underline">Request another recovery link</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div><label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-800">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-gray-800">Confirm new password</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
              <button type="submit" disabled={saving} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">{saving ? 'Updating…' : 'Update password'}</button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
