import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({ meta: [{ title: "Students — Coaching Hub" }] }),
  component: () => (
    <Card>
      <CardHeader><CardTitle>Students</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Student management coming soon.
      </CardContent>
    </Card>
  ),
});