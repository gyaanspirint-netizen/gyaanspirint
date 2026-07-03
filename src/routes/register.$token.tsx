import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitRegistration } from "@/lib/registration.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/register/$token")({
  head: () => ({ meta: [{ title: "Student Registration" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const { token } = Route.useParams();
  const submit = useServerFn(submitRegistration);
  const [form, setForm] = useState({
    student_name: "",
    parent_name: "",
    parent_phone: "",
    student_phone: "",
    batch: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{
    requiresApproval: boolean;
    institute?: string;
    cuid?: string;
    password?: string;
  } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await submit({ data: { token, ...form } });
      setDone(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to register");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Registration Received</h2>
            {done.requiresApproval ? (
              <p className="text-muted-foreground">
                Thank you! Your registration has been submitted to{" "}
                <span className="font-medium text-foreground">
                  {done.institute}
                </span>
                . You'll be notified once approved.
              </p>
            ) : (
              <>
                <p className="text-muted-foreground">
                  You've been enrolled at{" "}
                  <span className="font-medium text-foreground">
                    {done.institute}
                  </span>
                  . Save these credentials to sign in:
                </p>
                <div className="rounded-lg border bg-muted/50 p-4 text-left space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Student ID</p>
                    <p className="font-mono font-semibold">{done.cuid}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Password</p>
                    <p className="font-mono font-semibold">{done.password}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Student Registration</CardTitle>
          <p className="text-sm text-muted-foreground">
            Fill in your details to enroll
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Student Name *</Label>
              <Input
                required
                value={form.student_name}
                onChange={(e) =>
                  setForm({ ...form, student_name: e.target.value })
                }
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Parent Name *</Label>
                <Input
                  required
                  value={form.parent_name}
                  onChange={(e) =>
                    setForm({ ...form, parent_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Parent Phone *</Label>
                <Input
                  required
                  value={form.parent_phone}
                  onChange={(e) =>
                    setForm({ ...form, parent_phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Student Phone</Label>
                <Input
                  value={form.student_phone}
                  onChange={(e) =>
                    setForm({ ...form, student_phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Class / Batch</Label>
                <Input
                  value={form.batch}
                  onChange={(e) => setForm({ ...form, batch: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Registration"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
