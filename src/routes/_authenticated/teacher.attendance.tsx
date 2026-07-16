import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

// Teacher's attendance/tests/class-updates pages reuse the existing admin
// modules — RLS now grants teachers access limited to their assigned batches.
// These stubs provide clear entry points.

export const attendanceRoute = createFileRoute("/_authenticated/teacher/attendance")({
  head: () => ({ meta: [{ title: "Attendance — Teacher" }] }),
  component: () => <Redirect href="/attendance" title="Attendance" description="Mark and edit attendance for your assigned batches." />,
});
export const Route = attendanceRoute;

function Redirect({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{description}</p>
          <Button asChild><Link to={href} className="gap-2">Open {title.toLowerCase()} <ArrowRight className="h-4 w-4" /></Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
