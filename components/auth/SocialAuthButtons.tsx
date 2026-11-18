'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type SocialProvider = 'google' | 'azure' | 'facebook';

const PROVIDERS: { id: SocialProvider; name: string; abbreviation: string }[] = [
  { id: 'google', name: 'Google', abbreviation: 'G' },
  { id: 'azure', name: 'Microsoft', abbreviation: 'M' },
  { id: 'facebook', name: 'Facebook', abbreviation: 'f' },
];

export default function SocialAuthButtons() {
  const [activeProvider, setActiveProvider] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: SocialProvider) {
    setError(null);
    setActiveProvider(provider);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          ...(provider === 'azure' ? { scopes: 'email' } : {}),
        },
      });
      if (authError) {
        setError(`${authError.message}. Check that the provider is enabled in Supabase.`);
        setActiveProvider(null);
      }
      // On success, Supabase redirects the browser to the provider.
    } catch {
      setError('Could not start social sign-in. Please try again.');
      setActiveProvider(null);
    }
  }

  return (
    <section className="space-y-3" aria-label="Other ways to sign in">
      <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
        <span className="h-px flex-1 bg-gray-200" />
        <span>or continue with</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {PROVIDERS.map(({ id, name, abbreviation }) => (
          <button
            key={id}
            type="button"
            onClick={() => signIn(id)}
            disabled={activeProvider !== null}
            aria-label={`Continue with ${name}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-wait disabled:opacity-60"
          >
            <span aria-hidden="true" className="flex h-6 min-w-6 items-center justify-center rounded-md bg-gray-100 px-1 text-xs font-bold text-gray-800">{abbreviation}</span>
            <span>{activeProvider === id ? 'Connecting…' : name}</span>
          </button>
        ))}
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
    </section>
  );
}
