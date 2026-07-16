import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TEACHER_EMAIL_DOMAIN = "teachers.gyanspirint.local";
const authEmailForTeacher = (id: string) => `t-${id}@${TEACHER_EMAIL_DOMAIN}`;

function randomPassword(len = 10) {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < len; i++) s += abc[bytes[i] % abc.length];
  return s;
}

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admins only");
}

async function logActivity(
  admin: any,
  ownerId: string,
  actorUserId: string,
  actorRole: string,
  actorName: string | null,
  action: string,
  entity_type?: string,
  entity_id?: string | null,
  metadata: Record<string, unknown> = {},
) {
  await admin.from("activity_log").insert({
    owner_id: ownerId,
    actor_user_id: actorUserId,
    actor_role: actorRole,
    actor_name: actorName,
    action,
    entity_type,
    entity_id: entity_id ?? null,
    metadata,
  });
}

// ---------- Admin: Teachers CRUD ----------

export const listTeachers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("teachers")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      full_name: z.string().trim().min(1).max(120),
      mobile: z.string().trim().min(5).max(20).regex(/^[0-9+\-\s()]+$/),
      email: z.string().trim().email().optional().or(z.literal("")).transform((v) => v || null),
      subject: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => v || null),
      qualification: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => v || null),
      experience: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => v || null),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: code, error: codeErr } = await supabaseAdmin.rpc("next_teacher_code", { _owner_id: userId });
    if (codeErr || !code) throw new Error(codeErr?.message ?? "Failed to generate teacher code");

    const tempPassword = randomPassword(10);

    const { data: row, error } = await supabaseAdmin
      .from("teachers")
      .insert({
        owner_id: userId,
        teacher_code: code as string,
        full_name: data.full_name,
        mobile: data.mobile.replace(/\s+/g, ""),
        email: data.email,
        subject: data.subject,
        qualification: data.qualification,
        experience: data.experience,
        temp_password: tempPassword,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await logActivity(supabaseAdmin, userId, userId, "admin", null, "Teacher created", "teacher", row.id, {
      teacher_code: code,
    });

    return { teacher: row, tempPassword };
  });

export const updateTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      full_name: z.string().trim().min(1).max(120).optional(),
      mobile: z.string().trim().min(5).max(20).optional(),
      email: z.string().trim().email().optional().nullable(),
      subject: z.string().trim().max(120).optional().nullable(),
      qualification: z.string().trim().max(200).optional().nullable(),
      experience: z.string().trim().max(200).optional().nullable(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { id, ...patch } = data;
    if (patch.mobile) patch.mobile = patch.mobile.replace(/\s+/g, "");
    const { error } = await supabase.from("teachers").update(patch).eq("id", id).eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setTeacherStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), status: z.enum(["pending", "active", "inactive"]) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { error } = await supabase.from("teachers").update({ status: data.status }).eq("id", data.id).eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetTeacherPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tempPassword = randomPassword(10);
    const { data: row } = await supabaseAdmin
      .from("teachers")
      .select("id, user_id, teacher_code")
      .eq("id", data.id)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!row) throw new Error("Teacher not found");

    // Reset auth user password if activated
    if (row.user_id) {
      await supabaseAdmin.auth.admin.updateUserById(row.user_id, { password: tempPassword });
    }
    await supabaseAdmin
      .from("teachers")
      .update({ temp_password: tempPassword, must_change_password: true, status: "pending", user_id: null })
      .eq("id", data.id);

    // If there was an auth user, we detached it; safe to delete to force re-activate
    if (row.user_id) {
      await supabaseAdmin.auth.admin.deleteUser(row.user_id);
    }
    return { tempPassword, teacher_code: row.teacher_code };
  });

export const deleteTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("teachers")
      .select("user_id")
      .eq("id", data.id)
      .eq("owner_id", userId)
      .maybeSingle();
    const { error } = await supabaseAdmin.from("teachers").delete().eq("id", data.id).eq("owner_id", userId);
    if (error) throw new Error(error.message);
    if (row?.user_id) await supabaseAdmin.auth.admin.deleteUser(row.user_id).catch(() => {});
    return { ok: true };
  });

// ---------- Assignments ----------

export const listAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ teacherId: z.string().uuid().optional() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    let q = supabase
      .from("teacher_assignments")
      .select("id, teacher_id, batch_id, subject, class_name, batches(name)")
      .eq("owner_id", userId);
    if (data.teacherId) q = q.eq("teacher_id", data.teacherId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const assignTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      teacher_id: z.string().uuid(),
      batch_id: z.string().uuid(),
      subject: z.string().trim().max(120).optional().nullable(),
      class_name: z.string().trim().max(120).optional().nullable(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { error } = await supabase.from("teacher_assignments").insert({
      owner_id: userId,
      teacher_id: data.teacher_id,
      batch_id: data.batch_id,
      subject: data.subject ?? null,
      class_name: data.class_name ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unassignTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { error } = await supabase.from("teacher_assignments").delete().eq("id", data.id).eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Activity log ----------

export const listActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("activity_log")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Public: teacher lookup + activation ----------

export const teacherSignInLookup = createServerFn({ method: "POST" })
  .inputValidator(z.object({ mobile: z.string().trim().min(3).max(20) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const mobile = data.mobile.replace(/\s+/g, "");
    const { data: rows } = await supabaseAdmin
      .from("teachers")
      .select("id, user_id, status")
      .eq("mobile", mobile);
    const t = (rows ?? []).find((r: any) => r.user_id && r.status === "active");
    if (!t) throw new Error("No active teacher with that mobile. Activate your account first.");
    return { email: authEmailForTeacher(t.id) };
  });

export const activateTeacher = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      teacher_code: z.string().trim().min(3).max(40),
      temp_password: z.string().trim().min(4).max(64),
      new_password: z.string().trim().min(8).max(128),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.teacher_code.trim().toUpperCase();

    const { data: rows } = await supabaseAdmin
      .from("teachers")
      .select("id, owner_id, teacher_code, full_name, mobile, email, temp_password, user_id, status")
      .eq("teacher_code", code);
    const t = (rows ?? [])[0];
    if (!t) throw new Error("Invalid Teacher ID");
    if (t.status === "inactive") throw new Error("Account deactivated. Contact your admin.");
    if (t.user_id) throw new Error("Account already activated. Please sign in.");
    if (!t.temp_password || t.temp_password !== data.temp_password) {
      throw new Error("Invalid temporary password");
    }

    const authEmail = authEmailForTeacher(t.id);
    const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: data.new_password,
      email_confirm: true,
      user_metadata: { full_name: t.full_name, role: "teacher", teacher_code: t.teacher_code },
    });
    if (authErr || !created.user) throw new Error(authErr?.message ?? "Failed to create account");

    const { error: updErr } = await supabaseAdmin
      .from("teachers")
      .update({
        user_id: created.user.id,
        status: "active",
        must_change_password: false,
        temp_password: null,
        last_login_at: new Date().toISOString(),
      })
      .eq("id", t.id);
    if (updErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(updErr.message);
    }

    await logActivity(supabaseAdmin, t.owner_id, created.user.id, "teacher", t.full_name, "Teacher activated account", "teacher", t.id);

    return { email: authEmail };
  });
