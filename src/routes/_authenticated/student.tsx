import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Wallet,
  Loader2,
  UserCheck,
  UserX,
  CalendarDays,
  Clock,
  FileText,
  Percent,
  Users,
  BookOpen,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/student")({
  head: () => ({ meta: [{ title: "Student Dashboard — Institute Manager" }] }),
  component: StudentDashboard,
});

function StudentDashboard() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [feePopup, setFeePopup] = useState(false);
  const [student, setStudent] = useState<{
    id: string;
    name: string;
    batch: string;
    admission_date: string;
  } | null>(null);
  const [attendance, setAttendance] = useState<
    { id: string; date: string; status: "present" | "absent" }[]
  >([]);
  const [tests, setTests] = useState<
    { id: string; test_name: string; subject: string; batch: string; test_date: string }[]
  >([]);
  const [batches, setBatches] = useState<
    {
      id: string;
      name: string;
      course_name: string | null;
      start_date: string | null;
      end_date: string | null;
      start_time: string;
      end_time: string;
      schedule_type: string;
      schedule_days: string[];
      status: string;
    }[]
  >([]);
  const [teachers, setTeachers] = useState<
    { id: string; batch_id: string; teacher_name: string; subject: string; email: string }[]
  >([]);
  const [scheduleCounts, setScheduleCounts] = useState<{ total: number; upcoming: number }>({ total: 0, upcoming: 0 });
  const [fees, setFees] = useState<
    {
      id: string;
      total_amount: number;
      paid_amount: number;
      due_date: string;
      notes: string | null;
    }[]
  >([]);

  useEffect(() => {
    if (role !== "student" || !user) return;
    (async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);

      const [studentRes, feesRes, attendanceRes, testsRes] = await Promise.all([
        supabase
          .from("students")
          .select("id, name, batch, admission_date")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
        .from("fees")
        .select("id, total_amount, paid_amount, due_date, notes")
          .order("due_date", { ascending: true }),
        supabase
          .from("attendance")
          .select("id, date, status")
          .order("date", { ascending: false }),
        supabase
          .from("tests")
          .select("id, test_name, subject, batch, test_date")
          .gte("test_date", today)
          .order("test_date", { ascending: true }),
      ]);

      if (studentRes.data) setStudent(studentRes.data);

      const batchNames = (studentRes.data?.batch ?? "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (batchNames.length > 0) {
        const { data: bs } = await supabase
          .from("batches")
          .select("id, name, course_name, start_date, end_date, start_time, end_time, schedule_type, schedule_days, status")
          .in("name", batchNames);
        const myBatches = (bs ?? []) as typeof batches;
        setBatches(myBatches);
        if (myBatches.length > 0) {
          const ids = myBatches.map((b) => b.id);
          const [tRes, schRes] = await Promise.all([
            supabase.from("batch_teachers").select("*").in("batch_id", ids),
            supabase.from("schedule").select("id, schedule_date").in("batch_id", ids),
          ]);
          setTeachers((tRes.data ?? []) as typeof teachers);
          const all = schRes.data ?? [];
          setScheduleCounts({
            total: all.length,
            upcoming: all.filter((s) => s.schedule_date >= today).length,
          });
        }
      }

      if (!feesRes.error) {
        const mapped = (feesRes.data ?? []).map((r) => ({
            ...r,
            total_amount: Number(r.total_amount),
            paid_amount: Number(r.paid_amount),
        }));
        setFees(mapped);
        const hasPending = mapped.some((f) => f.total_amount - f.paid_amount > 0);
        if (hasPending) setFeePopup(true);
      }
      if (!attendanceRes.error) {
        setAttendance(
          (attendanceRes.data ?? []).map((r) => ({
            id: r.id,
            date: r.date,
            status: r.status as "present" | "absent",
          })),
        );
      }
      if (!testsRes.error) {
        const studentBatch = studentRes.data?.batch;
        const allTests = testsRes.data ?? [];
        setTests(studentBatch ? allTests.filter((t) => t.batch === studentBatch) : allTests);
      }
      setLoading(false);
    })();
  }, [role, user]);

  if (role === null) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }
  if (role !== "student") return <Navigate to="/admin" replace />;

  const totals = fees.reduce(
    (acc, f) => {
      acc.total += f.total_amount;
      acc.paid += f.paid_amount;
      return acc;
    },
    { total: 0, paid: 0 },
  );
  const pending = totals.total - totals.paid;
  const nextDue = fees
    .filter((f) => f.total_amount - f.paid_amount > 0)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const feeStatus =
    fees.length === 0
      ? { label: "No Records", variant: "outline" as const }
      : pending <= 0
        ? { label: "Paid", variant: "default" as const }
        : totals.paid > 0
          ? { label: "Partial", variant: "secondary" as const }
          : { label: "Pending", variant: "destructive" as const };

  // Dedupe by date: a day is "present" if marked present in ANY batch that day.
  const dayStatusMap = attendance.reduce<Record<string, "present" | "absent">>((acc, a) => {
    if (acc[a.date] === "present") return acc;
    acc[a.date] = a.status;
    return acc;
  }, {});
  const dayStatuses = Object.values(dayStatusMap);
  const presentDays = dayStatuses.filter((s) => s === "present").length;
  const absentDays = dayStatuses.filter((s) => s === "absent").length;
  const totalDays = presentDays + absentDays;
  const attendancePct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  return (
    <div className="space-y-6">
      <AlertDialog open={feePopup} onOpenChange={setFeePopup}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pending Fees</AlertDialogTitle>
            <AlertDialogDescription>
              You have pending fees of ₹{pending.toFixed(2)}
              {nextDue ? `, due ${format(new Date(nextDue.due_date), "PP")}` : ""}. Please pay soon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setFeePopup(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="rounded-lg border bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
        <p className="text-sm font-medium text-primary uppercase tracking-wide">Welcome back</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-1">
          {student?.name ?? (user?.email ? user.email.split("@")[0] : "Student")} 👋
        </h1>
        <p className="text-muted-foreground mt-2 max-w-xl">
          Great to see you again! Stay consistent — every class, every assignment, every test brings you closer to your goal. Here's your study overview for today.
        </p>
      </div>

      {!loading && !student && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground text-center">
            Your student profile hasn't been linked yet. Please ask your admin to link your account.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "—" : scheduleCounts.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Classes</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "—" : scheduleCounts.upcoming}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assigned Teachers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "—" : new Set(teachers.map((t) => t.teacher_name)).size}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Batches</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "—" : batches.length}</div>
          </CardContent>
        </Card>
      </div>

      {batches.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {batches.map((b) => {
            const bTeachers = teachers.filter((t) => t.batch_id === b.id);
            const scheduleLabel = b.schedule_type === "daily" ? "Daily"
              : b.schedule_type === "alternate" ? "Alternate Days"
              : (b.schedule_days?.length ? b.schedule_days.join(", ") : "Custom");
            return (
              <Card key={b.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{b.name}</CardTitle>
                      {b.course_name && (
                        <p className="text-sm text-muted-foreground mt-1">{b.course_name}</p>
                      )}
                    </div>
                    <Badge variant={b.status === "active" ? "default" : "secondary"}>{b.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">Code:</span> {b.id.slice(0, 8)}</div>
                    <div><span className="text-muted-foreground">Timing:</span> {b.start_time.slice(0,5)} – {b.end_time.slice(0,5)}</div>
                    <div><span className="text-muted-foreground">Start:</span> {b.start_date ? format(new Date(b.start_date), "PP") : "—"}</div>
                    <div><span className="text-muted-foreground">End:</span> {b.end_date ? format(new Date(b.end_date), "PP") : "—"}</div>
                  </div>
                  <div><span className="text-muted-foreground">Schedule:</span> {scheduleLabel}</div>
                  <div>
                    <p className="text-muted-foreground mb-1">Teachers ({bTeachers.length}):</p>
                    {bTeachers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No teachers assigned yet.</p>
                    ) : (
                      <ul className="space-y-1">
                        {bTeachers.map((t) => (
                          <li key={t.id} className="text-xs">
                            <span className="font-medium">{t.teacher_name}</span>
                            {t.subject && <span className="text-muted-foreground"> · {t.subject}</span>}
                            {t.email && <span className="text-muted-foreground"> · {t.email}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attendance
            </CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">
              {loading ? "—" : `${attendancePct}%`}
            </div>
            <Progress value={attendancePct} />
            <p className="text-xs text-muted-foreground">
              {totalDays} day{totalDays === 1 ? "" : "s"} recorded
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Present Days
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">
              {loading ? "—" : presentDays}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Absent Days
            </CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {loading ? "—" : absentDays}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Batch
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "—" : student?.batch ?? "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Your assigned batch</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fee Status
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <Badge variant={feeStatus.variant}>{feeStatus.label}</Badge>
            <p className="text-xs text-muted-foreground">
              Total: {loading ? "—" : `₹${totals.total.toFixed(2)}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Fees
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {loading ? "—" : `₹${pending.toFixed(2)}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Paid: ₹{totals.paid.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next Due Date
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading
                ? "—"
                : nextDue
                  ? format(new Date(nextDue.due_date), "PP")
                  : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {nextDue ? `₹${(nextDue.total_amount - nextDue.paid_amount).toFixed(2)} due` : "No pending dues"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Upcoming Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
            ) : tests.length === 0 ? (
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
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tests.slice(0, 8).map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.test_name}</TableCell>
                        <TableCell>{t.subject}</TableCell>
                        <TableCell>{format(new Date(t.test_date), "PP")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Recent Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
            ) : attendance.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No attendance records yet.
              </p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.slice(0, 8).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{format(new Date(a.date), "PP")}</TableCell>
                        <TableCell>
                          <Badge
                            variant={a.status === "present" ? "default" : "destructive"}
                          >
                            {a.status}
                          </Badge>
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

      <Card>
        <CardHeader>
          <CardTitle>My Fee Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Loading…
            </p>
          ) : fees.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No fee records assigned yet. Ask your admin to link your account.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((f) => {
                    const p = f.total_amount - f.paid_amount;
                    const status =
                      p <= 0
                        ? { label: "Paid", variant: "default" as const }
                        : f.paid_amount > 0
                          ? { label: "Partial", variant: "secondary" as const }
                          : { label: "Pending", variant: "destructive" as const };
                    return (
                      <TableRow key={f.id}>
                        <TableCell>₹{f.total_amount.toFixed(2)}</TableCell>
                        <TableCell>₹{f.paid_amount.toFixed(2)}</TableCell>
                        <TableCell>₹{p.toFixed(2)}</TableCell>
                        <TableCell>{format(new Date(f.due_date), "PPP")}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {f.notes ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}