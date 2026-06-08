import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Check, X, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/homework")({
  head: () => ({ meta: [{ title: "Homework — Coaching Hub" }] }),
  component: HomeworkPage,
});

type Student = { id: string; name: string };
type Homework = { id: string; student_id: string; note: string; assigned_date: string; done: boolean };

function HomeworkPage() {
  const { role, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [items, setItems] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [hwRes, stRes] = await Promise.all([
      supabase.from("homework").select("id, student_id, note, assigned_date, done").order("assigned_date", { ascending: false }),
      role === "admin" ? supabase.from("students").select("id, name").order("name") : Promise.resolve({ data: [] as Student[] }),
    ]);
    setItems((hwRes.data ?? []) as Homework[]);
    setStudents((stRes.data ?? []) as Student[]);
    setLoading(false);
  };

  useEffect(() => {
    if (role) load();
  }, [role]);

  const add = async () => {
    if (!studentId || !note.trim()) return toast.error("Pick a student and write a note");
    setSaving(true);
    const { error } = await supabase.from("homework").insert({
      student_id: studentId,
      note: note.trim(),
      owner_id: user?.id ?? "",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Homework assigned");
    setOpen(false);
    setNote("");
    setStudentId("");
    load();
  };

  const toggleDone = async (h: Homework) => {
    const { error } = await supabase.from("homework").update({ done: !h.done }).eq("id", h.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("homework").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const studentName = (id: string) => students.find((s) => s.id === id)?.name ?? "—";

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...</div>;

  const isAdmin = role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Homework</h1>
          <p className="text-muted-foreground">{isAdmin ? "Assign and track homework per student." : "Your homework notes."}</p>
        </div>
        {isAdmin && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Assign Homework</Button>}
      </div>

      <Card>
        <CardHeader><CardTitle>All homework</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No homework yet.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    {isAdmin && <TableHead>Student</TableHead>}
                    <TableHead>Note</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>{h.assigned_date}</TableCell>
                      {isAdmin && <TableCell>{studentName(h.student_id)}</TableCell>}
                      <TableCell className="max-w-md whitespace-pre-wrap">{h.note}</TableCell>
                      <TableCell>
                        {h.done ? <Badge>Done</Badge> : <Badge variant="secondary">Pending</Badge>}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {isAdmin && (
                          <>
                            <Button size="icon" variant="outline" onClick={() => toggleDone(h)} title={h.done ? "Mark pending" : "Mark done"}>
                              {h.done ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button size="icon" variant="outline" onClick={() => remove(h.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Homework</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger><SelectValue placeholder="Pick a student" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write the homework instructions..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={add} disabled={saving}>{saving ? "Saving..." : "Assign"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}