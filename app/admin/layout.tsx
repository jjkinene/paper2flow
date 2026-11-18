import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import SignOutButton from '@/components/admin/SignOutButton';
import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="bg-indigo-600 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <Link
              href="/admin"
              className="text-lg font-semibold text-white hover:text-indigo-100 transition-colors"
            >
              Paper2Flow
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/admin" className="rounded-md bg-white/15 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
                ← Dashboard
              </Link>
              <span className="hidden text-sm font-medium text-white sm:block">
                {user.email}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
