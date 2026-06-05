import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Coaching Hub" },
      { name: "description", content: "Coaching management for owners and students." },
    ],
  }),
  component: Landing,
});

import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";

function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="flex items-center gap-2 mb-6 text-primary">
        <GraduationCap className="h-8 w-8" />
        <span className="text-xl font-semibold">Coaching Hub</span>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight max-w-2xl">
        Run your coaching, beautifully.
      </h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        A modern management system for coaching owners and their students.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          to="/auth"
          className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Get started
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center rounded-md border border-input px-5 py-2.5 text-sm font-medium hover:bg-accent"
        >
          Open dashboard
        </Link>
      </div>
    </div>
  );
}
