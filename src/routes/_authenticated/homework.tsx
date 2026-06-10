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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Check, X, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/homework")({
  head: () => ({ meta: [{ title: "Homework — Institute Manager" }] }),
  component: HomeworkPage,
});

type Student = { id: string; name: string; batch: string };
type Homework = { id: string; student_id: string; note: string; assigned_date: string; done: boolean };

function HomeworkPage() {
  const { role, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [items, setItems] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"students" | "batch">("students");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [batchName, setBatchName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [hwRes, stRes, bRes] = await Promise.all([
      supabase.from("homework").select("id, student_id, note, assigned_date, done").order("assigned_date", { ascending: false }),
      role === "admin" ? supabase.from("students").select("id, name, batch").order("name") : Promise.resolve({ data: [] as Student[] }),
      role === "admin" ? supabase.from("batches").select("name").order("name") : Promise.resolve({ data: [] as { name: string }[] }),
    ]);
    setItems((hwRes.data ?? []) as Homework[]);
    setStudents((stRes.data ?? []) as Student[]);
    setBatches(((bRes.data ?? []) as { name: string }[]).map((b) => b.name));
    setLoading(false);
  };

  useEffect(() => {
    if (role) load();
  }, [role]);

  const add = async () => {
    if (!note.trim()) return toast.error("Write a homework note");
    let targets: string[] = [];
    if (mode === "students") {
      if (selectedStudents.length === 0) return toast.error("Select at least one student");
      targets = selectedStudents;
    } else {
      if (!batchName) return toast.error("Pick a batch");
      targets = students
        .filter((s) => s.batch.split(",").map((b) => b.trim()).includes(batchName))
        .map((s) => s.id);
      if (targets.length === 0) return toast.error("No students in this batch");
    }
    setSaving(true);
    const rows = targets.map((sid) => ({ student_id: sid, note: note.trim(), owner_id: user?.id ?? "" }));
    const { error } = await supabase.from("homework").insert(rows);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Homework assigned to ${targets.length} student${targets.length === 1 ? "" : "s"}`);
    setOpen(false);
    setNote("");
    setSelectedStudents([]);
    setBatchName("");
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Assign Homework</DialogTitle></DialogHeader>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "students" | "batch")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="students">Specific Students</TabsTrigger>
              <TabsTrigger value="batch">Whole Batch</TabsTrigger>
            </TabsList>
            <TabsContent value="students" className="space-y-2">
              <Label>Pick students</Label>
              <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1">
                {students.length === 0 && <p className="text-sm text-muted-foreground">No students.</p>}
                {students.map((s) => {
                  const checked = selectedStudents.includes(s.id);
                  return (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-muted rounded">
                      <Checkbox checked={checked} onCheckedChange={(c) => {
                        if (c) setSelectedStudents([...selectedStudents, s.id]);
                        else setSelectedStudents(selectedStudents.filter((x) => x !== s.id));
                      }} />
                      <span className="flex-1">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.batch}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{selectedStudents.length} selected</p>
            </TabsContent>
            <TabsContent value="batch" className="space-y-2">
              <Label>Batch</Label>
              <Select value={batchName} onValueChange={setBatchName}>
                <SelectTrigger><SelectValue placeholder="Pick a batch" /></SelectTrigger>
                <SelectContent>
                  {batches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              {batchName && (
                <p className="text-xs text-muted-foreground">
                  Will assign to {students.filter((s) => s.batch.split(",").map((x) => x.trim()).includes(batchName)).length} student(s)
                </p>
              )}
            </TabsContent>
          </Tabs>
          <div className="space-y-2">
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