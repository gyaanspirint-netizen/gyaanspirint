import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireTeacher(supabase: any) {
  const { data: t } = await supabase
    .from("teachers")
    .select("id, owner_id, full_name, status")
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
    .maybeSingle();
  if (!t || t.status !== "active") throw new Error("Teachers only");
  return t as { id: string; owner_id: string; full_name: string; status: string };
}

export const getTeacherProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("teachers").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateTeacherProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      email: z.string().trim().email().optional().nullable(),
      qualification: z.string().trim().max(200).optional().nullable(),
      experience: z.string().trim().max(200).optional().nullable(),
      photo_url: z.string().trim().url().optional().nullable(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("teachers").update(data).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const me = await requireTeacher(supabase);
    const { data, error } = await supabase
      .from("teacher_assignments")
      .select("id, batch_id, subject, class_name, batches(id, name, start_time, end_time, schedule_days)")
      .eq("teacher_id", me.id);
    if (error) throw new Error(error.message);
    return { assignments: data ?? [], teacher: me };
  });

export const getMyStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    await requireTeacher(supabase);
    const { data, error } = await supabase
      .from("students")
      .select("id, name, father_name, student_phone, parent_phone, batch, admission_date, cuid")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getTeacherDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const me = await requireTeacher(supabase);
    const today = new Date().toISOString().slice(0, 10);

    const [assignRes, studentsRes, attendanceRes, updatesRes, testsRes] = await Promise.all([
      supabase
        .from("teacher_assignments")
        .select("id, batch_id, subject, batches(name, start_time, end_time, schedule_days)")
        .eq("teacher_id", me.id),
      supabase.from("students").select("id", { count: "exact", head: true }),
      supabase.from("attendance").select("id", { count: "exact", head: true }).eq("date", today),
      supabase.from("class_updates").select("id", { count: "exact", head: true }).eq("created_by", (await supabase.auth.getUser()).data.user?.id ?? ""),
      supabase.from("tests").select("id", { count: "exact", head: true }),
    ]);

    const { data: activity } = await supabase
      .from("activity_log")
      .select("id, action, entity_type, created_at, metadata")
      .eq("actor_user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .order("created_at", { ascending: false })
      .limit(10);

    return {
      teacher: me,
      assignments: assignRes.data ?? [],
      counts: {
        students: studentsRes.count ?? 0,
        attendanceMarkedToday: attendanceRes.count ?? 0,
        updatesPublished: updatesRes.count ?? 0,
        tests: testsRes.count ?? 0,
      },
      recentActivity: activity ?? [],
    };
  });

export const addRemark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      student_id: z.string().uuid(),
      remark: z.string().trim().min(1).max(1000),
      tag: z.string().trim().max(60).optional().nullable(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const me = await requireTeacher(supabase);
    const { error } = await supabase.from("teacher_remarks").insert({
      owner_id: me.owner_id,
      teacher_id: me.id,
      student_id: data.student_id,
      remark: data.remark,
      tag: data.tag ?? null,
    });
    if (error) throw new Error(error.message);
    await supabase.from("activity_log").insert({
      owner_id: me.owner_id,
      actor_user_id: userId,
      actor_role: "teacher",
      actor_name: me.full_name,
      action: "Remark added",
      entity_type: "student",
      entity_id: data.student_id,
      metadata: { tag: data.tag ?? null },
    });
    return { ok: true };
  });

export const listRemarksForStudent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ student_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("teacher_remarks")
      .select("*")
      .eq("student_id", data.student_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      title: z.string().trim().min(1).max(200),
      body: z.string().trim().max(2000).optional().default(""),
      audience_type: z.enum(["all", "batch", "class"]).default("batch"),
      audience_ids: z.array(z.string().uuid()).optional().default([]),
      audience_labels: z.array(z.string()).optional().default([]),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const me = await requireTeacher(supabase);
    const { error } = await supabase.from("announcements").insert({
      owner_id: me.owner_id,
      teacher_id: me.id,
      created_by: userId,
      title: data.title,
      body: data.body,
      audience_type: data.audience_type,
      audience_ids: data.audience_ids,
      audience_labels: data.audience_labels,
    });
    if (error) throw new Error(error.message);
    await supabase.from("activity_log").insert({
      owner_id: me.owner_id,
      actor_user_id: userId,
      actor_role: "teacher",
      actor_name: me.full_name,
      action: "Announcement published",
      entity_type: "announcement",
      metadata: { title: data.title },
    });
    return { ok: true };
  });

export const listMyAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const me = await requireTeacher(supabase);
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("teacher_id", me.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
