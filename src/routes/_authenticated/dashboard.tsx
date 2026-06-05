import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Users, BookOpen, Calendar, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Coaching Hub" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, role } = useAuth();

  const stats =
    role === "admin"
      ? [
          { label: "Total Students", value: "—", icon: Users },
          { label: "Active Courses", value: "—", icon: BookOpen },
          { label: "Sessions This Week", value: "—", icon: Calendar },
          { label: "Revenue", value: "—", icon: TrendingUp },
        ]
      : [
          { label: "Enrolled Courses", value: "—", icon: BookOpen },
          { label: "Upcoming Sessions", value: "—", icon: Calendar },
          { label: "Progress", value: "—", icon: TrendingUp },
        ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          {role === "admin"
            ? "Manage your coaching at a glance."
            : "Track your learning journey."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Project structure is ready. Features will be added next.
        </CardContent>
      </Card>
    </div>
  );
}