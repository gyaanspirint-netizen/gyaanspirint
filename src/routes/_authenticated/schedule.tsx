import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({ meta: [{ title: "Schedule — Coaching Hub" }] }),
  component: SchedulePage,
});

type Batch = { id: string; name: string };
type Entry = {
  id: string;
  batch_id: string | null;
  title: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
};

function SchedulePage() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const [batches, setBatches] = useState<Batch[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [studentBatches, setStudentBatches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [form, setForm] = useState({ batch_id: "ALL", title: "", schedule_date: "", start_time: "", end_time: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [bRes, eRes] = await Promise.all([
      supabase.from("batches").select("id, name").order("name"),
      supabase.from("schedule").select("id, batch_id, title, schedule_date, start_time, end_time, notes").order("schedule_date").order("start_time"),
    ]);
    setBatches(bRes.data ?? []);
    setEntries((eRes.data ?? []) as Entry[]);
    if (role === "student") {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: s } = await supabase.from("students").select("batch").eq("user_id", u.user.id).maybeSingle();
        if (s) setStudentBatches(s.batch.split(",").map((b: string) => b.trim()).filter(Boolean));
      }
    }
    setLoading(false);
  };

  useEffect(() => { if (role) load(); }, [role]);

  const visibleEntries = useMemo(() => {
    if (isAdmin) return entries;
    const batchIds = new Set(batches.filter((b) => studentBatches.includes(b.name)).map((b) => b.id));
    return entries.filter((e) => e.batch_id === null || batchIds.has(e.batch_id));
  }, [entries, batches, studentBatches, isAdmin]);

  const openAdd = () => {
    setEditing(null);
    setForm({ batch_id: "ALL", title: "", schedule_date: "", start_time: "", end_time: "", notes: "" });
    setOpen(true);
  };
  const openEdit = (e: Entry) => {
    setEditing(e);
    setForm({
      batch_id: e.batch_id ?? "ALL", title: e.title, schedule_date: e.schedule_date,
      start_time: e.start_time.slice(0,5), end_time: e.end_time.slice(0,5), notes: e.notes ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim() || !form.schedule_date || !form.start_time || !form.end_time) {
      return toast.error("Fill all required fields");
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      batch_id: form.batch_id === "ALL" ? null : form.batch_id,
      schedule_date: form.schedule_date,
      start_time: form.start_time,
      end_time: form.end_time,
      notes: form.notes.trim() || null,
      owner_id: user?.id ?? "",
    };
    const { error } = editing
      ? await supabase.from("schedule").update(payload).eq("id", editing.id)
      : await supabase.from("schedule").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Schedule updated" : "Schedule added");
    setOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("schedule").delete().eq("id", deleteId);
    if (error) return toast.error(error.message);
    setDeleteId(null);
    toast.success("Schedule deleted");
    load();
  };

  const batchName = (id: string | null) => id ? batches.find((b) => b.id === id)?.name ?? "—" : "All Batches";

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">{isAdmin ? "Create class schedules per batch." : "Your upcoming class schedule."}</p>
        </div>
        {isAdmin && <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Schedule</Button>}
      </div>

      <Card>
        <CardHeader><CardTitle>All entries</CardTitle></CardHeader>
        <CardContent>
          {visibleEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No schedule entries yet.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Notes</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleEntries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{format(new Date(e.schedule_date), "PP")}</TableCell>
                      <TableCell>{e.start_time.slice(0,5)} – {e.end_time.slice(0,5)}</TableCell>
                      <TableCell><Badge variant="secondary">{batchName(e.batch_id)}</Badge></TableCell>
                      <TableCell className="font-medium">{e.title}</TableCell>
                      <TableCell className="text-muted-foreground">{e.notes ?? "—"}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right space-x-2">
                          <Button size="icon" variant="outline" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setDeleteId(e.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      )}
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
          <DialogHeader><DialogTitle>{editing ? "Edit Schedule" : "Add Schedule"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Batch</Label>
              <Select value={form.batch_id} onValueChange={(v) => setForm({ ...form, batch_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Batches</SelectItem>
                  {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Physics — Optics" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.schedule_date} onChange={(e) => setForm({ ...form, schedule_date: e.target.value })} />
              </div>
              <div>
                <Label>Start</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div>
                <Label>End</Label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete schedule entry?</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={remove}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}