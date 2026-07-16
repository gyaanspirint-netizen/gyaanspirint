import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyStudents } from "@/lib/teacher-portal.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher/students")({
  head: () => ({ meta: [{ title: "My Students — Gyanspirint" }] }),
  component: TeacherStudents,
});

function TeacherStudents() {
  const fn = useServerFn(getMyStudents);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => { fn().then((d) => setRows(d as any[])); }, [fn]);
  const filtered = rows.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.batch.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">My Students</h1>
          <p className="text-sm text-muted-foreground">Students in your assigned batches.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-8" />
        </div>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{filtered.length} students</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No students found.</p> :
            filtered.map((s) => (
              <div key={s.id} className="rounded-xl border p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.father_name} · {s.parent_phone}</div>
                </div>
                <Badge variant="outline">{s.batch}</Badge>
              </div>
            ))
          }
          <p className="text-xs text-muted-foreground pt-3">Fee status is view-only and available in the admin fees module.</p>
        </CardContent>
      </Card>
    </div>
  );
}
