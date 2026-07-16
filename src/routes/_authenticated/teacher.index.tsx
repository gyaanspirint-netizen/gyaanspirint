import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getTeacherDashboard } from "@/lib/teacher-portal.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, NotebookPen, FileText, Users, Calendar, Megaphone, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher/")({
  head: () => ({ meta: [{ title: "Teacher Dashboard — Gyanspirint" }] }),
  component: TeacherDashboard,
});

function TeacherDashboard() {
  const fn = useServerFn(getTeacherDashboard);
  const [data, setData] = useState<any | null>(null);
  useEffect(() => { fn().then(setData).catch(() => {}); }, [fn]);

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
  const todayDay = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()];
  const todaysClasses = (data?.assignments ?? []).filter((a: any) => {
    const days: string[] = a.batches?.schedule_days ?? [];
    return days.length === 0 || days.includes(todayDay);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 md:p-6 border">
        <div className="text-xs text-muted-foreground">{today}</div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight mt-1">Welcome, {data?.teacher?.full_name ?? "Teacher"}</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Students" value={data?.counts?.students ?? "—"} />
        <StatCard label="Attendance today" value={data?.counts?.attendanceMarkedToday ?? "—"} />
        <StatCard label="Updates published" value={data?.counts?.updatesPublished ?? "—"} />
        <StatCard label="Tests" value={data?.counts?.tests ?? "—"} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction to="/teacher/attendance" icon={ClipboardCheck} label="Mark attendance" />
        <QuickAction to="/teacher/updates" icon={NotebookPen} label="Class update" />
        <QuickAction to="/teacher/tests" icon={FileText} label="Upload marks" />
        <QuickAction to="/teacher/students" icon={Users} label="View students" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Today's classes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {todaysClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes scheduled today.</p>
            ) : todaysClasses.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">{a.batches?.name}</div>
                  <div className="text-xs text-muted-foreground">{a.subject ?? "—"}</div>
                </div>
                <div className="text-xs font-mono">{a.batches?.start_time?.slice(0,5)} – {a.batches?.end_time?.slice(0,5)}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.recentActivity ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : data.recentActivity.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                <div className="truncate">{a.action}</div>
                <div className="text-xs text-muted-foreground shrink-0 ml-2">{new Date(a.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 md:hidden">
        <Link to="/teacher/announcements" className="rounded-2xl border bg-card p-4 flex items-center gap-2"><Megaphone className="h-4 w-4" /> Announcements</Link>
        <Link to="/teacher/remarks" className="rounded-2xl border bg-card p-4 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Remarks</Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tracking-tight mt-1">{value}</div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to} className="rounded-2xl border bg-card hover:bg-accent transition-colors p-4 flex flex-col gap-2 min-h-[92px]">
      <Icon className="h-5 w-5 text-primary" />
      <div className="text-sm font-medium">{label}</div>
    </Link>
  );
}
