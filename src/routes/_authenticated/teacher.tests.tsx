import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher/tests")({
  head: () => ({ meta: [{ title: "Tests — Teacher" }] }),
  component: () => (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Tests</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Create tests, upload marks, and view results for your assigned batches.</p>
          <Button asChild><Link to="/tests" className="gap-2">Open Tests <ArrowRight className="h-4 w-4" /></Link></Button>
        </CardContent>
      </Card>
    </div>
  ),
});
