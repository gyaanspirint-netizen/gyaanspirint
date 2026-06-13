import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RegisterSchema = z.object({
  name: z.string().trim().min(1).max(200),
  ownerName: z.string().trim().min(1).max(120),
  mobile: z.string().trim().min(6).max(20),
  email: z.string().trim().email().max(255),
  city: z.string().trim().min(1).max(120),
});

export const registerInstitute = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RegisterSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const emailLower = data.email.toLowerCase();

    // Don't allow registering on the platform-owner email
    if (emailLower === "gyaanspirint@gmail.com") {
      throw new Error("This email is reserved.");
    }

    // Check if institute already exists for this email
    const { data: existing } = await supabaseAdmin
      .from("institutes")
      .select("id,status")
      .ilike("email", emailLower)
      .maybeSingle();
    if (existing) {
      throw new Error("An institute is already registered with this email.");
    }

    // Create auth user with a random password (owner will set their own after approval)
    const randomPassword = crypto.randomUUID() + "Aa1!";
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: emailLower,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { full_name: data.ownerName, role: "admin" },
    });
    if (createErr || !created.user) {
      // If user already exists, try to look them up
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = list?.users?.find((u) => u.email?.toLowerCase() === emailLower);
      if (!existingUser) throw new Error(createErr?.message ?? "Failed to create user");
      const ownerId = existingUser.id;
      const { error: insErr } = await supabaseAdmin.from("institutes").insert({
        owner_id: ownerId,
        name: data.name,
        owner_name: data.ownerName,
        mobile: data.mobile,
        email: emailLower,
        city: data.city,
        status: "pending",
      });
      if (insErr) throw new Error(insErr.message);
      return { ok: true };
    }

    const ownerId = created.user.id;
    const { error: insErr } = await supabaseAdmin.from("institutes").insert({
      owner_id: ownerId,
      name: data.name,
      owner_name: data.ownerName,
      mobile: data.mobile,
      email: emailLower,
      city: data.city,
      status: "pending",
    });
    if (insErr) {
      // Roll back the created user
      await supabaseAdmin.auth.admin.deleteUser(ownerId);
      throw new Error(insErr.message);
    }
    return { ok: true };
  });

async function assertSuperAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

export const listInstitutes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("institutes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { institutes: data ?? [] };
  });

export const superAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [instAll, studentsCount, teachersCount] = await Promise.all([
      supabaseAdmin.from("institutes").select("status"),
      supabaseAdmin.from("students").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("batch_teachers").select("*", { count: "exact", head: true }),
    ]);
    const rows = instAll.data ?? [];
    const by = (s: string) => rows.filter((r) => r.status === s).length;
    return {
      total: rows.length,
      pending: by("pending"),
      active: by("active"),
      suspended: by("suspended"),
      rejected: by("rejected"),
      students: studentsCount.count ?? 0,
      teachers: teachersCount.count ?? 0,
    };
  });

const IdSchema = z.object({ id: z.string().uuid() });
const RejectSchema = z.object({ id: z.string().uuid(), reason: z.string().trim().max(500).optional() });

export const approveInstitute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inst, error } = await supabaseAdmin
      .from("institutes")
      .update({ status: "active", approved_at: new Date().toISOString(), approved_by: context.userId, rejection_reason: null })
      .eq("id", data.id)
      .select("email")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, email: inst.email };
  });

export const rejectInstitute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RejectSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("institutes")
      .update({ status: "rejected", rejection_reason: data.reason ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const suspendInstitute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("institutes")
      .update({ status: "suspended" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reactivateInstitute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("institutes")
      .update({ status: "active" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
