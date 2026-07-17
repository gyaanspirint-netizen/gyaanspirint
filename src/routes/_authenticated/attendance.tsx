import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Check, X, Loader2, MessageCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/attendance")({
  component: AttendancePage,
});

type Student = {
  id: string;
  name: string;
  batch: string;
  parent_phone?: string;
};

type AttendanceRow = {
  id: string;
  student_id: string;
  date: string;
  status: "present" | "absent" | "leave";
  batch?: string;
};

type StudentStats = Student & {
  present: number;
  absent: number;
  total: number;
  percentage: number;
};

function AttendancePage() {
  const { role, loading: authLoading } = useAuth();

  if (authLoading || role === null) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (role === "teacher") {
    if (typeof window !== "undefined") window.location.replace("/teacher/attendance");
    return null;
  }
  return role === "admin" ? <AdminAttendance /> : <StudentAttendance />;
}

function AdminAttendance() {
  const [students, setStudents] = useState<Student[]>([]);
  const [batchList, setBatchList] = useState<string[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [todayMap, setTodayMap] = useState<Record<string, "present" | "absent" | "leave">>({});
  const [history, setHistory] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("id, name, batch, parent_phone")
      .order("name");
    if (error) {
      toast.error(error.message);
      return;
    }
    setStudents(data ?? []);
    const all = new Set<string>();
    let hasUnbatched = false;
    (data ?? []).forEach((s) => {
      const parts = (s.batch ?? "").split(",").map((b) => b.trim()).filter(Boolean);
      if (parts.length === 0) hasUnbatched = true;
      parts.forEach((b) => all.add(b));
    });
    const list = Array.from(all).sort();
    if (hasUnbatched) list.unshift("__none__");
    setBatchList(list);
    if (list.length && !selectedBatch) setSelectedBatch(list[0]);
  };

  const loadForDate = async (d: string, batch: string) => {
    if (!batch) { setTodayMap({}); return; }
    const dbBatch = batch === "__none__" ? "" : batch;
    const { data, error } = await supabase
      .from("attendance")
      .select("id, student_id, date, status")
      .eq("date", d)
      .eq("batch", dbBatch);
    if (error) {
      toast.error(error.message);
      return;
    }
    const map: Record<string, "present" | "absent" | "leave"> = {};
    (data ?? []).forEach((r) => {
      map[r.student_id] = r.status;
    });
    setTodayMap(map);
  };

  const loadHistory = async () => {
    const { data, error } = await supabase
      .from("attendance")
      .select("id, student_id, date, status, batch")
      .order("date", { ascending: false })
      .limit(1000);
    if (error) {
      toast.error(error.message);
      return;
    }
    setHistory(data ?? []);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadStudents();
      await loadHistory();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadForDate(date, selectedBatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, selectedBatch]);

  const mark = async (studentId: string, status: "present" | "absent" | "leave") => {
    if (!selectedBatch) { toast.error("Select a batch"); return; }
    const dbBatch = selectedBatch === "__none__" ? "" : selectedBatch;
    setSavingId(studentId);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("attendance").upsert(
      {
        student_id: studentId,
        date,
        status,
        batch: dbBatch,
        marked_by: userData.user?.id ?? null,
        owner_id: userData.user?.id ?? "",
      },
      { onConflict: "student_id,date,batch" },
    );
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTodayMap((m) => ({ ...m, [studentId]: status }));
    toast.success(`Marked ${status}`);
    loadHistory();
  };

  const studentsInBatch = useMemo(
    () => {
      if (selectedBatch === "__none__") {
        return students.filter((s) => !(s.batch ?? "").split(",").map((b) => b.trim()).filter(Boolean).length);
      }
      return students.filter((s) => (s.batch ?? "").split(",").map((b) => b.trim()).includes(selectedBatch));
    },
    [students, selectedBatch],
  );


  const stats: StudentStats[] = useMemo(() => {
    return students.map((s) => {
      const rows = history.filter((r) => r.student_id === s.id);
      const present = rows.filter((r) => r.status === "present").length;
      const absent = rows.filter((r) => r.status === "absent").length;
      const total = present + absent;
      const percentage = total === 0 ? 0 : Math.round((present / total) * 100);
      return { ...s, present, absent, total, percentage };
    });
  }, [students, history]);

  const studentName = (id: string) =>
    students.find((s) => s.id === id)?.name ?? "Unknown";

  const buildWaUrl = (phoneRaw: string, name: string, d: string) => {
    const phone = phoneRaw.replace(/\D/g, "");
    const normalized = phone.length === 10 ? `91${phone}` : phone;
    const dateLabel = format(new Date(d), "PPP");
    const msg = `Dear Parent, this is to inform you that ${name} was marked ABSENT on ${dateLabel}. Please ensure regular attendance. — Institute`;
    const text = encodeURIComponent(msg);
    // Use web.whatsapp.com on desktop, wa.me on mobile — avoids the api.whatsapp.com
    // redirect that some networks / iframes block (ERR_BLOCKED_BY_RESPONSE).
    const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isMobile
      ? `https://wa.me/${normalized}?text=${text}`
      : `https://web.whatsapp.com/send?phone=${normalized}&text=${text}`;
  };

  const notifyParent = (s: Student) => {
    if (!s.parent_phone) { toast.error("No parent phone on record"); return; }
    window.open(buildWaUrl(s.parent_phone, s.name, date), "_blank", "noopener,noreferrer");
  };

  const notifyAllAbsent = () => {
    const absentees = studentsInBatch.filter((s) => todayMap[s.id] === "absent" && s.parent_phone);
    if (absentees.length === 0) { toast.error("No absent students with a parent phone"); return; }
    absentees.forEach((s, i) => {
      setTimeout(() => {
        window.open(buildWaUrl(s.parent_phone!, s.name, date), "_blank", "noopener,noreferrer");
      }, i * 300);
    });
    toast.success(`Opening WhatsApp for ${absentees.length} parent${absentees.length === 1 ? "" : "s"}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-muted-foreground">
          Mark and review student attendance.
        </p>
      </div>

      <Tabs defaultValue="mark">
        <TabsList>
          <TabsTrigger value="mark">Mark</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="stats">Percentage</TabsTrigger>
        </TabsList>

        <TabsContent value="mark" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mark Attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-[160px]">
                  <Label>Batch</Label>
                  <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                    <SelectTrigger><SelectValue placeholder="Pick batch" /></SelectTrigger>
                    <SelectContent>
                      {batchList.map((b) => <SelectItem key={b} value={b}>{b === "__none__" ? "No batch (unassigned)" : b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={notifyAllAbsent} className="shrink-0">
                  <MessageCircle className="h-4 w-4 mr-2" /> Notify All Absent
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : batchList.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No students yet. Add students first.
                </p>
              ) : studentsInBatch.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No students in this batch.
                </p>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {studentsInBatch.map((s) => {
                      const current = todayMap[s.id];
                      return (
                        <div key={s.id} className="rounded-2xl border bg-card p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{s.name}</p>
                              <p className="text-xs text-muted-foreground">{selectedBatch === "__none__" ? "No batch" : selectedBatch}</p>
                            </div>
                            {current === "present" ? <Badge>Present</Badge>
                              : current === "absent" ? <Badge variant="destructive">Absent</Badge>
                              : current === "leave" ? <Badge variant="secondary">Leave</Badge>
                              : <Badge variant="outline">Not marked</Badge>}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              size="sm"
                              className="h-11 rounded-xl"
                              variant={current === "present" ? "default" : "outline"}
                              disabled={savingId === s.id}
                              onClick={() => mark(s.id, "present")}
                            >
                              <Check className="h-4 w-4 mr-1" /> Present
                            </Button>
                            <Button
                              size="sm"
                              className="h-11 rounded-xl"
                              variant={current === "absent" ? "destructive" : "outline"}
                              disabled={savingId === s.id}
                              onClick={() => mark(s.id, "absent")}
                            >
                              <X className="h-4 w-4 mr-1" /> Absent
                            </Button>
                            <Button
                              size="sm"
                              className="h-11 rounded-xl"
                              variant={current === "leave" ? "secondary" : "outline"}
                              disabled={savingId === s.id}
                              onClick={() => mark(s.id, "leave")}
                            >
                              Leave
                            </Button>
                          </div>
                          {current === "absent" && s.parent_phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full mt-2 h-11 rounded-xl"
                              onClick={() => notifyParent(s)}
                            >
                              <MessageCircle className="h-4 w-4 mr-1" /> Notify Parent
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Batch</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentsInBatch.map((s) => {
                          const current = todayMap[s.id];
                          return (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">
                                {s.name}
                              </TableCell>
                              <TableCell>{selectedBatch === "__none__" ? "—" : selectedBatch}</TableCell>
                              <TableCell>
                                {current === "present" ? (
                                  <Badge>Present</Badge>
                                ) : current === "absent" ? (
                                  <Badge variant="destructive">Absent</Badge>
                                ) : (
                                  <Badge variant="outline">Not marked</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button
                                  size="sm"
                                  variant={
                                    current === "present" ? "default" : "outline"
                                  }
                                  disabled={savingId === s.id}
                                  onClick={() => mark(s.id, "present")}
                                >
                                  <Check className="h-4 w-4 mr-1" /> Present
                                </Button>
                                <Button
                                  size="sm"
                                  variant={
                                    current === "absent"
                                      ? "destructive"
                                      : "outline"
                                  }
                                  disabled={savingId === s.id}
                                  onClick={() => mark(s.id, "absent")}
                                >
                                  <X className="h-4 w-4 mr-1" /> Absent
                                </Button>
                                {current === "absent" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => notifyParent(s)}
                                    title={s.parent_phone ? "Send WhatsApp to parent" : "No parent phone on record"}
                                    disabled={!s.parent_phone}
                                  >
                                    <MessageCircle className="h-4 w-4 mr-1" /> Notify
                                  </Button>
                                )}
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
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No attendance records yet.
                </p>
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
                      {history.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.date}</TableCell>
                          <TableCell>{studentName(r.student_id)}</TableCell>
                          <TableCell>{r.batch || "—"}</TableCell>
                          <TableCell>
                            {r.status === "present" ? (
                              <Badge>Present</Badge>
                            ) : (
                              <Badge variant="destructive">Absent</Badge>
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
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Percentage</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No students yet.
                </p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Present</TableHead>
                        <TableHead>Absent</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead className="text-right">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.batch}</TableCell>
                          <TableCell>{s.present}</TableCell>
                          <TableCell>{s.absent}</TableCell>
                          <TableCell>{s.total}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {s.percentage}%
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

function StudentAttendance() {
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setLoading(false);
        return;
      }
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (!student) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("attendance")
        .select("id, student_id, date, status, batch")
        .eq("student_id", student.id)
        .order("date", { ascending: false });
      if (error) toast.error(error.message);
      setRows(data ?? []);
      setLoading(false);
    })();
  }, []);

  const present = rows.filter((r) => r.status === "present").length;
  const absent = rows.filter((r) => r.status === "absent").length;
  const total = present + absent;
  const pct = total === 0 ? 0 : Math.round((present / total) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Attendance</h1>
        <p className="text-muted-foreground">Your attendance record.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Percentage</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{pct}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Present</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{present}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Absent</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{absent}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Days</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{total}</div></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No attendance records yet.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{format(new Date(r.date), "PPP")}</TableCell>
                      <TableCell>{r.batch || "—"}</TableCell>
                      <TableCell>
                        {r.status === "present" ? <Badge>Present</Badge> : <Badge variant="destructive">Absent</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}