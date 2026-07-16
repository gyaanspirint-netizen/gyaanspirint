import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listActivity } from "@/lib/teachers.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({ meta: [{ title: "Activity Log — Gyanspirint" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  const fn = useServerFn(listActivity);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fn().then((rows) => { setItems(rows as any[]); setLoading(false); }); }, [fn]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Activity Log</h1>
        <p className="text-sm text-muted-foreground">Recent teacher and admin activity in your institute.</p>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Latest 200 events</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
            items.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet</p> :
            items.map((it) => (
              <div key={it.id} className="flex items-start justify-between border-b last:border-0 py-2 gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{it.action}</div>
                  <div className="text-xs text-muted-foreground">
                    {it.actor_name ?? "—"} · <Badge variant="outline" className="ml-0.5">{it.actor_role ?? "—"}</Badge>{it.entity_type ? ` · ${it.entity_type}` : ""}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">{new Date(it.created_at).toLocaleString()}</div>
              </div>
            ))
          }
        </CardContent>
      </Card>
    </div>
  );
}
