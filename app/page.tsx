import Link from "next/link";

const workflow = [
  { number: "01", title: "Upload", text: "Add a paper form as a PDF, JPG, or PNG.", icon: "↑" },
  { number: "02", title: "AI extraction", text: "AI identifies the form’s questions and field types.", icon: "✳" },
  { number: "03", title: "Review & edit", text: "Check the draft and adjust anything you need.", icon: "⌘" },
  { number: "04", title: "Publish", text: "Create a shareable link to your online form.", icon: "↗" },
  { number: "05", title: "Collect responses", text: "Review submissions and export the data as CSV.", icon: "▤" },
];

const sampleQuestions = ["Full name", "Email address", "Preferred appointment date"];

function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${light ? "text-white" : "text-slate-900"}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white shadow-sm">P</span>
      <span className="text-lg font-bold tracking-tight">Paper<span className="text-indigo-500">2</span>Flow</span>
    </span>
  );
}

export default function Home() {
  return (
    <main className="overflow-hidden bg-[#f8f9fc] text-slate-900">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" aria-label="Paper2Flow home"><Brand /></Link>
        <nav aria-label="Main navigation" className="flex items-center gap-1 sm:gap-3">
          <a href="#how-it-works" className="hidden rounded-full px-3 py-2 text-sm font-medium text-slate-800 hover:text-indigo-800 sm:inline-flex">How it works</a>
          <Link href="/login" className="rounded-full px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-white hover:text-indigo-800 sm:px-4">Sign In</Link>
          <Link href="/signup" className="rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">Get Started</Link>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:grid-cols-[1fr_1fr] lg:px-12 lg:pb-24 lg:pt-16">
        <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/85 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Paper forms, meet a simpler workflow</p>
          <h1 className="text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">Turn Paper Forms into <span className="text-indigo-600">Online Forms</span> with AI</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-800 sm:text-lg sm:leading-8">Upload a paper or PDF form. Paper2Flow helps extract its fields with AI, gives you a chance to review and edit, then lets you publish a digital form, collect responses, and export them as CSV.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700">Get Started <span aria-hidden="true">→</span></Link>
            <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700">See How It Works</a>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-800">
            <li className="flex items-center gap-1.5"><span className="text-emerald-600">✓</span> PDF, JPG, and PNG input</li>
            <li className="flex items-center gap-1.5"><span className="text-emerald-600">✓</span> Edit before publishing</li>
            <li className="flex items-center gap-1.5"><span className="text-emerald-600">✓</span> CSV response export</li>
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:pl-3">
          <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-indigo-200/70 via-violet-100/60 to-sky-100/70 blur-2xl" />
          <div className="relative rounded-[1.75rem] border border-white bg-white p-4 shadow-2xl shadow-indigo-900/10 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-700">Before & after</p><p className="mt-1 text-sm font-bold text-slate-800">One paper form, ready to go digital</p></div>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">Illustrative example</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-[.82fr_1.18fr] sm:items-stretch">
              <div className="min-h-64 rounded-xl border border-slate-200 bg-[#f5f5f2] p-3 sm:min-h-72">
                <div className="flex h-full flex-col rounded-sm border border-stone-300 bg-[#fffefa] p-3 shadow-sm sm:p-4">
                  <div className="mb-3 flex items-center gap-2 border-b border-stone-200 pb-2"><span className="h-5 w-5 rounded bg-indigo-100" /><span className="text-[9px] font-bold uppercase tracking-wide text-stone-600">Appointment request</span></div>
                  <p className="text-[8px] text-stone-500">Please complete this form clearly.</p>
                  {sampleQuestions.map((question, i) => <div key={question} className="mt-3"><p className="text-[8px] font-semibold text-stone-600">{i + 1}. {question}</p><div className="mt-1 h-5 border-b border-stone-300" /></div>)}
                  <div className="mt-auto flex items-center gap-2 pt-4"><span className="h-3 w-3 border border-stone-400" /><span className="text-[8px] text-stone-500">I agree to be contacted</span></div>
                  <span className="mt-2 self-end text-[8px] font-medium text-stone-400">PAPER COPY · SAMPLE</span>
                </div>
              </div>
              <div className="relative flex min-h-64 flex-col rounded-xl border border-indigo-100 bg-white p-4 shadow-sm sm:min-h-72 sm:p-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">▤</span><div><p className="text-xs font-bold text-slate-900">Appointment request</p><p className="text-[10px] text-slate-700">Online form preview</p></div></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-800">Draft</span></div>
                <div className="mt-4 space-y-3">{sampleQuestions.map((question) => <div key={question}><label className="mb-1 block text-[10px] font-semibold text-slate-800">{question}</label><div className="h-8 rounded-md border border-slate-300 bg-slate-50" /></div>)}<div className="flex items-center gap-2 pt-0.5"><span className="h-3 w-3 rounded border border-slate-400" /><span className="text-[9px] text-slate-700">I agree to be contacted</span></div></div>
                <div className="mt-auto pt-3"><div className="rounded-md bg-indigo-600 py-2 text-center text-[10px] font-semibold text-white">Submit</div></div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-medium text-slate-700"><span className="rounded-full bg-slate-100 px-2.5 py-1">Paper</span><span aria-hidden="true" className="text-indigo-700">→</span><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-800">Digital draft</span></div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-8 border-y border-slate-200/70 bg-white px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-700">See How It Works</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Five steps from paper to responses</h2><p className="mt-4 text-sm leading-6 text-slate-800 sm:text-base">This visual walkthrough shows the real product flow. No prerecorded demo is available here.</p></div>
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {workflow.map((step) => <li key={step.number} className="relative rounded-2xl border border-slate-200 bg-[#fbfcff] p-5 transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-900/5"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-lg font-semibold text-indigo-700">{step.icon}</span><span className="text-xs font-bold tracking-widest text-slate-700">{step.number}</span></div><h3 className="mt-4 text-sm font-bold">{step.title}</h3><p className="mt-2 text-xs leading-5 text-slate-800">{step.text}</p></li>)}
          </ol>
          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl bg-slate-50 px-5 py-5 sm:flex-row sm:px-7"><p className="max-w-2xl text-sm leading-6 text-slate-800">AI creates a draft to help you get started. Review the detected fields and make any edits before you publish your form.</p><Link href="/signup" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700">Try Paper2Flow <span aria-hidden="true">→</span></Link></div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 rounded-3xl bg-indigo-600 px-7 py-10 text-center text-white shadow-xl shadow-indigo-200 sm:px-12 md:flex-row md:text-left"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-indigo-200">Ready when you are</p><h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Bring your next paper form online.</h2><p className="mt-2 text-sm text-indigo-100">Create an account to upload, review, and publish a form.</p></div><Link href="/signup" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50">Get Started <span aria-hidden="true">→</span></Link></div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div><Link href="/" aria-label="Paper2Flow home"><Brand /></Link><p className="mt-2 text-xs text-slate-700">A product by Story Crown Technologies Ltd.</p></div><nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-800"><Link href="/privacy" className="hover:text-indigo-800">Privacy Policy</Link><Link href="/terms" className="hover:text-indigo-800">Terms of Use</Link><Link href="/login" className="hover:text-indigo-800">Sign In</Link></nav></div>
        <div className="mx-auto mt-6 max-w-7xl border-t border-slate-200 pt-4 text-xs text-slate-700"><p>© {new Date().getFullYear()} Story Crown Technologies Ltd. All rights reserved.</p></div>
      </footer>
    </main>
  );
}
