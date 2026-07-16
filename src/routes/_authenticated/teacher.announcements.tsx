import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createAnnouncement, listMyAnnouncements, getMyAssignments } from "@/lib/teacher-portal.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/teacher/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Gyanspirint" }] }),
  component: TeacherAnnouncements,
});

function TeacherAnnouncements() {
  const createFn = useServerFn(createAnnouncement);
  const listFn = useServerFn(listMyAnnouncements);
  const assignFn = useServerFn(getMyAssignments);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const refresh = async () => setRows((await listFn()) as any[]);
  useEffect(() => {
    refresh();
    assignFn().then((r: any) => setBatches((r.assignments ?? []).map((a: any) => ({ id: a.batch_id, name: a.batches?.name ?? a.batch_id }))));
  }, []);

  const toggle = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createFn({
        data: {
          title: title.trim(),
          body: body.trim(),
          audience_type: selected.length ? "batch" : "all",
          audience_ids: selected,
          audience_labels: batches.filter((b) => selected.includes(b.id)).map((b) => b.name),
        },
      });
      toast.success("Announcement published");
      setTitle(""); setBody(""); setSelected([]);
      refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Announcements</h1>
        <p className="text-sm text-muted-foreground">Publish quick notices to your batches.</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">New announcement</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bring calculator tomorrow" required /></div>
            <div className="space-y-2"><Label>Message</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} /></div>
            <div className="space-y-2">
              <Label>Send to</Label>
              <div className="flex flex-wrap gap-2">
                {batches.length === 0 && <p className="text-xs text-muted-foreground">No batches assigned yet.</p>}
                {batches.map((b) => (
                  <button key={b.id} type="button" onClick={() => toggle(b.id)}
                    className={`px-3 py-1.5 rounded-full text-xs border ${selected.includes(b.id) ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}>
                    {b.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Leave empty to send to all your assigned students.</p>
            </div>
            <Button type="submit" disabled={saving}>{saving ? "Publishing…" : "Publish announcement"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Recent</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Nothing yet.</p> :
            rows.map((r) => (
              <div key={r.id} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                {r.body && <div className="text-sm text-muted-foreground mt-1">{r.body}</div>}
                {r.audience_labels?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.audience_labels.map((l: string) => <Badge key={l} variant="outline">{l}</Badge>)}
                  </div>
                )}
              </div>
            ))
          }
        </CardContent>
      </Card>
    </div>
  );
}
