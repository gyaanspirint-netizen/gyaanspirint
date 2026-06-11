import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarDays, Clock, Users, BookOpen, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-batches")({
  head: () => ({ meta: [{ title: "My Batches — Institute Manager" }] }),
  component: MyBatchesPage,
});

type Batch = {
  id: string;
  name: string;
  course_name: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string;
  end_time: string;
  schedule_type: string;
  schedule_days: string[];
  status: string;
};
type Teacher = { id: string; batch_id: string; teacher_name: string; subject: string; email: string };

function MyBatchesPage() {
  const { role, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    if (role !== "student" || !user) return;
    (async () => {
      setLoading(true);
      const { data: s } = await supabase
        .from("students")
        .select("batch")
        .eq("user_id", user.id)
        .maybeSingle();
      const names = (s?.batch ?? "").split(",").map((x: string) => x.trim()).filter(Boolean);
      if (names.length === 0) { setBatches([]); setTeachers([]); setLoading(false); return; }
      const { data: bs } = await supabase
        .from("batches")
        .select("id, name, course_name, start_date, end_date, start_time, end_time, schedule_type, schedule_days, status")
        .in("name", names);
      const myBatches = (bs ?? []) as Batch[];
      setBatches(myBatches);
      if (myBatches.length > 0) {
        const { data: ts } = await supabase
          .from("batch_teachers")
          .select("*")
          .in("batch_id", myBatches.map((b) => b.id));
        setTeachers((ts ?? []) as Teacher[]);
      }
      setLoading(false);
    })();
  }, [role, user]);

  if (role === null) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }
  if (role !== "student") return <Navigate to="/admin" replace />;

  const scheduleLabel = (b: Batch) =>
    b.schedule_type === "daily" ? "Daily"
    : b.schedule_type === "alternate" ? "Alternate Days"
    : (b.schedule_days?.length ? b.schedule_days.join(", ") : "Custom");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Batches</h1>
        <p className="text-muted-foreground mt-1">
          Batches you've been enrolled in by your admin, with full details and teachers.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
        </div>
      ) : batches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            You haven't been enrolled in any batch yet. Please contact your admin.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {batches.map((b) => {
            const bTeachers = teachers.filter((t) => t.batch_id === b.id);
            return (
              <Card key={b.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-xl">{b.name}</CardTitle>
                      {b.course_name && (
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" /> {b.course_name}
                        </p>
                      )}
                    </div>
                    <Badge variant={b.status === "active" ? "default" : "secondary"}>{b.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Timing</p>
                        <p className="font-medium">{b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Schedule</p>
                        <p className="font-medium">{scheduleLabel(b)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Start Date</p>
                      <p className="font-medium">{b.start_date ? format(new Date(b.start_date), "PP") : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">End Date</p>
                      <p className="font-medium">{b.end_date ? format(new Date(b.end_date), "PP") : "—"}</p>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> Teachers ({bTeachers.length})
                    </p>
                    {bTeachers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No teachers assigned yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {bTeachers.map((t) => (
                          <li key={t.id} className="rounded-md border px-3 py-2">
                            <p className="font-medium">{t.teacher_name}</p>
                            {t.subject && (
                              <p className="text-xs text-muted-foreground">Subject: {t.subject}</p>
                            )}
                            {t.email && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {t.email}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
