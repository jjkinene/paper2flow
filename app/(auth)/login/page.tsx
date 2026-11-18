import { Suspense } from 'react';
import LoginForm from './LoginForm';

function LoginFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm animate-pulse">
        <div className="mb-6 h-5 w-40 rounded bg-gray-200" />
        <div className="mb-8 space-y-2 text-center">
          <div className="mx-auto h-8 w-36 rounded bg-gray-200" />
          <div className="mx-auto h-4 w-48 rounded bg-gray-200" />
        </div>
        <div className="space-y-5 rounded-xl border border-gray-200 bg-white px-8 py-8 shadow-sm">
          <div className="h-10 rounded bg-gray-100" />
          <div className="h-10 rounded bg-gray-100" />
          <div className="h-10 rounded bg-indigo-100" />
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
