import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createStudent, deleteStudent } from "@/lib/students.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { Pencil, Plus, Search, Trash2, Loader2, Copy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({ meta: [{ title: "Students — Institute Manager" }] }),
  component: StudentsPage,
});

type Student = {
  id: string;
  name: string;
  father_name: string;
  student_phone: string;
  parent_phone: string;
  batch: string;
  admission_date: string;
  cuid: string | null;
};

const studentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  father_name: z.string().trim().min(1, "Father's name is required").max(100),
  student_phone: z
    .string()
    .trim()
    .min(5, "Phone is too short")
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone"),
  parent_phone: z
    .string()
    .trim()
    .min(5, "Phone is too short")
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone"),
  batch: z.string().trim().min(1, "Batch is required").max(50),
  admission_date: z.string().min(1, "Admission date is required"),
});

type FormValues = z.infer<typeof studentSchema>;

const emptyForm: FormValues = {
  name: "",
  father_name: "",
  student_phone: "",
  parent_phone: "",
  batch: "",
  admission_date: new Date().toISOString().slice(0, 10),
};

function StudentsPage() {
  const { role } = useAuth();
  const createStudentFn = useServerFn(createStudent);
  const deleteStudentFn = useServerFn(deleteStudent);
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<{ name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [credentialsDialog, setCredentialsDialog] = useState<{
    cuid: string;
    phone: string;
  } | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setStudents(data ?? []);
  };

  const fetchBatches = async () => {
    const { data } = await supabase.from("batches").select("name").order("name");
    setBatches(data ?? []);
  };

  useEffect(() => {
    if (role === "admin") {
      fetchStudents();
      fetchBatches();
    }
  }, [role]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.father_name.toLowerCase().includes(q) ||
        s.student_phone.toLowerCase().includes(q) ||
        s.parent_phone.toLowerCase().includes(q) ||
        s.batch.toLowerCase().includes(q) ||
        (s.cuid ?? "").toLowerCase().includes(q),
    );
  }, [students, search]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    setForm({
      name: s.name,
      father_name: s.father_name,
      student_phone: s.student_phone,
      parent_phone: s.parent_phone,
      batch: s.batch,
      admission_date: s.admission_date,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = studentSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormValues;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("students")
        .update(parsed.data)
        .eq("id", editing.id);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Student updated");
      setDialogOpen(false);
      fetchStudents();
    } else {
      try {
        const res = await createStudentFn({ data: parsed.data });
        setSaving(false);
        toast.success(`Student added — CUID: ${res.cuid}`);
        setDialogOpen(false);
        setCredentialsDialog({ cuid: res.cuid, phone: res.password });
        fetchStudents();
      } catch (err) {
        setSaving(false);
        toast.error(err instanceof Error ? err.message : "Failed to add student");
        return;
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteStudentFn({ data: { id: deleteId } });
      setDeleteId(null);
      toast.success("Student deleted");
      fetchStudents();
    } catch (err) {
      setDeleteId(null);
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground mt-1">
            Manage all enrolled students.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Student
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle>All students</CardTitle>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, phone, batch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              {students.length === 0
                ? "No students yet. Click Add Student to begin."
                : "No students match your search."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CUID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Father</TableHead>
                    <TableHead>Student Phone</TableHead>
                    <TableHead>Parent Phone</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Admission</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        {s.cuid ? (
                          <Badge variant="secondary" className="font-mono">
                            {s.cuid}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.father_name}</TableCell>
                      <TableCell>{s.student_phone}</TableCell>
                      <TableCell>{s.parent_phone}</TableCell>
                      <TableCell>{s.batch}</TableCell>
                      <TableCell>{s.admission_date}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(s)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(s.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit student" : "Add student"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the student's information."
                : "A unique CUID will be generated. The student logs in with their phone and that CUID."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <FieldInput
              id="name"
              label="Name"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              error={errors.name}
              className="sm:col-span-2"
            />
            <FieldInput
              id="father_name"
              label="Father's Name"
              value={form.father_name}
              onChange={(v) => setForm({ ...form, father_name: v })}
              error={errors.father_name}
              className="sm:col-span-2"
            />
            <FieldInput
              id="student_phone"
              label="Student Phone"
              value={form.student_phone}
              onChange={(v) => setForm({ ...form, student_phone: v })}
              error={errors.student_phone}
            />
            <FieldInput
              id="parent_phone"
              label="Parent Phone"
              value={form.parent_phone}
              onChange={(v) => setForm({ ...form, parent_phone: v })}
              error={errors.parent_phone}
            />
            <div className="space-y-2">
              <Label htmlFor="batch">Batch</Label>
              {batches.length === 0 ? (
                <Input
                  id="batch"
                  value={form.batch}
                  onChange={(e) => setForm({ ...form, batch: e.target.value })}
                  placeholder="Create batches first"
                />
              ) : (
                <div className="rounded-md border p-3 space-y-2 max-h-48 overflow-y-auto">
                  <p className="text-xs text-muted-foreground">
                    Select one or more batches
                  </p>
                  {batches.map((b) => {
                    const selected = form.batch
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean);
                    const isOn = selected.includes(b.name);
                    return (
                      <label
                        key={b.name}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
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
              )}
              {errors.batch && <p className="text-xs text-destructive">{errors.batch}</p>}
            </div>
            <FieldInput
              id="admission_date"
              label="Admission Date"
              type="date"
              value={form.admission_date}
              onChange={(v) => setForm({ ...form, admission_date: v })}
              error={errors.admission_date}
            />
            <DialogFooter className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editing ? "Save changes" : "Add student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the student record and their login. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!credentialsDialog}
        onOpenChange={(o) => !o && setCredentialsDialog(null)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Student login credentials</DialogTitle>
            <DialogDescription>
              Share these with the student. They will use these to sign in.
            </DialogDescription>
          </DialogHeader>
          {credentialsDialog && (
            <div className="space-y-3">
              <CredentialRow label="CUID" value={credentialsDialog.cuid} />
              <CredentialRow label="Phone" value={credentialsDialog.phone} />
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredentialsDialog(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CredentialRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono font-medium">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => {
          navigator.clipboard.writeText(value);
          toast.success(`${label} copied`);
        }}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

function FieldInput({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}