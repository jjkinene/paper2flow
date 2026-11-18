import ExtractionStatus from "@/components/admin/ExtractionStatus";
import Link from 'next/link';

export default function StatusPage({
  params,
}: {
  params: { formId: string };
}) {
  return (
    <main className="mx-auto max-w-xl px-4 py-12 text-gray-900">
      <Link href="/admin" className="mb-6 inline-flex text-sm font-semibold text-indigo-700 hover:underline">← Back to dashboard</Link>
      <ExtractionStatus formId={params.formId} />
    </main>
  );
}
