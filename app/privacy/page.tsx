import Link from "next/link";

export const metadata = { title: "Privacy Policy | Paper2Flow" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f8f9fc] px-5 py-12 text-slate-800 sm:px-8">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-semibold text-indigo-700 hover:underline">← Paper2Flow home</Link>
        <h1 className="mt-8 text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Paper2Flow · Story Crown Technologies Ltd.</p>
        <p className="mt-6 text-sm leading-7">Paper2Flow helps account holders turn paper forms into online forms and collect responses. This page describes the information the service handles. It is a general product notice and should be reviewed against the company’s final legal and contact details before launch.</p>
        <h2 className="mt-7 text-lg font-semibold">Information processed</h2>
        <p className="mt-2 text-sm leading-7">When you create an account, the service processes account information such as your email address. When you use Paper2Flow, it processes documents you upload, form fields created or edited, and responses submitted to your published forms.</p>
        <h2 className="mt-7 text-lg font-semibold">How information is used</h2>
        <p className="mt-2 text-sm leading-7">Information is used to authenticate account holders, extract and manage form structures, publish forms, store submissions, show responses, and provide CSV exports. Uploaded documents may be sent to the configured AI processing provider to extract form fields.</p>
        <h2 className="mt-7 text-lg font-semibold">Storage and service providers</h2>
        <p className="mt-2 text-sm leading-7">Paper2Flow uses Supabase for authentication, database, and file storage; OpenAI for AI-assisted extraction; and Vercel for hosting when deployed there. Their processing is subject to their respective service terms and privacy practices.</p>
        <h2 className="mt-7 text-lg font-semibold">Your responsibilities and choices</h2>
        <p className="mt-2 text-sm leading-7">Do not upload information unless you have the right to process it. Form owners should tell respondents what information they collect and why. Contact Story Crown Technologies Ltd. through its verified published contact channel to ask about account or data requests; verified contact details are to be added here before launch.</p>
        <h2 className="mt-7 text-lg font-semibold">Policy updates</h2>
        <p className="mt-2 text-sm leading-7">This policy may be updated as Paper2Flow’s practices and applicable requirements are confirmed. Add an effective date and the company’s verified privacy contact before public launch.</p>
      </article>
    </main>
  );
}
