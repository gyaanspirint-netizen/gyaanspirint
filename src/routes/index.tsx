import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { GraduationCap, Users, Calendar, Wallet, ClipboardCheck, ArrowRight, Sparkles } from "lucide-react";
import logoAsset from "@/assets/gyanspirint-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gyanspirint — Coaching & Tuition Management" },
      { name: "description", content: "All-in-one coaching institute management: students, batches, attendance, fees, tests, and schedules." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Users, title: "Student Management", desc: "Admit students to multiple batches, track profiles, and manage records in one place." },
  { icon: Calendar, title: "Batches & Schedule", desc: "Create batches with custom timings, assign teachers, and publish batch-specific schedules." },
  { icon: ClipboardCheck, title: "Attendance & Tests", desc: "Mark batch-wise attendance and record test marks for every student." },
  { icon: Wallet, title: "Fees & Homework", desc: "Track fee payments with reset options and assign homework by student or entire batch." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Ambient gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{ background: "var(--gradient-hero)" }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-border/60 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <img
              src={logoAsset.url}
              alt="Gyanspirint"
              className="h-10 w-10 rounded-lg object-contain bg-white shadow-md"
            />
            <span className="text-lg font-semibold tracking-tight">Gyanspirint</span>
          </div>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            style={{ background: "var(--gradient-brand)" }}
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        {/* Hero */}
        <section className="px-6 py-20 text-center">
          <div className="mx-auto max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Built for modern coaching institutes
            </span>
            <h1 className="mt-6 text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              Run your coaching institute,{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-brand)" }}
              >
                effortlessly
              </span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">
              A modern, multi-tenant management system built for coaching owners, teachers, and students.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
                style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-elegant)" }}
              >
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-md border border-input bg-card/80 px-6 py-2.5 text-sm font-medium backdrop-blur hover:bg-accent"
              >
                Open dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 py-16 border-t border-border/60">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">Everything you need</h2>
              <p className="mt-2 text-muted-foreground">One platform for every part of your institute.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="group relative rounded-xl border border-border/70 bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div
                    className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg text-primary-foreground"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60 px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Gyanspirint — built for coaching institutes and tuition centers.
      </footer>
    </div>
  );
}
