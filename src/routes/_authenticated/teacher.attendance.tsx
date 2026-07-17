import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/teacher/attendance")({
  head: () => ({ meta: [{ title: "Attendance — Teacher" }] }),
  component: TeacherAttendance,
});

type AttStatus = "present" | "absent" | "leave";
type Student = { id: string; name: string; batch: string };
type HistoryRow = { id: string; student_id: string; date: string; status: AttStatus; batch: string };

function TeacherAttendance() {
  const [teacher, setTeacher] = useState<{ id: string; owner_id: string } | null>(null);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [students, setStudents] = useState<Student[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, AttStatus>>({});
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const { data: t } = await supabase.from("teachers").select("id, owner_id").eq("user_id", u.user.id).maybeSingle();
      if (!t) { setLoading(false); return; }
      setTeacher(t);
      const { data: assigns } = await supabase
        .from("teacher_assignments")
        .select("batch_id, batches(id, name)")
        .eq("teacher_id", t.id);
      const bs = (assigns ?? [])
        .map((a: any) => a.batches)
        .filter(Boolean) as { id: string; name: string }[];
      // dedupe
      const uniq = Array.from(new Map(bs.map((b) => [b.id, b])).values());
      setBatches(uniq);
      if (uniq.length && !selectedBatch) setSelectedBatch(uniq[0].name);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedBatch) return;
    (async () => {
      const { data } = await supabase
        .from("students")
        .select("id, name, batch")
        .order("name");
      const filtered = (data ?? []).filter((s) =>
        (s.batch ?? "").split(",").map((b: string) => b.trim()).includes(selectedBatch),
      );
      setStudents(filtered);
    })();
  }, [selectedBatch]);

  useEffect(() => {
    if (!selectedBatch) { setStatusMap({}); return; }
    (async () => {
      const { data } = await supabase
        .from("attendance")
        .select("student_id, status")
        .eq("date", date)
        .eq("batch", selectedBatch);
      const m: Record<string, AttStatus> = {};
      (data ?? []).forEach((r: any) => { m[r.student_id] = r.status; });
      setStatusMap(m);
    })();
  }, [date, selectedBatch]);

  const loadHistory = async () => {
    if (!teacher) return;
    const { data } = await supabase
      .from("attendance")
      .select("id, student_id, date, status, batch")
      .order("date", { ascending: false })
      .limit(500);
    setHistory((data ?? []) as HistoryRow[]);
  };
  useEffect(() => { loadHistory(); /* eslint-disable-next-line */ }, [teacher]);

  const mark = async (studentId: string, status: AttStatus) => {
    if (!teacher || !selectedBatch) return;
    setSavingId(studentId);
    const { error } = await supabase.from("attendance").upsert(
      {
        student_id: studentId,
        date,
        status,
        batch: selectedBatch,
        marked_by: (await supabase.auth.getUser()).data.user?.id ?? null,
        owner_id: teacher.owner_id,
      },
      { onConflict: "student_id,date,batch" },
    );
    setSavingId(null);
    if (error) return toast.error(error.message);
    setStatusMap((m) => ({ ...m, [studentId]: status }));
    toast.success(`Marked ${status}`);
    loadHistory();
  };

  const studentName = (id: string) => students.find((s) => s.id === id)?.name ?? "Student";

  const filteredHistory = useMemo(
    () => history.filter((h) => !selectedBatch || h.batch === selectedBatch),
    [history, selectedBatch],
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  if (batches.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader><CardTitle>Attendance</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">No batches are assigned to you yet. Ask your institute admin to assign a batch.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Student Attendance</h1>
        <p className="text-muted-foreground">Mark attendance for your assigned batches.</p>
      </div>

      <Tabs defaultValue="mark">
        <TabsList>
          <TabsTrigger value="mark">Mark</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="mark" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Today</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[160px]">
                  <Label>Batch</Label>
                  <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {batches.map((b) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[160px]">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>

              {students.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No students in this batch.</p>
              ) : (
                <div className="space-y-2">
                  {students.map((s) => {
                    const cur = statusMap[s.id];
                    return (
                      <div key={s.id} className="rounded-xl border p-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {cur === "present" ? <Badge>Present</Badge>
                              : cur === "absent" ? <Badge variant="destructive">Absent</Badge>
                              : cur === "leave" ? <Badge variant="secondary">Leave</Badge>
                              : <Badge variant="outline">Not marked</Badge>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" disabled={savingId === s.id}
                            variant={cur === "present" ? "default" : "outline"}
                            onClick={() => mark(s.id, "present")}>
                            <Check className="h-4 w-4 mr-1" /> Present
                          </Button>
                          <Button size="sm" disabled={savingId === s.id}
                            variant={cur === "absent" ? "destructive" : "outline"}
                            onClick={() => mark(s.id, "absent")}>
                            <X className="h-4 w-4 mr-1" /> Absent
                          </Button>
                          <Button size="sm" disabled={savingId === s.id}
                            variant={cur === "leave" ? "secondary" : "outline"}
                            onClick={() => mark(s.id, "leave")}>
                            <Clock className="h-4 w-4 mr-1" /> Leave
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>History — {selectedBatch}</CardTitle></CardHeader>
            <CardContent>
              {filteredHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No records yet.</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.date}</TableCell>
                          <TableCell>{studentName(r.student_id)}</TableCell>
                          <TableCell>{r.batch}</TableCell>
                          <TableCell>
                            {r.status === "present" ? <Badge>Present</Badge>
                              : r.status === "absent" ? <Badge variant="destructive">Absent</Badge>
                              : <Badge variant="secondary">Leave</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
