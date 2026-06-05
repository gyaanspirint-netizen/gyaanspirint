import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/courses")({
  head: () => ({ meta: [{ title: "Courses — Coaching Hub" }] }),
  component: () => (
    <Card>
      <CardHeader><CardTitle>Courses</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Course management coming soon.
      </CardContent>
    </Card>
  ),
});