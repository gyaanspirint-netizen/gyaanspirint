import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "student" | "super_admin";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s) setRole(null);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const metaRole = (user.user_metadata?.role as AppRole | undefined) ?? null;
    const fetchRole = async (attempt = 0): Promise<void> => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (cancelled) return;
      const roles = (data ?? []).map((r) => r.role as AppRole);
      // Priority: super_admin > admin > student
      const resolved =
        roles.find((r) => r === "super_admin") ??
        roles.find((r) => r === "admin") ??
        roles.find((r) => r === "student");
      if (resolved) {
        setRole(resolved);
        return;
      }
      if (attempt < 5) {
        setTimeout(() => fetchRole(attempt + 1), 400);
        return;
      }
      setRole(metaRole ?? "student");
    };
    fetchRole();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { session, user, role, loading };
}
