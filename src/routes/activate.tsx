import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { activateWithCode } from "@/lib/institutes.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { GraduationCap, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/activate")({
  ssr: false,
  head: () => ({ meta: [{ title: "Activate Account — Gyanspirint" }] }),
  component: ActivatePage,
});

function ActivatePage() {
  const navigate = useNavigate();
  const activate = useServerFn(activateWithCode);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords do not match");
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return toast.error("Password must be 8+ chars with an uppercase letter and a number.");
    }
    setLoading(true);
    try {
      const res = await activate({ data: { email, code, password } });
      const { error } = await supabase.auth.signInWithPassword({ email: res.email, password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate({ to: "/dashboard", replace: true }), 1200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground shadow-md"
            style={{ background: "var(--gradient-brand)" }}
          >
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Gyanspirint</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Activate Your Institute</CardTitle>
            <CardDescription>
              Enter the activation code shared by the platform admin and set your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="text-center space-y-3 py-4">
                <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
                <p className="font-medium">Account activated</p>
                <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Institute Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Activation Code</Label>
                  <Input
                    id="code"
                    placeholder="ACT-XXXXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw">New Password</Label>
                  <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <p className="text-xs text-muted-foreground">
                    Min 8 characters, one uppercase letter and one number.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw2">Confirm Password</Label>
                  <Input id="pw2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Activating..." : "Activate & Sign In"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Already activated?{" "}
                  <Link to="/auth" className="text-primary hover:underline">Sign in</Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
