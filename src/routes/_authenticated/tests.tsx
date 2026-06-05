import { createFileRoute } from "@tanstack/react-router";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Plus, Trash2, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tests")({
  component: TestsPage,
});

type Test = {
  id: string;
  test_name: string;
  subject: string;
  batch: string;
  test_date: string;
};

const schema = z.object({
  test_name: z.string().min(1, "Test name is required"),
  subject: z.string().min(1, "Subject is required"),
  batch: z.string().min(1, "Batch is required"),
  test_date: z.string().min(1, "Test date is required"),
});

type FormData = z.infer<typeof schema>;

const emptyForm: FormData = {
  test_name: "",
  subject: "",
  batch: "",
  test_date: "",
};

function TestsPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Test | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchTests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tests")
      .select("id, test_name, subject, batch, test_date")
      .order("test_date", { ascending: true });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTests(data ?? []);
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (t: Test) => {
    setEditing(t);
    setForm({
      test_name: t.test_name,
      subject: t.subject,
      batch: t.batch,
      test_date: t.test_date,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormData, string>> = {};
      parsed.error.issues.forEach((i) => {
        fieldErrors[i.path[0] as keyof FormData] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("tests")
        .update(parsed.data)
        .eq("id", editing.id);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Test updated");
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("tests")
        .insert({ ...parsed.data, created_by: userData.user?.id ?? null });
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Test added");
    }
    setDialogOpen(false);
    fetchTests();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("tests").delete().eq("id", deleteId);
    if (error) return toast.error(error.message);
    toast.success("Test deleted");
    setDeleteId(null);
    fetchTests();
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = useMemo(
    () => tests.filter((t) => t.test_date >= today),
    [tests, today],
  );
  const past = useMemo(
    () => tests.filter((t) => t.test_date < today),
    [tests, today],
  );

  const renderRow = (t: Test) => (
    <TableRow key={t.id}>
      <TableCell className="font-medium">{t.test_name}</TableCell>
      <TableCell>{t.subject}</TableCell>
      <TableCell>{t.batch}</TableCell>
      <TableCell>{format(new Date(t.test_date), "PPP")}</TableCell>
      {isAdmin && (
        <TableCell className="text-right space-x-2">
          <Button variant="outline" size="icon" onClick={() => openEdit(t)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDeleteId(t.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      )}
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Test Schedule</h1>
          <p className="text-muted-foreground">
            View upcoming tests{isAdmin ? " and manage the schedule" : ""}.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" /> Add Test
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Upcoming Tests
            <Badge variant="secondary" className="ml-2">
              {upcoming.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Loading…
            </p>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No upcoming tests scheduled.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Date</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>{upcoming.map(renderRow)}</TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Date</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>{past.map(renderRow)}</TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Test" : "Add Test"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="test_name">Test Name</Label>
              <Input
                id="test_name"
                value={form.test_name}
                onChange={(e) => setForm({ ...form, test_name: e.target.value })}
              />
              {errors.test_name && (
                <p className="text-sm text-destructive mt-1">{errors.test_name}</p>
              )}
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
              {errors.subject && (
                <p className="text-sm text-destructive mt-1">{errors.subject}</p>
              )}
            </div>
            <div>
              <Label htmlFor="batch">Batch</Label>
              <Input
                id="batch"
                value={form.batch}
                onChange={(e) => setForm({ ...form, batch: e.target.value })}
              />
              {errors.batch && (
                <p className="text-sm text-destructive mt-1">{errors.batch}</p>
              )}
            </div>
            <div>
              <Label htmlFor="test_date">Test Date</Label>
              <Input
                id="test_date"
                type="date"
                value={form.test_date}
                onChange={(e) => setForm({ ...form, test_date: e.target.value })}
              />
              {errors.test_date && (
                <p className="text-sm text-destructive mt-1">{errors.test_date}</p>
              )}
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
            <AlertDialogTitle>Delete this test?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}