import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teacher/updates")({
  head: () => ({ meta: [{ title: "Class Updates — Teacher" }] }),
  component: () => (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader><CardTitle>Class Updates</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Publish today's topic, homework, notice, and attachments for your batches.</p>
          <Button asChild><Link to="/homework" className="gap-2">Open Class Updates <ArrowRight className="h-4 w-4" /></Link></Button>
        </CardContent>
      </Card>
    </div>
  ),
});
