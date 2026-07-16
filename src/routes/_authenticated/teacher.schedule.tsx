import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyAssignments } from "@/lib/teacher-portal.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/teacher/schedule")({
  head: () => ({ meta: [{ title: "Schedule — Gyanspirint" }] }),
  component: TeacherSchedule,
});

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function TeacherSchedule() {
  const fn = useServerFn(getMyAssignments);
  const [assignments, setAssignments] = useState<any[]>([]);
  useEffect(() => { fn().then((r: any) => setAssignments(r.assignments ?? [])); }, [fn]);

  const todayDay = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()];

  const forDay = (d: string) =>
    assignments.filter((a) => {
      const days: string[] = a.batches?.schedule_days ?? [];
      return days.length === 0 || days.includes(d);
    });

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Schedule</h1>
        <p className="text-sm text-muted-foreground">Today and this week.</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Today · {todayDay}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {forDay(todayDay).length === 0 ? <p className="text-sm text-muted-foreground">No classes today.</p> :
            forDay(todayDay).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium text-sm">{a.batches?.name}</div>
                  <div className="text-xs text-muted-foreground">{a.subject ?? "—"}</div>
                </div>
                <div className="text-xs font-mono">{a.batches?.start_time?.slice(0,5)} – {a.batches?.end_time?.slice(0,5)}</div>
              </div>
            ))
          }
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Weekly</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {DAYS.map((d) => (
            <div key={d}>
              <div className="text-xs font-semibold text-muted-foreground mb-1">{d}</div>
              {forDay(d).length === 0 ? <div className="text-xs text-muted-foreground">—</div> :
                <div className="flex flex-wrap gap-2">
                  {forDay(d).map((a) => (
                    <Badge key={a.id} variant="outline" className="gap-1">
                      {a.batches?.name} · {a.batches?.start_time?.slice(0,5)}
                    </Badge>
                  ))}
                </div>
              }
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
