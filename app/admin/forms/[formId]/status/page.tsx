import ExtractionStatus from "@/components/admin/ExtractionStatus";

export default function StatusPage({
  params,
}: {
  params: { formId: string };
}) {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <ExtractionStatus formId={params.formId} />
    </main>
  );
}