import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Clock, XCircle, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/pending-approval")({
  ssr: false,
  head: () => ({ meta: [{ title: "Account Status — Gyanspirint" }] }),
  component: PendingPage,
});

function PendingPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [instName, setInstName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return navigate({ to: "/auth", replace: true });
      const { data } = await supabase
        .from("institutes")
        .select("status,rejection_reason,name")
        .eq("owner_id", u.user.id)
        .maybeSingle();
      if (!data) {
        // No institute row → must be a pre-existing admin; let them in.
        return navigate({ to: "/dashboard", replace: true });
      }
      if (data.status === "active") return navigate({ to: "/dashboard", replace: true });
      setStatus(data.status);
      setReason(data.rejection_reason);
      setInstName(data.name);
    })();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const meta = (() => {
    switch (status) {
      case "pending":
        return {
          icon: <Clock className="h-12 w-12 text-primary" />,
          title: "Pending Approval",
          desc: "Your institute registration is currently under review. You will receive an email once your account is approved.",
        };
      case "rejected":
        return {
          icon: <XCircle className="h-12 w-12 text-destructive" />,
          title: "Registration Rejected",
          desc: reason ?? "Your institute registration has been rejected. Please contact support for more information.",
        };
      case "suspended":
        return {
          icon: <AlertTriangle className="h-12 w-12 text-yellow-500" />,
          title: "Account Suspended",
          desc: "Your institute account has been suspended. Please contact support for assistance.",
        };
      default:
        return { icon: <Clock className="h-12 w-12" />, title: "Loading...", desc: "" };
    }
  })();

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
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">{meta.icon}</div>
            <CardTitle>Account Status: {meta.title}</CardTitle>
            {instName && <CardDescription>{instName}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">{meta.desc}</p>
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
