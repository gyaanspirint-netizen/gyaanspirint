import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({ meta: [{ title: "Schedule — Coaching Hub" }] }),
  component: () => (
    <Card>
      <CardHeader><CardTitle>Schedule</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Scheduling coming soon.
      </CardContent>
    </Card>
  ),
});