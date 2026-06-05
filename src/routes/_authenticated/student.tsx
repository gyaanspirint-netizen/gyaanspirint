import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { Wallet, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/student")({
  head: () => ({ meta: [{ title: "Student Dashboard — Coaching Hub" }] }),
  component: StudentDashboard,
});

function StudentDashboard() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
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
      const { data, error } = await supabase
        .from("fees")
        .select("id, total_amount, paid_amount, due_date, notes")
        .order("due_date", { ascending: true });
      if (!error) {
        setFees(
          (data ?? []).map((r) => ({
            ...r,
            total_amount: Number(r.total_amount),
            paid_amount: Number(r.paid_amount),
          })),
        );
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""} — track your learning journey.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Fees
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "—" : `₹${totals.total.toFixed(2)}`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">
              {loading ? "—" : `₹${totals.paid.toFixed(2)}`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {loading ? "—" : `₹${pending.toFixed(2)}`}
            </div>
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