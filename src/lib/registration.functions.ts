import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STUDENT_EMAIL_DOMAIN = "students.coaching.local";

function buildPrefix(source: string): string {
  const letters = source.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return (letters.slice(0, 3) || "STD").padEnd(3, "X");
}

function randomDigits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10).toString();
  return s;
}

function randomToken(len = 24): string {
  const abc =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) s += abc[bytes[i] % abc.length];
  return s;
}

async function requireAdmin(supabase: any, userId: string) {
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) throw new Error("Admins only");
}

export const getInviteSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let { data: inst } = await supabaseAdmin
      .from("institutes")
      .select(
        "id, registration_enabled, require_approval, auto_generate_id, auto_generate_password, registration_token",
      )
      .eq("owner_id", userId)
      .maybeSingle();

    if (!inst) throw new Error("Institute not found");

    if (!inst.registration_token) {
      const token = randomToken();
      const { data: updated, error } = await supabaseAdmin
        .from("institutes")
        .update({ registration_token: token })
        .eq("id", inst.id)
        .select(
          "id, registration_enabled, require_approval, auto_generate_id, auto_generate_password, registration_token",
        )
        .single();
      if (error) throw new Error(error.message);
      inst = updated;
    }
    return inst;
  });

export const updateInviteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      registration_enabled: z.boolean(),
      require_approval: z.boolean(),
      auto_generate_id: z.boolean(),
      auto_generate_password: z.boolean(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("institutes")
      .update(data)
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rotateInviteToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = randomToken();
    const { error } = await supabaseAdmin
      .from("institutes")
      .update({ registration_token: token })
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { registration_token: token };
  });

// Public — used by the shareable registration page. No auth.
export const submitRegistration = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().trim().min(6).max(64),
      student_name: z.string().trim().min(1).max(120),
      parent_name: z.string().trim().min(1).max(120),
      parent_phone: z
        .string()
        .trim()
        .min(5)
        .max(20)
        .regex(/^[0-9+\-\s()]+$/),
      student_phone: z
        .string()
        .trim()
        .max(20)
        .regex(/^[0-9+\-\s()]*$/)
        .optional()
        .default(""),
      batch: z.string().trim().max(200).optional().default(""),
      notes: z.string().trim().max(500).optional().default(""),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inst } = await supabaseAdmin
      .from("institutes")
      .select(
        "owner_id, registration_enabled, require_approval, auto_generate_id, auto_generate_password, name",
      )
      .eq("registration_token", data.token)
      .maybeSingle();
    if (!inst || !inst.owner_id) throw new Error("Invalid registration link");
    if (!inst.registration_enabled)
      throw new Error("Registration is currently closed");

    if (inst.require_approval) {
      const { error } = await supabaseAdmin.from("pending_registrations").insert({
        owner_id: inst.owner_id,
        student_name: data.student_name,
        parent_name: data.parent_name,
        parent_phone: data.parent_phone,
        student_phone: data.student_phone ?? "",
        batch: data.batch ?? "",
        notes: data.notes ?? "",
        status: "pending",
      });
      if (error) throw new Error(error.message);
      return { requiresApproval: true, institute: inst.name };
    }

    // Direct create student (no approval)
    const created = await createStudentAccount({
      ownerId: inst.owner_id,
      name: data.student_name,
      father_name: data.parent_name,
      parent_phone: data.parent_phone,
      student_phone: data.student_phone || data.parent_phone,
      batch: data.batch ?? "",
      admission_date: new Date().toISOString().slice(0, 10),
    });
    return {
      requiresApproval: false,
      institute: inst.name,
      cuid: created.cuid,
      password: created.password,
    };
  });

async function createStudentAccount(params: {
  ownerId: string;
  name: string;
  father_name: string;
  student_phone: string;
  parent_phone: string;
  batch: string;
  admission_date: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email")
    .eq("id", params.ownerId)
    .maybeSingle();
  const prefix = buildPrefix(profile?.full_name || profile?.email || "STD");

  let cuid = "";
  for (let i = 0; i < 5; i++) {
    const candidate = `${prefix}${randomDigits(6)}`;
    const { data: existing } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("cuid", candidate)
      .maybeSingle();
    if (!existing) {
      cuid = candidate;
      break;
    }
  }
  if (!cuid) throw new Error("Could not generate unique student ID");

  const email = `${cuid.toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`;
  const password = params.student_phone.replace(/\s+/g, "");

  const { data: authRes, error: authErr } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: params.name, role: "student", cuid },
    });
  if (authErr || !authRes.user)
    throw new Error(authErr?.message || "Failed to create student account");

  const { error: insertErr } = await supabaseAdmin.from("students").insert({
    name: params.name,
    father_name: params.father_name,
    student_phone: params.student_phone,
    parent_phone: params.parent_phone,
    batch: params.batch,
    admission_date: params.admission_date,
    cuid,
    user_id: authRes.user.id,
    created_by: params.ownerId,
    owner_id: params.ownerId,
  });
  if (insertErr) {
    await supabaseAdmin.auth.admin.deleteUser(authRes.user.id);
    throw new Error(insertErr.message);
  }
  return { cuid, password };
}

export const listPendingRegistrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("pending_registrations")
      .select("*")
      .eq("status", "pending")
      .order("submitted_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const approvePendingRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pending } = await supabaseAdmin
      .from("pending_registrations")
      .select("*")
      .eq("id", data.id)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!pending) throw new Error("Registration not found");

    const created = await createStudentAccount({
      ownerId: userId,
      name: pending.student_name,
      father_name: pending.parent_name,
      parent_phone: pending.parent_phone,
      student_phone: pending.student_phone || pending.parent_phone,
      batch: pending.batch || "",
      admission_date: new Date().toISOString().slice(0, 10),
    });

    await supabaseAdmin
      .from("pending_registrations")
      .update({ status: "approved", processed_at: new Date().toISOString() })
      .eq("id", data.id);

    return { cuid: created.cuid, password: created.password };
  });

export const rejectPendingRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { error } = await supabase
      .from("pending_registrations")
      .update({ status: "rejected", processed_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
