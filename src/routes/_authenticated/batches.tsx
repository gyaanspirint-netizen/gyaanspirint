import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Loader2, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/batches")({
  head: () => ({ meta: [{ title: "Batches — Gyanspirint" }] }),
  component: BatchesPage,
});

type Batch = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  course_name: string | null;
  start_date: string | null;
  end_date: string | null;
  schedule_type: string;
  schedule_days: string[];
  status: string;
};

type Assignment = { id: string; batch_id: string; teacher_id: string; subject: string | null };
type EnrolledTeacher = { id: string; full_name: string };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  course_name: z.string().trim().max(100).optional().or(z.literal("")),
  start_date: z.string().optional().or(z.literal("")),
  end_date: z.string().optional().or(z.literal("")),
  schedule_type: z.enum(["daily", "alternate", "custom"]),
  schedule_days: z.array(z.string()),
  status: z.enum(["active", "completed"]),
}).refine((d) => d.end_time > d.start_time, { message: "End time must be after start time", path: ["end_time"] });
type FormValues = z.infer<typeof schema>;
const empty: FormValues = {
  name: "", start_time: "09:00", end_time: "10:00",
  course_name: "", start_date: "", end_date: "",
  schedule_type: "daily", schedule_days: [], status: "active",
};

function BatchesPage() {
  const { role } = useAuth();
  const [rows, setRows] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [form, setForm] = useState<FormValues>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherForm, setTeacherForm] = useState({ teacher_name: "", subject: "", email: "" });
  const [teacherBatch, setTeacherBatch] = useState<Batch | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("batches")
      .select("*")
      .order("start_time");
    if (error) toast.error(error.message);
    setRows((data ?? []) as Batch[]);
    // Count students per batch (student.batch can be a comma-separated list of batch names)
    const { data: students } = await supabase.from("students").select("batch");
    const map: Record<string, number> = {};
    (students ?? []).forEach((s) => {
      (s.batch ?? "")
        .split(",")
        .map((b: string) => b.trim())
        .filter(Boolean)
        .forEach((name: string) => {
          map[name] = (map[name] ?? 0) + 1;
        });
    });
    setCounts(map);
    const { data: ts } = await supabase.from("batch_teachers").select("*");
    setTeachers((ts ?? []) as Teacher[]);
    setLoading(false);
  };

  useEffect(() => {
    if (role === "admin") fetchAll();
  }, [role]);

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setErrors({});
    setTeacherForm({ teacher_name: "", subject: "", email: "" });
    setOpen(true);
  };
  const openEdit = (b: Batch) => {
    setEditing(b);
    setForm({
      name: b.name,
      start_time: b.start_time.slice(0, 5),
      end_time: b.end_time.slice(0, 5),
      course_name: b.course_name ?? "",
      start_date: b.start_date ?? "",
      end_date: b.end_date ?? "",
      schedule_type: (b.schedule_type as FormValues["schedule_type"]) ?? "daily",
      schedule_days: b.schedule_days ?? [],
      status: (b.status as FormValues["status"]) ?? "active",
    });
    setErrors({});
    setTeacherForm({ teacher_name: "", subject: "", email: "" });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fe: Partial<Record<keyof FormValues, string>> = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as keyof FormValues;
        if (k && !fe[k]) fe[k] = i.message;
      });
      setErrors(fe);
      return;
    }
    const d = parsed.data;
    const payload = {
      name: d.name,
      start_time: d.start_time,
      end_time: d.end_time,
      course_name: d.course_name || null,
      start_date: d.start_date || null,
      end_date: d.end_date || null,
      schedule_type: d.schedule_type,
      schedule_days: d.schedule_type === "custom" ? d.schedule_days : [],
      status: d.status,
    };
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("batches")
        .update(payload)
        .eq("id", editing.id);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Batch updated");
    } else {
      const { data: u } = await supabase.auth.getUser();
      const { data: inserted, error } = await supabase
        .from("batches")
        .insert({ ...payload, owner_id: u.user?.id ?? "", created_by: u.user?.id ?? null })
        .select("*")
        .single();
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Batch added — you can now assign teachers below");
      // Switch to edit mode so the Teachers section becomes available without closing.
      setEditing(inserted as Batch);
      await fetchAll();
      return;
    }
    setOpen(false);
    fetchAll();
  };

  const activeBatch = teacherBatch ?? editing;

  const addTeacher = async () => {
    if (!activeBatch) return toast.error("Save the batch first, then add teachers");
    if (!teacherForm.teacher_name.trim()) return toast.error("Teacher name required");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user?.id) return toast.error("You must be signed in");
    const { error } = await supabase.from("batch_teachers").insert({
      batch_id: activeBatch.id,
      teacher_name: teacherForm.teacher_name.trim(),
      subject: teacherForm.subject.trim(),
      email: teacherForm.email.trim(),
      owner_id: u.user.id,
    });
    if (error) return toast.error(`Could not assign teacher: ${error.message}`);
    toast.success("Teacher assigned");
    setTeacherForm({ teacher_name: "", subject: "", email: "" });
    fetchAll();
  };

  const removeTeacher = async (id: string) => {
    const { error } = await supabase.from("batch_teachers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    fetchAll();
  };

  const openAssignTeachers = (b: Batch) => {
    setTeacherBatch(b);
    setTeacherForm({ teacher_name: "", subject: "", email: "" });
  };

  const onDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("batches").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) return toast.error(error.message);
    toast.success("Batch deleted");
    fetchAll();
  };

  const teacherCount = (batchId: string) => teachers.filter((t) => t.batch_id === batchId).length;
  const currentTeachers = activeBatch ? teachers.filter((t) => t.batch_id === activeBatch.id) : [];
  const scheduleLabel = (b: Batch) =>
    b.schedule_type === "daily" ? "Daily"
    : b.schedule_type === "alternate" ? "Alternate"
    : (b.schedule_days?.length ? b.schedule_days.join(", ") : "Custom");

  if (role === null) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }
  if (role !== "admin") return <Navigate to="/student" replace />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batches</h1>
          <p className="text-muted-foreground mt-1">
            Define batches and timings. Assign students to a batch from the Students page.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Batch
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All batches</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No batches yet. Click Add Batch to create one.
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {rows.map((b) => (
                  <div key={b.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{b.name}</p>
                        {b.course_name && <p className="text-xs text-muted-foreground truncate">{b.course_name}</p>}
                      </div>
                      <Badge variant={b.status === "active" ? "default" : "secondary"}>{b.status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div><span className="text-muted-foreground">Time: </span>{b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}</div>
                      <div><span className="text-muted-foreground">Days: </span>{scheduleLabel(b)}</div>
                      <div><span className="text-muted-foreground">Students: </span>{counts[b.name] ?? 0}</div>
                      <div><span className="text-muted-foreground">Teachers: </span>{teacherCount(b.id)}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 h-10 rounded-xl" onClick={() => openEdit(b)}>
                        <Pencil className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" className="h-10 w-10 rounded-xl" onClick={() => openAssignTeachers(b)}>
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-10 w-10 rounded-xl" onClick={() => setDeleteId(b.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Teachers</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell className="text-muted-foreground">{b.course_name ?? "—"}</TableCell>
                        <TableCell>{b.start_time.slice(0, 5)}</TableCell>
                        <TableCell>{b.end_time.slice(0, 5)}</TableCell>
                        <TableCell className="text-xs">{scheduleLabel(b)}</TableCell>
                        <TableCell>
                          <Badge variant={b.status === "active" ? "default" : "secondary"}>
                            {b.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{teacherCount(b.id)}</TableCell>
                        <TableCell>{counts[b.name] ?? 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" title="Assign teachers" onClick={() => openAssignTeachers(b)}>
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Edit batch" onClick={() => openEdit(b)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Delete batch" onClick={() => setDeleteId(b.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit batch" : "Add batch"}</DialogTitle>
            <DialogDescription>
              Batch name must be unique. Times use 24-hour format.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Batch Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="course">Course Name</Label>
              <Input id="course" value={form.course_name ?? ""}
                onChange={(e) => setForm({ ...form, course_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date ?? ""}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date ?? ""}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start">Start Time</Label>
                <Input
                  id="start"
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
                {errors.start_time && (
                  <p className="text-xs text-destructive">{errors.start_time}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">End Time</Label>
                <Input
                  id="end"
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                />
                {errors.end_time && (
                  <p className="text-xs text-destructive">{errors.end_time}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Schedule Type</Label>
                <Select value={form.schedule_type}
                  onValueChange={(v) => setForm({ ...form, schedule_type: v as FormValues["schedule_type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="alternate">Alternate Days</SelectItem>
                    <SelectItem value="custom">Custom Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as FormValues["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.schedule_type === "custom" && (
              <div className="space-y-2">
                <Label>Days</Label>
                <div className="grid grid-cols-4 gap-2">
                  {DAYS.map((d) => {
                    const checked = form.schedule_days.includes(d);
                    return (
                      <label key={d} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) =>
                            setForm({
                              ...form,
                              schedule_days: c
                                ? [...form.schedule_days, d]
                                : form.schedule_days.filter((x) => x !== d),
                            })
                          }
                        />
                        <span>{d}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {editing && (
              <div className="space-y-2 border-t pt-4">
                <Label>Assigned Teachers ({currentTeachers.length})</Label>
                {currentTeachers.length > 0 && (
                  <div className="space-y-1">
                    {currentTeachers.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-sm border rounded px-2 py-1">
                        <div>
                          <span className="font-medium">{t.teacher_name}</span>
                          {t.subject && <span className="text-muted-foreground"> · {t.subject}</span>}
                          {t.email && <span className="text-muted-foreground"> · {t.email}</span>}
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeTeacher(t.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Teacher name" value={teacherForm.teacher_name}
                    onChange={(e) => setTeacherForm({ ...teacherForm, teacher_name: e.target.value })} />
                  <Input placeholder="Subject" value={teacherForm.subject}
                    onChange={(e) => setTeacherForm({ ...teacherForm, subject: e.target.value })} />
                  <Input placeholder="Email" type="email" value={teacherForm.email}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addTeacher}>
                  <Plus className="h-4 w-4 mr-1" /> Add teacher
                </Button>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editing ? "Save changes" : "Add batch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!teacherBatch} onOpenChange={(o) => !o && setTeacherBatch(null)}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign teachers{teacherBatch ? ` — ${teacherBatch.name}` : ""}</DialogTitle>
            <DialogDescription>
              Add one or more teachers for this batch. Changes save instantly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Assigned Teachers ({currentTeachers.length})</Label>
            {currentTeachers.length > 0 ? (
              <div className="space-y-1">
                {currentTeachers.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm border rounded px-2 py-1">
                    <div>
                      <span className="font-medium">{t.teacher_name}</span>
                      {t.subject && <span className="text-muted-foreground"> · {t.subject}</span>}
                      {t.email && <span className="text-muted-foreground"> · {t.email}</span>}
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTeacher(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No teachers assigned yet.</p>
            )}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t">
              <Input placeholder="Teacher name" value={teacherForm.teacher_name}
                onChange={(e) => setTeacherForm({ ...teacherForm, teacher_name: e.target.value })} />
              <Input placeholder="Subject" value={teacherForm.subject}
                onChange={(e) => setTeacherForm({ ...teacherForm, subject: e.target.value })} />
              <Input placeholder="Email" type="email" value={teacherForm.email}
                onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })} />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addTeacher}>
              <Plus className="h-4 w-4 mr-1" /> Add teacher
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setTeacherBatch(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will not delete students, but their batch reference will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}