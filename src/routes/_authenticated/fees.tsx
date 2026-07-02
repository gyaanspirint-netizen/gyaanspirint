import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Plus, RotateCcw, Trash2, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/fees")({
  component: FeesPage,
});

type Student = { id: string; name: string; batch: string };
type Fee = {
  id: string;
  student_id: string;
  total_amount: number;
  paid_amount: number;
  due_date: string;
  notes: string | null;
  reset_interval: "none" | "monthly" | "quarterly" | "yearly";
};

const schema = z.object({
  student_id: z.string().uuid("Select a student"),
  total_amount: z.coerce.number().min(0, "Must be >= 0"),
  paid_amount: z.coerce.number().min(0, "Must be >= 0"),
  due_date: z.string().min(1, "Due date required"),
  notes: z.string().optional(),
  reset_interval: z.enum(["none", "monthly", "quarterly", "yearly"]),
});

type FormData = z.infer<typeof schema>;

const empty: FormData = {
  student_id: "",
  total_amount: 0,
  paid_amount: 0,
  due_date: "",
  notes: "",
  reset_interval: "none",
};

function statusOf(f: Fee) {
  const pending = f.total_amount - f.paid_amount;
  if (pending <= 0) return { label: "Paid", variant: "default" as const };
  if (f.paid_amount > 0) return { label: "Partial", variant: "secondary" as const };
  return { label: "Pending", variant: "destructive" as const };
}

function FeesPage() {
  const { role, loading } = useAuth();
  if (loading || role === null) return null;
  if (role !== "admin") return <Navigate to="/student" replace />;
  return <AdminFees />;
}

