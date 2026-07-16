import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyStudents, addRemark } from "@/lib/teacher-portal.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/teacher/remarks")({
  head: () => ({ meta: [{ title: "Remarks — Gyanspirint" }] }),
  component: TeacherRemarks,
});

const TAGS = ["Excellent", "Needs Improvement", "Very Active", "Homework Incomplete", "Behaviour Good"];

function TeacherRemarks() {
  const listFn = useServerFn(getMyStudents);
  const addFn = useServerFn(addRemark);
  const [students, setStudents] = useState<any[]>([]);
  const [studentId, setStudentId] = useState("");
  const [tag, setTag] = useState<string>("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { listFn().then((d) => setStudents(d as any[])); }, [listFn]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !text.trim()) return;
    setSaving(true);
    try {
      await addFn({ data: { student_id: studentId, remark: text.trim(), tag: tag || null } });
      toast.success("Remark added");
      setText(""); setTag("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Teacher Remarks</h1>
        <p className="text-sm text-muted-foreground">Remarks appear in the student's dashboard.</p>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Add remark</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-2">
              <Label>Student</Label>
              <select
                className="w-full border rounded-md h-10 px-2 bg-background"
                value={studentId} onChange={(e) => setStudentId(e.target.value)} required
              >
                <option value="">Select…</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.batch}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Quick tag</Label>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTag(t === tag ? "" : t)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition ${t === tag ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remark</Label>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} required />
            </div>
            <Button type="submit" disabled={saving} className="w-full md:w-auto">{saving ? "Saving…" : "Add remark"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
