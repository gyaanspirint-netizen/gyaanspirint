import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { BookOpen, Calendar, TrendingUp, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student")({
  head: () => ({ meta: [{ title: "Student Dashboard — Coaching Hub" }] }),
  component: StudentDashboard,
});

function StudentDashboard() {
  const { user, role } = useAuth();

  if (role === null) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }
  if (role !== "student") return <Navigate to="/admin" replace />;

  const stats = [
    { label: "Enrolled Courses", value: "—", icon: BookOpen },
    { label: "Upcoming Sessions", value: "—", icon: Calendar },
    { label: "Progress", value: "—", icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""} — track your learning journey.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}