import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import logoAsset from "@/assets/gyanspirint-logo.png.asset.json";

// Cache the role/institute check across route navigations so we don't
// re-query the backend every time the user clicks a link.
let authCheckCache: { userId: string; ok: boolean } | null = null;

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(() => authCheckCache?.ok ?? false);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (authCheckCache?.ok) {
      setChecked(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || cancelled) return;

      const [rolesRes, teacherRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
        supabase.from("teachers").select("id, status").eq("user_id", u.user.id).maybeSingle(),
      ]);
      const roleList = (rolesRes.data ?? []).map((r) => r.role);
      const isSuperAdmin = roleList.includes("super_admin");

      if (isSuperAdmin) {
        authCheckCache = { userId: u.user.id, ok: true };
        if (!cancelled) {
          navigate({ to: "/super-admin", replace: true });
          setChecked(true);
        }
        return;
      }

      const isTeacher = teacherRes.data && teacherRes.data.status === "active";
      if (isTeacher && !roleList.includes("admin")) {
        authCheckCache = { userId: u.user.id, ok: true };
        if (!cancelled) {
          if (!window.location.pathname.startsWith("/teacher") && window.location.pathname !== "/settings") {
            navigate({ to: "/teacher", replace: true });
          }
          setChecked(true);
        }
        return;
      }

      const isAdmin = roleList.includes("admin");
      if (isAdmin) {
        const { data: inst } = await supabase
          .from("institutes")
          .select("status")
          .eq("owner_id", u.user.id)
          .maybeSingle();
        if (inst && inst.status !== "active") {
          authCheckCache = { userId: u.user.id, ok: true };
          if (!cancelled) {
            navigate({ to: "/pending-approval", replace: true });
            setChecked(true);
          }
          return;
        }
      }
      authCheckCache = { userId: u.user.id, ok: true };
      if (!cancelled) setChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") authCheckCache = null;
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border/60 bg-card/40 backdrop-blur px-3 sm:px-4 gap-2 sm:gap-3 sticky top-0 z-20">
            <SidebarTrigger className="h-10 w-10" />
            <img
              src={logoAsset.url}
              alt="Gyanspirint"
              className="md:hidden h-7 w-7 rounded-md object-contain bg-white shrink-0"
            />
            <h1 className="text-sm font-semibold tracking-tight truncate">Gyanspirint</h1>
          </header>
          <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-6">{checked ? <Outlet /> : null}</main>
        </div>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
