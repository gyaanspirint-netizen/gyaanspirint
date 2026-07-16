import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/teacher")({
  component: TeacherLayout,
});

function TeacherLayout() {
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setChecked(true); return; }
      const { data: t } = await supabase.from("teachers").select("id, status").eq("user_id", u.user.id).maybeSingle();
      setAllowed(!!t && t.status === "active");
      setChecked(true);
    })();
  }, []);

  if (!checked) return null;
  if (!allowed) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-3">
        <h1 className="text-xl font-semibold">Teacher access only</h1>
        <p className="text-sm text-muted-foreground">This area is for teachers. If you're a teacher, ask your admin to activate your account.</p>
        <Link to="/dashboard" className="text-primary underline text-sm">Go back</Link>
      </div>
    );
  }
  return <Outlet />;
}
