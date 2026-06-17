import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STUDENT_EMAIL_DOMAIN = "students.coaching.local";

const studentInput = z.object({
  name: z.string().trim().min(1).max(100),
  father_name: z.string().trim().min(1).max(100),
  student_phone: z.string().trim().min(5).max(20).regex(/^[0-9+\-\s()]+$/),
  parent_phone: z.string().trim().min(5).max(20).regex(/^[0-9+\-\s()]+$/),
  batch: z.string().trim().max(200).optional().default(""),
  admission_date: z.string().min(1),
});

function buildPrefix(source: string): string {
  const letters = source.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return (letters.slice(0, 3) || "STD").padEnd(3, "X");
}

function randomDigits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10).toString();
  return s;
}

export const createStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(studentInput)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify admin
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Only admins can add students");

    // Build prefix from admin name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();
    const prefix = buildPrefix(profile?.full_name || profile?.email || "STD");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Generate a unique CUID (retry up to 5 times)
    let cuid = "";
    for (let attempt = 0; attempt < 5; attempt++) {
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
    if (!cuid) throw new Error("Could not generate unique CUID");

    const email = `${cuid.toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`;
    const password = data.student_phone.replace(/\s+/g, "");

    const { data: created, error: authErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: data.name, role: "student", cuid },
      });
    if (authErr || !created.user) {
      throw new Error(authErr?.message || "Failed to create student account");
    }

    const newUserId = created.user.id;

    const { error: insertErr } = await supabaseAdmin.from("students").insert({
      ...data,
      cuid,
      user_id: newUserId,
      created_by: userId,
      owner_id: userId,
    });
    if (insertErr) {
      // Roll back the auth user if student insert fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw new Error(insertErr.message);
    }

    return { cuid, password };
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Only admins can delete students");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: student } = await supabaseAdmin
      .from("students")
      .select("user_id")
      .eq("id", data.id)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("students")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (student?.user_id) {
      await supabaseAdmin.auth.admin.deleteUser(student.user_id);
    }
    return { ok: true };
  });

export const studentLoginLookup = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      cuid: z.string().trim().min(1).max(40),
      phone: z.string().trim().min(3).max(20),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const normalizedCuid = data.cuid.trim().toUpperCase();
    const normalizedPhone = data.phone.replace(/\s+/g, "");

    const { data: student } = await supabaseAdmin
      .from("students")
      .select("cuid, student_phone")
      .eq("cuid", normalizedCuid)
      .maybeSingle();

    if (!student) throw new Error("Invalid CUID or phone number");
    if (student.student_phone.replace(/\s+/g, "") !== normalizedPhone) {
      throw new Error("Invalid CUID or phone number");
    }

    return {
      email: `${normalizedCuid.toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`,
      password: normalizedPhone,
    };
  });