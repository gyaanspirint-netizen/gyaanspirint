import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import {
  Users,
  UserCheck,
  UserX,
  CalendarDays,
  Loader2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — Coaching Hub" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [absentToday, setAbsentToday] = useState(0);
  const [upcomingTests, setUpcomingTests] = useState<
    { id: string; test_name: string; subject: string; batch: string; test_date: string }[]
  >([]);

  useEffect(() => {
    if (role !== "admin") return;
    (async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const [studentsRes, presentRes, absentRes, testsRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("date", today)
          .eq("status", "present"),
        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("date", today)
          .eq("status", "absent"),
        supabase
          .from("tests")
          .select("id, test_name, subject, batch, test_date")
          .gte("test_date", today)
          .order("test_date", { ascending: true })
          .limit(5),
      ]);
      setTotalStudents(studentsRes.count ?? 0);
      setPresentToday(presentRes.count ?? 0);
      setAbsentToday(absentRes.count ?? 0);
      setUpcomingTests(testsRes.data ?? []);
      setLoading(false);
    })();
  }, [role]);

  if (role === null) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }
  if (role !== "admin") return <Navigate to="/student" replace />;

  const stats = [
    {
      label: "Total Students",
      value: totalStudents,
      icon: Users,
      accent: "text-primary",
    },
    {
      label: "Present Today",
      value: presentToday,
      icon: UserCheck,
      accent: "text-green-600 dark:text-green-500",
    },
    {
      label: "Absent Today",
      value: absentToday,
      icon: UserX,
      accent: "text-destructive",
    },
    {
      label: "Upcoming Tests",
      value: upcomingTests.length,
      icon: CalendarDays,
      accent: "text-primary",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""} — manage your coaching at a glance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className={`h-4 w-4 ${s.accent}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "—" : s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Tests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
            </div>
          ) : upcomingTests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No upcoming tests scheduled.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingTests.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        {t.test_name}
                      </TableCell>
                      <TableCell>{t.subject}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{t.batch}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {format(new Date(t.test_date), "PPP")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}