function AdminFees() {
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Fee | null>(null);
  const [form, setForm] = useState<FormData>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [s, f] = await Promise.all([
      supabase.from("students").select("id, name, batch").order("name"),
      supabase
        .from("fees")
        .select("id, student_id, total_amount, paid_amount, due_date, notes, reset_interval")
        .order("due_date", { ascending: true }),
    ]);
    if (s.error) toast.error(s.error.message);
    if (f.error) toast.error(f.error.message);
    setStudents(s.data ?? []);
    setFees(
      (f.data ?? []).map((r) => ({
        ...r,
        total_amount: Number(r.total_amount),
        paid_amount: Number(r.paid_amount),
        reset_interval: (r.reset_interval ?? "none") as Fee["reset_interval"],
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (fee: Fee) => {
    setEditing(fee);
    setForm({
      student_id: fee.student_id,
      total_amount: fee.total_amount,
      paid_amount: fee.paid_amount,
      due_date: fee.due_date,
      notes: fee.notes ?? "",
      reset_interval: fee.reset_interval ?? "none",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fe: Partial<Record<keyof FormData, string>> = {};
      parsed.error.issues.forEach((i) => {
        fe[i.path[0] as keyof FormData] = i.message;
      });
      setErrors(fe);
      return;
    }
    if (parsed.data.paid_amount > parsed.data.total_amount) {
      setErrors({ paid_amount: "Paid cannot exceed total" });
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("fees")
        .update(parsed.data)
        .eq("id", editing.id);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Fee updated");
    } else {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("fees")
        .insert({ ...parsed.data, created_by: u.user?.id ?? null, owner_id: u.user?.id ?? "" });
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Fee added");
    }
    setDialogOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("fees").delete().eq("id", deleteId);
    if (error) return toast.error(error.message);
    toast.success("Fee deleted");
    setDeleteId(null);
    load();
  };

  const resetCycle = async (f: Fee) => {
    if (f.reset_interval === "none") {
      toast.error("Set a reset interval first (monthly/quarterly/yearly).");
      return;
    }
    const months =
      f.reset_interval === "monthly" ? 1 : f.reset_interval === "quarterly" ? 3 : 12;
    const next = new Date(f.due_date);
    next.setMonth(next.getMonth() + months);
    const nextDue = next.toISOString().slice(0, 10);
    const { error } = await supabase
      .from("fees")
      .update({ paid_amount: 0, due_date: nextDue })
      .eq("id", f.id);
    if (error) return toast.error(error.message);
    toast.success(`Cycle reset. New due date: ${format(next, "PPP")}`);
    load();
  };

  const studentName = (id: string) =>
    students.find((s) => s.id === id)?.name ?? "Unknown";

  const totals = useMemo(() => {
    const total = fees.reduce((a, f) => a + f.total_amount, 0);
    const paid = fees.reduce((a, f) => a + f.paid_amount, 0);
    return { total, paid, pending: total - paid };
  }, [fees]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fee Management</h1>
          <p className="text-muted-foreground">
            Track total, paid, and pending fees per student.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Fee
        </Button>
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
            <div className="text-2xl font-bold">₹{totals.total.toFixed(2)}</div>
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
              ₹{totals.paid.toFixed(2)}
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
              ₹{totals.pending.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Fee Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Loading…
            </p>
          ) : fees.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No fee records yet.
            </p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {fees.map((f) => {
                  const status = statusOf(f);
                  const pending = f.total_amount - f.paid_amount;
                  return (
                    <div key={f.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{studentName(f.student_id)}</p>
                          <p className="text-xs text-muted-foreground">Due {format(new Date(f.due_date), "PPP")}</p>
                        </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center mb-3">
                        <div className="rounded-lg bg-muted/50 p-2">
                          <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                          <p className="font-semibold text-sm">₹{f.total_amount.toFixed(0)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2">
                          <p className="text-[10px] text-muted-foreground uppercase">Paid</p>
                          <p className="font-semibold text-sm text-green-600 dark:text-green-500">₹{f.paid_amount.toFixed(0)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2">
                          <p className="text-[10px] text-muted-foreground uppercase">Due</p>
                          <p className="font-semibold text-sm text-destructive">₹{pending.toFixed(0)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 h-10 rounded-xl" onClick={() => openEdit(f)}>
                          <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="h-10 w-10 rounded-xl" onClick={() => resetCycle(f)} disabled={f.reset_interval === "none"}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-10 w-10 rounded-xl" onClick={() => setDeleteId(f.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Cycle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fees.map((f) => {
                      const status = statusOf(f);
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">
                            {studentName(f.student_id)}
                          </TableCell>
                          <TableCell>₹{f.total_amount.toFixed(2)}</TableCell>
                          <TableCell>₹{f.paid_amount.toFixed(2)}</TableCell>
                          <TableCell>
                            ₹{(f.total_amount - f.paid_amount).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(f.due_date), "PPP")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {f.reset_interval}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              title="Reset cycle"
                              onClick={() => resetCycle(f)}
                              disabled={f.reset_interval === "none"}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEdit(f)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setDeleteId(f.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Fee" : "Add Fee"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Student</Label>
              <Select
                value={form.student_id}
                onValueChange={(v) => setForm({ ...form, student_id: v })}
                disabled={!!editing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {s.batch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.student_id && (
                <p className="text-sm text-destructive mt-1">{errors.student_id}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="total">Total Amount</Label>
                <Input
                  id="total"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.total_amount}
                  onChange={(e) =>
                    setForm({ ...form, total_amount: Number(e.target.value) })
                  }
                />
                {errors.total_amount && (
                  <p className="text-sm text-destructive mt-1">{errors.total_amount}</p>
                )}
              </div>
              <div>
                <Label htmlFor="paid">Paid Amount</Label>
                <Input
                  id="paid"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.paid_amount}
                  onChange={(e) =>
                    setForm({ ...form, paid_amount: Number(e.target.value) })
                  }
                />
                {errors.paid_amount && (
                  <p className="text-sm text-destructive mt-1">{errors.paid_amount}</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="due">Due Date</Label>
              <Input
                id="due"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
              {errors.due_date && (
                <p className="text-sm text-destructive mt-1">{errors.due_date}</p>
              )}
            </div>
            <div>
              <Label>Reset Cycle</Label>
              <Select
                value={form.reset_interval}
                onValueChange={(v) =>
                  setForm({ ...form, reset_interval: v as FormData["reset_interval"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No reset (one-time)</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly (3 months)</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Use the Reset button on the row to roll the cycle forward when due.
              </p>
            </div>
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this fee record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}