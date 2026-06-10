import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { GraduationCap, Users, Calendar, Wallet, ClipboardCheck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Institute Manager" },
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-primary">
            <GraduationCap className="h-6 w-6" />
            <span className="text-lg font-semibold">Institute Manager</span>
          </div>
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-6 py-16 text-center">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Run your coaching institute smoothly
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              A modern, multi-tenant management system built for coaching owners, teachers, and students.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-md border border-input px-5 py-2.5 text-sm font-medium hover:bg-accent"
              >
                Open dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 py-12 border-t bg-muted/40">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <div key={f.title} className="rounded-lg border bg-background p-5 shadow-sm">
                  <f.icon className="h-6 w-6 text-primary mb-3" />
                  <h3 className="font-semibold text-sm">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-6 text-center text-xs text-muted-foreground">
        Institute Manager — Coaching Hub for owners and students.
      </footer>
    </div>
  );
}
