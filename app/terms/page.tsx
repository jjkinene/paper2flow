import Link from "next/link";

export const metadata = { title: "Terms of Use | Paper2Flow" };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f8f9fc] px-5 py-12 text-slate-800 sm:px-8">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-semibold text-indigo-700 hover:underline">← Paper2Flow home</Link>
        <h1 className="mt-8 text-3xl font-bold tracking-tight">Terms of Use</h1>
        <p className="mt-2 text-sm text-slate-500">Paper2Flow · Story Crown Technologies Ltd.</p>
        <p className="mt-6 text-sm leading-7">These terms describe basic expectations for using Paper2Flow. They are a product draft and should be reviewed and completed with the company’s verified legal details before launch.</p>
        <h2 className="mt-7 text-lg font-semibold">Accounts</h2>
        <p className="mt-2 text-sm leading-7">Keep your account credentials secure and provide accurate registration information. You are responsible for activity carried out through your account.</p>
        <h2 className="mt-7 text-lg font-semibold">Your forms and content</h2>
        <p className="mt-2 text-sm leading-7">You must have permission to upload documents and collect the information requested in your forms. Review AI-extracted fields for accuracy before publishing. You are responsible for your form content, its public availability, and how you use submitted responses.</p>
        <h2 className="mt-7 text-lg font-semibold">Acceptable use</h2>
        <p className="mt-2 text-sm leading-7">Do not use Paper2Flow unlawfully, interfere with the service, attempt unauthorized access, or collect information without an appropriate basis. The service may be changed or interrupted as it is maintained.</p>
        <h2 className="mt-7 text-lg font-semibold">Service and contact</h2>
        <p className="mt-2 text-sm leading-7">Paper2Flow provides tools for form digitization, publishing, responses, and CSV export. No availability, extraction accuracy, or pricing guarantee is made on this page. Add the company’s verified contact information, effective date, governing terms, and any final service commitments before launch.</p>
      </article>
    </main>
  );
}
