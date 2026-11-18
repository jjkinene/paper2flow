import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Upload your paper form",
    description: "Start with a PDF, JPG, or PNG. Paper2Flow reads the structure for you.",
    icon: "↥",
  },
  {
    number: "02",
    title: "Review fields with AI",
    description: "See detected questions in an editable form builder. Refine labels, types, and options.",
    icon: "✳",
  },
  {
    number: "03",
    title: "Publish and collect",
    description: "Share a public link, collect responses, and export everything to CSV.",
    icon: "↗",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8f9fc] text-slate-900">
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Paper2Flow home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white shadow-md shadow-indigo-200">P</span>
          <span className="text-lg font-bold tracking-tight">Paper<span className="text-indigo-600">2</span>Flow</span>
        </Link>
        <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-indigo-700">Sign In</Link>
      </nav>

      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[1.05fr_.95fr] lg:px-12 lg:pb-28 lg:pt-20">
        <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> AI-powered form digitization
          </div>
          <h1 className="text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Turn Paper Forms into <span className="text-indigo-600">Online Forms</span> with AI
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Bring your paper process online in minutes. Upload a form, let AI find the fields, review the result, then share a link and start collecting responses.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700">
              Get Started <span aria-hidden="true">→</span>
            </Link>
            <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700">See how it works</a>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5"><span className="text-emerald-600">✓</span> PDF, JPG, and PNG</span>
            <span className="flex items-center gap-1.5"><span className="text-emerald-600">✓</span> Edit before publishing</span>
            <span className="flex items-center gap-1.5"><span className="text-emerald-600">✓</span> Export responses to CSV</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:mr-2">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-indigo-200/70 via-violet-100/60 to-sky-100/70 blur-2xl" />
          <div className="relative rounded-[1.75rem] border border-white bg-white p-4 shadow-2xl shadow-indigo-900/10 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-lg">▤</div>
                <div><p className="text-sm font-bold">Event registration</p><p className="text-xs text-slate-400">Your form is taking shape</p></div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">AI reviewed</span>
            </div>
            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[.14em] text-slate-400">Detected fields</span>
                <span className="text-xs font-medium text-indigo-600">4 fields</span>
              </div>
              <div className="space-y-3">
                {[["Full name", "text"], ["Email address", "email"], ["Attendance day", "date"]].map(([label, type]) => (
                  <div key={label} className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white px-3.5 py-3">
                    <div><p className="text-xs font-semibold text-slate-700">{label}</p><p className="mt-0.5 text-[10px] text-slate-400">{type} field · required</p></div>
                    <span className="text-slate-300">⠿</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/60 px-3.5 py-3 text-xs font-medium text-indigo-600"><span>＋</span> Add a field</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3.5 text-white">
              <div><p className="text-xs font-semibold">Ready to share?</p><p className="mt-0.5 text-[10px] text-slate-400">Your form link is live</p></div>
              <span className="rounded-lg bg-indigo-500 px-3 py-2 text-[11px] font-semibold">Copy link ↗</span>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-5 hidden items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-xl sm:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">✓</span>
            <div><p className="text-xs font-bold">Responses collected</p><p className="text-[10px] text-slate-400">Ready to export as CSV</p></div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-slate-200/70 bg-white px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600">A simpler workflow</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">From paper to published in three steps</h2>
            <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base">Keep the questions you already use. Make them easier to share, answer, and manage.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number} className="rounded-2xl border border-slate-200 bg-[#fbfcff] p-6 transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-900/5">
                <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-xl font-semibold text-indigo-600">{step.icon}</span><span className="text-xs font-bold tracking-widest text-slate-300">{step.number}</span></div>
                <h3 className="mt-5 text-base font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 rounded-3xl bg-indigo-600 px-7 py-10 text-center text-white shadow-xl shadow-indigo-200 sm:px-12 md:flex-row md:text-left">
          <div><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Your next form can be online today.</h2><p className="mt-2 text-sm text-indigo-100">Start with the paper forms you already have.</p></div>
          <Link href="/signup" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50">Get Started <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <footer className="border-t border-slate-200/70 px-5 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-xs text-slate-400 sm:flex-row">
          <span className="font-semibold text-slate-600">Paper<span className="text-indigo-600">2</span>Flow</span>
          <span>Make every form easier to fill out.</span>
          <Link href="/login" className="font-medium text-slate-500 hover:text-indigo-600">Sign in</Link>
        </div>
      </footer>
    </main>
  );
}
