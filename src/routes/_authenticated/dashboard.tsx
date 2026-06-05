import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRedirect,
});

function DashboardRedirect() {
  const { role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (role === "admin") navigate({ to: "/admin", replace: true });
    else if (role === "student") navigate({ to: "/student", replace: true });
  }, [role, navigate]);

  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      Loading your dashboard...
    </div>
  );
}