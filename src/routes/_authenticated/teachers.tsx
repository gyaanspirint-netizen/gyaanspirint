import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  listTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  setTeacherStatus,
  resetTeacherPassword,
  listAssignments,
  assignTeacher,
  unassignTeacher,
} from "@/lib/teachers.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Copy, Plus, Trash2, KeyRound, Power, PowerOff, UserCog, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teachers")({
  head: () => ({ meta: [{ title: "Teachers — Gyanspirint" }] }),
  component: TeachersPage,
});

type Teacher = {
  id: string;
  teacher_code: string;
  full_name: string;
  mobile: string;
  email: string | null;
  subject: string | null;
  qualification: string | null;
  experience: string | null;
  status: string;
  temp_password: string | null;
};

function TeachersPage() {
  const listFn = useServerFn(listTeachers);
  const createFn = useServerFn(createTeacher);
  const updateFn = useServerFn(updateTeacher);
  const deleteFn = useServerFn(deleteTeacher);
  const statusFn = useServerFn(setTeacherStatus);
  const resetFn = useServerFn(resetTeacherPassword);
  const listAssignFn = useServerFn(listAssignments);
  const assignFn = useServerFn(assignTeacher);
  const unassignFn = useServerFn(unassignTeacher);

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [creds, setCreds] = useState<{ teacher_code: string; tempPassword: string; name: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [assignFor, setAssignFor] = useState<Teacher | null>(null);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [subject, setSubject] = useState("");

  // create form
  const [fName, setFName] = useState("");
  const [fMobile, setFMobile] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fSubject, setFSubject] = useState("");
  const [fQualification, setFQualification] = useState("");
  const [fExperience, setFExperience] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await listFn();
      setTeachers(list as Teacher[]);
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    supabase.from("batches").select("id, name").order("name").then(({ data }) => setBatches(data ?? []));
  }, []);

  const refreshAssignments = async (teacherId: string) => {
    const rows = await listAssignFn({ data: { teacherId } });
    setAssignments(rows as any[]);
  };

  useEffect(() => {
    if (assignFor) refreshAssignments(assignFor.id);
  }, [assignFor]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createFn({
        data: {
          full_name: fName,
          mobile: fMobile,
          email: fEmail,
          subject: fSubject,
          qualification: fQualification,
          experience: fExperience,
        },
      });
      setOpenAdd(false);
      setCreds({ teacher_code: res.teacher.teacher_code, tempPassword: res.tempPassword, name: res.teacher.full_name });
      setFName(""); setFMobile(""); setFEmail(""); setFSubject(""); setFQualification(""); setFExperience("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleReset = async (id: string) => {
    try {
      const res = await resetFn({ data: { id } });
      setCreds({ teacher_code: res.teacher_code, tempPassword: res.tempPassword, name: teachers.find((t) => t.id === id)?.full_name ?? "" });
      refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const toggleStatus = async (t: Teacher) => {
    const next = t.status === "active" ? "inactive" : "active";
    try {
      await statusFn({ data: { id: t.id, status: next as any } });
      refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const copyCreds = () => {
    if (!creds) return;
    const text = `Gyanspirint Teacher Login\nName: ${creds.name}\nTeacher ID: ${creds.teacher_code}\nTemporary Password: ${creds.tempPassword}\nActivate at: ${window.location.origin}/auth`;
    navigator.clipboard.writeText(text);
    toast.success("Credentials copied");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Teachers</h1>
          <p className="text-sm text-muted-foreground">Add teachers, assign batches, and manage credentials.</p>
        </div>
        <Button onClick={() => setOpenAdd(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Teacher</Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All teachers</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Teacher ID</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : teachers.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No teachers yet</TableCell></TableRow>
                ) : teachers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.full_name}</TableCell>
                    <TableCell className="font-mono text-xs">{t.teacher_code}</TableCell>
                    <TableCell>{t.mobile}</TableCell>
                    <TableCell>{t.subject ?? "—"}</TableCell>
                    <TableCell><Badge variant={t.status === "active" ? "default" : t.status === "pending" ? "secondary" : "outline"}>{t.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setAssignFor(t)} title="Assign"><ClipboardList className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleReset(t.id)} title="Reset password"><KeyRound className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleStatus(t)} title={t.status === "active" ? "Deactivate" : "Activate"}>
                          {t.status === "active" ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteId(t.id)} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3 p-3">
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading…</p>
            ) : teachers.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No teachers yet</p>
            ) : teachers.map((t) => (
              <div key={t.id} className="rounded-2xl border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{t.full_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{t.teacher_code}</div>
                  </div>
                  <Badge variant={t.status === "active" ? "default" : t.status === "pending" ? "secondary" : "outline"}>{t.status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">{t.mobile} · {t.subject ?? "—"}</div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setAssignFor(t)} className="gap-1"><ClipboardList className="h-4 w-4" /> Assign</Button>
                  <Button size="sm" variant="outline" onClick={() => handleReset(t.id)} className="gap-1"><KeyRound className="h-4 w-4" /> Reset</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(t)} className="gap-1">
                    {t.status === "active" ? <><PowerOff className="h-4 w-4" /> Deactivate</> : <><Power className="h-4 w-4" /> Activate</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleteId(t.id)} className="gap-1 text-destructive"><Trash2 className="h-4 w-4" /> Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add teacher */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Teacher</DialogTitle>
            <DialogDescription>A Teacher ID and temporary password will be generated automatically.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-2"><Label>Full Name</Label><Input value={fName} onChange={(e) => setFName(e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2"><Label>Mobile</Label><Input type="tel" value={fMobile} onChange={(e) => setFMobile(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Subject</Label><Input value={fSubject} onChange={(e) => setFSubject(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2"><Label>Qualification</Label><Input value={fQualification} onChange={(e) => setFQualification(e.target.value)} /></div>
              <div className="space-y-2"><Label>Experience</Label><Input value={fExperience} onChange={(e) => setFExperience(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenAdd(false)}>Cancel</Button>
              <Button type="submit">Create Teacher</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Credentials */}
      <Dialog open={!!creds} onOpenChange={(o) => !o && setCreds(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teacher credentials</DialogTitle>
            <DialogDescription>Share these once. The teacher will change the password on first login.</DialogDescription>
          </DialogHeader>
          {creds && (
            <div className="space-y-2 rounded-lg border p-4 bg-muted/30 font-mono text-sm">
              <div><span className="text-muted-foreground">Name:</span> {creds.name}</div>
              <div><span className="text-muted-foreground">Teacher ID:</span> {creds.teacher_code}</div>
              <div><span className="text-muted-foreground">Temp Password:</span> {creds.tempPassword}</div>
              <div className="text-xs text-muted-foreground pt-2">Activate at: {typeof window !== "undefined" ? window.location.origin : ""}/auth</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreds(null)}>Close</Button>
            <Button onClick={copyCreds} className="gap-2"><Copy className="h-4 w-4" /> Copy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignments */}
      <Dialog open={!!assignFor} onOpenChange={(o) => !o && setAssignFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assignments · {assignFor?.full_name}</DialogTitle>
            <DialogDescription>Assign batches and subjects.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                className="border rounded-md h-10 px-2 bg-background sm:col-span-2"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                <option value="">Select batch…</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <Button
              className="w-full"
              disabled={!selectedBatch}
              onClick={async () => {
                if (!assignFor || !selectedBatch) return;
                try {
                  await assignFn({ data: { teacher_id: assignFor.id, batch_id: selectedBatch, subject: subject || null } });
                  setSelectedBatch(""); setSubject("");
                  refreshAssignments(assignFor.id);
                } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
              }}
            >
              Add assignment
            </Button>
            <div className="border-t pt-3 space-y-2">
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No assignments yet</p>
              ) : assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{a.batches?.name ?? a.batch_id}</div>
                    <div className="text-xs text-muted-foreground">{a.subject ?? "—"}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    await unassignFn({ data: { id: a.id } });
                    if (assignFor) refreshAssignments(assignFor.id);
                  }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete teacher?</AlertDialogTitle>
            <AlertDialogDescription>This removes the teacher and their login. Assignments will be removed too.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteId) return;
                try { await deleteFn({ data: { id: deleteId } }); setDeleteId(null); refresh(); }
                catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
              }}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
