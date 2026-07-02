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
import { ClipboardList } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";


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

type StudentLite = { id: string; name: string; batch: string };
type MarkRow = { id?: string; student_id: string; marks: string; max_marks: string };

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
  const [batchOptions, setBatchOptions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Test | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Marks dialog state
  const [marksOpen, setMarksOpen] = useState(false);
  const [marksTest, setMarksTest] = useState<Test | null>(null);
  const [marksRows, setMarksRows] = useState<MarkRow[]>([]);
  const [marksStudents, setMarksStudents] = useState<StudentLite[]>([]);
  const [marksSaving, setMarksSaving] = useState(false);

  // Student view: own marks
  const [myMarks, setMyMarks] = useState<Record<string, { marks: number; max_marks: number }>>({});

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
    (async () => {
      const { data } = await supabase.from("batches").select("id, name").order("name");
      setBatchOptions((data ?? []) as { id: string; name: string }[]);
    })();
  }, []);

  // Load student's own marks
  useEffect(() => {
    if (role !== "student") return;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: s } = await supabase.from("students").select("id").eq("user_id", u.user.id).maybeSingle();
      if (!s) return;
      const { data } = await supabase.from("test_marks").select("test_id, marks, max_marks").eq("student_id", s.id);
      const map: Record<string, { marks: number; max_marks: number }> = {};
      (data ?? []).forEach((r: any) => {
        map[r.test_id] = { marks: Number(r.marks ?? 0), max_marks: Number(r.max_marks ?? 0) };
      });
      setMyMarks(map);
    })();
  }, [role]);

  const openMarks = async (t: Test) => {
    setMarksTest(t);
    setMarksOpen(true);
    const { data: studs } = await supabase.from("students").select("id, name, batch").order("name");
    const inBatch = (studs ?? []).filter((s) =>
      s.batch.split(",").map((b) => b.trim()).includes(t.batch),
    );
    setMarksStudents(inBatch);
    const { data: existing } = await supabase
      .from("test_marks")
      .select("id, student_id, marks, max_marks")
      .eq("test_id", t.id);
    const map = new Map<string, { id: string; marks: string; max_marks: string }>();
    (existing ?? []).forEach((m: any) =>
      map.set(m.student_id, { id: m.id, marks: m.marks?.toString() ?? "", max_marks: m.max_marks?.toString() ?? "" }),
    );
    setMarksRows(
      inBatch.map((s) => ({
        student_id: s.id,
        id: map.get(s.id)?.id,
        marks: map.get(s.id)?.marks ?? "",
        max_marks: map.get(s.id)?.max_marks ?? "",
      })),
    );
  };

  const saveMarks = async () => {
    if (!marksTest) return;
    setMarksSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const ownerId = u.user?.id ?? "";
    const payload = marksRows
      .filter((r) => r.marks !== "" || r.max_marks !== "")
      .map((r) => ({
        test_id: marksTest.id,
        student_id: r.student_id,
        owner_id: ownerId,
        marks: r.marks === "" ? null : Number(r.marks),
        max_marks: r.max_marks === "" ? null : Number(r.max_marks),
      }));
    if (payload.length > 0) {
      const { error } = await supabase.from("test_marks").upsert(payload, { onConflict: "test_id,student_id" });
      if (error) {
        setMarksSaving(false);
        return toast.error(error.message);
      }
    }
    setMarksSaving(false);
    setMarksOpen(false);
    toast.success("Marks saved");
  };

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
      const batchList = parsed.data.batch
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean);
      const rowsToInsert = batchList.map((b) => ({
        test_name: parsed.data.test_name,
        subject: parsed.data.subject,
        test_date: parsed.data.test_date,
        batch: b,
        created_by: userData.user?.id ?? null,
        owner_id: userData.user?.id ?? "",
      }));
      const { error } = await supabase.from("tests").insert(rowsToInsert);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success(batchList.length > 1 ? `Test added to ${batchList.length} batches` : "Test added");
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
      {!isAdmin && (
        <TableCell>
          {myMarks[t.id]
            ? `${myMarks[t.id].marks} / ${myMarks[t.id].max_marks}`
            : <span className="text-muted-foreground">—</span>}
        </TableCell>
      )}
      {isAdmin && (
        <TableCell className="text-right space-x-2">
          <Button variant="outline" size="icon" onClick={() => openMarks(t)} title="Assign Marks">
            <ClipboardList className="h-4 w-4" />
          </Button>
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

  const renderCard = (t: Test) => (
    <div key={t.id} className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-semibold truncate">{t.test_name}</p>
          <p className="text-xs text-muted-foreground">{t.subject} · {format(new Date(t.test_date), "PPP")}</p>
        </div>
        <Badge variant="secondary" className="shrink-0">{t.batch}</Badge>
      </div>
      {!isAdmin && (
        <div className="rounded-lg bg-muted/50 p-2 text-center mb-2">
          <p className="text-[10px] text-muted-foreground uppercase">My Marks</p>
          <p className="font-semibold">
            {myMarks[t.id] ? `${myMarks[t.id].marks} / ${myMarks[t.id].max_marks}` : "—"}
          </p>
        </div>
      )}
      {isAdmin && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 h-10 rounded-xl" onClick={() => openMarks(t)}>
            <ClipboardList className="h-4 w-4 mr-1" /> Marks
          </Button>
          <Button size="sm" variant="outline" className="h-10 w-10 rounded-xl" onClick={() => openEdit(t)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" className="h-10 w-10 rounded-xl" onClick={() => setDeleteId(t.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
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
                    {!isAdmin && <TableHead>My Marks</TableHead>}
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
                    {!isAdmin && <TableHead>My Marks</TableHead>}
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
              <Label htmlFor="batch">Batch{!editing && batchOptions.length > 0 ? "es (select one or more)" : ""}</Label>
              {batchOptions.length > 0 ? (
                editing ? (
                  <Select value={form.batch} onValueChange={(v) => setForm({ ...form, batch: v })}>
                    <SelectTrigger id="batch">
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {batchOptions.map((b) => (
                        <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="rounded-md border p-3 space-y-2 max-h-44 overflow-y-auto">
                    {batchOptions.map((b) => {
                      const selected = form.batch.split(",").map((x) => x.trim()).filter(Boolean);
                      const isOn = selected.includes(b.name);
                      return (
                        <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={isOn}
                            onCheckedChange={(c) => {
                              const next = c
                                ? Array.from(new Set([...selected, b.name]))
                                : selected.filter((x) => x !== b.name);
                              setForm({ ...form, batch: next.join(", ") });
                            }}
                          />
                          <span>{b.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )
              ) : (
                <Input
                  id="batch"
                  placeholder="No batches yet — create one first"
                  value={form.batch}
                  onChange={(e) => setForm({ ...form, batch: e.target.value })}
                />
              )}
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

      <Dialog open={marksOpen} onOpenChange={setMarksOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Marks{marksTest ? ` — ${marksTest.test_name}` : ""}</DialogTitle>
          </DialogHeader>
          {marksStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No students in this batch.</p>
          ) : (
            <div className="rounded-md border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="w-32">Marks</TableHead>
                    <TableHead className="w-32">Max</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marksRows.map((r, i) => {
                    const s = marksStudents.find((x) => x.id === r.student_id);
                    return (
                      <TableRow key={r.student_id}>
                        <TableCell>{s?.name}</TableCell>
                        <TableCell>
                          <Input type="number" value={r.marks} onChange={(e) => {
                            const next = [...marksRows]; next[i] = { ...r, marks: e.target.value }; setMarksRows(next);
                          }} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" value={r.max_marks} onChange={(e) => {
                            const next = [...marksRows]; next[i] = { ...r, max_marks: e.target.value }; setMarksRows(next);
                          }} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarksOpen(false)}>Cancel</Button>
            <Button onClick={saveMarks} disabled={marksSaving}>{marksSaving ? "Saving..." : "Save Marks"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}