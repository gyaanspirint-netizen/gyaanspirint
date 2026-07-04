import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Loader2,
  Paperclip,
  Download,
  Search,
  Copy,
  Save,
  BookOpen,
  Calendar as CalendarIcon,
  AlertTriangle,
  Bell,
  FileText,
  Image as ImageIcon,
  X,
  CheckCircle2,
  Circle,
  MinusCircle,
  BarChart3,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/homework")({
  head: () => ({ meta: [{ title: "Today's Class Update — Gyanspirint" }] }),
  component: ClassUpdatesPage,
});

// ---------- Types ----------
type Priority = "normal" | "important" | "urgent";
type AudienceType = "class" | "batch" | "students";
type CompletionStatus = "completed" | "partial" | "not_completed";

type Attachment = { name: string; path: string; type: string; size: number };

type ClassUpdate = {
  id: string;
  owner_id: string;
  subject: string;
  class_name: string;
  batch: string;
  topic: string;
  homework: string;
  notice: string | null;
  due_date: string | null;
  priority: Priority;
  attachments: Attachment[];
  audience_type: AudienceType;
  audience_ids: string[];
  published_at: string;
};

type Template = {
  id: string;
  name: string;
  subject: string | null;
  topic: string | null;
  homework: string | null;
  notice: string | null;
  priority: Priority;
  attachments: Attachment[];
};

type Student = { id: string; name: string; batch: string };
type Completion = { update_id: string; student_id: string; status: CompletionStatus };

// ---------- Helpers ----------
const priorityStyles: Record<Priority, string> = {
  normal:
    "bg-secondary text-secondary-foreground border-transparent",
  important:
    "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  urgent:
    "bg-destructive/15 text-destructive border-destructive/30",
};

function PriorityBadge({ p }: { p: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        priorityStyles[p],
      )}
    >
      {p === "urgent" && <AlertTriangle className="h-3 w-3" />}
      {p}
    </span>
  );
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function isImage(a: Attachment) {
  return a.type.startsWith("image/");
}

async function signedUrl(path: string) {
  const { data } = await supabase.storage
    .from("class-attachments")
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? "";
}

// ---------- Page ----------
function ClassUpdatesPage() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const isStudent = role === "student";

  if (!role) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  return isAdmin ? (
    <TeacherView userId={user?.id ?? ""} />
  ) : isStudent ? (
    <StudentView userId={user?.id ?? ""} />
  ) : (
    <p className="text-muted-foreground">Not available for your role.</p>
  );
}

// =====================================================
// TEACHER VIEW
// =====================================================
function TeacherView({ userId }: { userId: string }) {
  const [updates, setUpdates] = useState<ClassUpdate[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<ClassUpdate | null>(null);
  const [prefill, setPrefill] = useState<Partial<ClassUpdate> | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [tab, setTab] = useState("updates");

  // filters
  const [q, setQ] = useState("");
  const [fSubject, setFSubject] = useState<string>("all");
  const [fBatch, setFBatch] = useState<string>("all");
  const [fDate, setFDate] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [uRes, tRes, sRes, bRes, cRes] = await Promise.all([
      supabase.from("class_updates").select("*").order("published_at", { ascending: false }),
      supabase.from("class_update_templates").select("*").order("created_at", { ascending: false }),
      supabase.from("students").select("id, name, batch").order("name"),
      supabase.from("batches").select("name").order("name"),
      supabase.from("class_update_completions").select("update_id, student_id, status"),
    ]);
    setUpdates((uRes.data ?? []) as ClassUpdate[]);
    setTemplates((tRes.data ?? []) as Template[]);
    setStudents((sRes.data ?? []) as Student[]);
    setBatches(((bRes.data ?? []) as { name: string }[]).map((b) => b.name));
    setCompletions((cRes.data ?? []) as Completion[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const subjects = useMemo(
    () => Array.from(new Set(updates.map((u) => u.subject).filter(Boolean))),
    [updates],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return updates.filter((u) => {
      if (fSubject !== "all" && u.subject !== fSubject) return false;
      if (fBatch !== "all" && u.batch !== fBatch) return false;
      if (fDate && u.published_at.slice(0, 10) !== fDate) return false;
      if (!term) return true;
      return (
        u.topic.toLowerCase().includes(term) ||
        u.subject.toLowerCase().includes(term) ||
        u.homework.toLowerCase().includes(term) ||
        (u.notice ?? "").toLowerCase().includes(term) ||
        u.batch.toLowerCase().includes(term) ||
        u.class_name.toLowerCase().includes(term)
      );
    });
  }, [updates, q, fSubject, fBatch, fDate]);

  const openCreate = () => {
    setEditing(null);
    setPrefill(null);
    setOpenDialog(true);
  };

  const openEdit = (u: ClassUpdate) => {
    setEditing(u);
    setPrefill(null);
    setOpenDialog(true);
  };

  const openCopyPrev = () => setCopyOpen(true);

  const applyCopyFrom = (u: ClassUpdate) => {
    setEditing(null);
    setPrefill({
      subject: u.subject,
      class_name: u.class_name,
      batch: u.batch,
      topic: u.topic,
      homework: u.homework,
      notice: u.notice,
      priority: u.priority,
      attachments: u.attachments,
      audience_type: u.audience_type,
      audience_ids: u.audience_ids,
    });
    setCopyOpen(false);
    setOpenDialog(true);
  };

  const applyTemplate = (t: Template) => {
    setEditing(null);
    setPrefill({
      subject: t.subject ?? "",
      topic: t.topic ?? "",
      homework: t.homework ?? "",
      notice: t.notice,
      priority: t.priority,
      attachments: t.attachments,
    });
    setOpenDialog(true);
    setTab("updates");
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
            Today's Class Update
          </h1>
          <p className="text-sm text-muted-foreground">
            Share topic, homework, notices and attachments with students.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Button variant="outline" onClick={openCopyPrev}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Previous
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Create Update
          </Button>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-grid">
          <TabsTrigger value="updates">Updates</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="reports">
            <BarChart3 className="h-4 w-4 mr-1" /> Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="updates" className="space-y-4">
          {/* Filters */}
          <Card className="rounded-2xl">
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div className="relative sm:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search topic, subject, homework..."
                    className="pl-9 h-11"
                  />
                </div>
                <Select value={fSubject} onValueChange={setFSubject}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All subjects</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Select value={fBatch} onValueChange={setFBatch}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Batch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All batches</SelectItem>
                      {batches.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={fDate}
                    onChange={(e) => setFDate(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="p-10 text-center text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No updates yet. Create your first class update.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {filtered.map((u) => (
                <TeacherUpdateCard
                  key={u.id}
                  update={u}
                  students={students}
                  completions={completions.filter((c) => c.update_id === u.id)}
                  onEdit={() => openEdit(u)}
                  onDeleted={load}
                  onCompletionsChanged={load}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesTab
            templates={templates}
            onUse={applyTemplate}
            onChanged={load}
          />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab
            updates={updates}
            students={students}
            completions={completions}
          />
        </TabsContent>
      </Tabs>

      {/* Mobile FAB */}
      <button
        onClick={openCreate}
        className="md:hidden fixed right-4 bottom-20 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition"
        aria-label="Create update"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Create/edit dialog */}
      <UpdateDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        userId={userId}
        students={students}
        batches={batches}
        editing={editing}
        prefill={prefill}
        onSaved={() => {
          setOpenDialog(false);
          setEditing(null);
          setPrefill(null);
          load();
        }}
        onSavedTemplate={load}
      />

      {/* Copy previous picker */}
      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Copy from a previous update</DialogTitle>
            <DialogDescription>
              Pick one — its content will be prefilled into a new update.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {updates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No previous updates.
              </p>
            ) : (
              updates.map((u) => (
                <button
                  key={u.id}
                  onClick={() => applyCopyFrom(u)}
                  className="w-full text-left rounded-xl border p-3 hover:bg-muted transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{u.subject} — {u.topic}</span>
                    <PriorityBadge p={u.priority} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {fmtDate(u.published_at)} · {u.batch || u.class_name || "Class"}
                  </p>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeacherUpdateCard({
  update,
  students,
  completions,
  onEdit,
  onDeleted,
  onCompletionsChanged,
}: {
  update: ClassUpdate;
  students: Student[];
  completions: Completion[];
  onEdit: () => void;
  onDeleted: () => void;
  onCompletionsChanged: () => void;
}) {
  const [showCompletion, setShowCompletion] = useState(false);

  const audience = useMemo(() => {
    if (update.audience_type === "class") return students;
    if (update.audience_type === "batch")
      return students.filter((s) =>
        s.batch.split(",").map((b) => b.trim()).includes(update.batch),
      );
    return students.filter((s) => update.audience_ids.includes(s.id));
  }, [update, students]);

  const counts = useMemo(() => {
    const c = { completed: 0, partial: 0, not_completed: 0 };
    completions.forEach((x) => (c[x.status] += 1));
    return c;
  }, [completions]);

  const rate = audience.length
    ? Math.round(((counts.completed + counts.partial * 0.5) / audience.length) * 100)
    : 0;

  const dueOver = update.due_date && new Date(update.due_date) <= new Date();

  const setStatus = async (studentId: string, status: CompletionStatus) => {
    const { error } = await supabase.from("class_update_completions").upsert(
      {
        update_id: update.id,
        student_id: studentId,
        owner_id: update.owner_id,
        status,
      },
      { onConflict: "update_id,student_id" },
    );
    if (error) return toast.error(error.message);
    onCompletionsChanged();
  };

  const remove = async () => {
    if (!confirm("Delete this update?")) return;
    const { error } = await supabase.from("class_updates").delete().eq("id", update.id);
    if (error) return toast.error(error.message);
    toast.success("Update deleted");
    onDeleted();
  };

  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <PriorityBadge p={update.priority} />
              <span className="text-xs text-muted-foreground">
                {fmtDate(update.published_at)}
              </span>
            </div>
            <h3 className="font-semibold text-base leading-tight">
              {update.subject}
            </h3>
            <p className="text-sm text-muted-foreground truncate">{update.topic}</p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
          {update.class_name && <span>Class: {update.class_name}</span>}
          {update.batch && <span>Batch: {update.batch}</span>}
          <span>
            Audience:{" "}
            {update.audience_type === "class"
              ? "Entire class"
              : update.audience_type === "batch"
                ? `Batch (${audience.length})`
                : `${audience.length} selected`}
          </span>
          {update.due_date && (
            <span className="inline-flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" /> Due {fmtDate(update.due_date)}
            </span>
          )}
        </div>

        {update.homework && (
          <div className="rounded-xl bg-muted/50 p-3 text-sm whitespace-pre-wrap">
            <span className="font-medium text-xs text-muted-foreground block mb-1">
              HOMEWORK
            </span>
            {update.homework}
          </div>
        )}

        {update.notice && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
            <span className="font-medium text-xs block mb-1 flex items-center gap-1">
              <Bell className="h-3 w-3" /> NOTICE
            </span>
            {update.notice}
          </div>
        )}

        {update.attachments?.length > 0 && (
          <AttachmentList files={update.attachments} />
        )}

        {/* Completion stats */}
        <div className="rounded-xl border p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              COMPLETION
            </span>
            <span className="text-xs font-semibold">{rate}%</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-emerald-500/10 py-2">
              <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                {counts.completed}
              </div>
              <div className="text-muted-foreground">Done</div>
            </div>
            <div className="rounded-lg bg-amber-500/10 py-2">
              <div className="font-semibold text-amber-700 dark:text-amber-400">
                {counts.partial}
              </div>
              <div className="text-muted-foreground">Partial</div>
            </div>
            <div className="rounded-lg bg-destructive/10 py-2">
              <div className="font-semibold text-destructive">
                {counts.not_completed}
              </div>
              <div className="text-muted-foreground">Missed</div>
            </div>
          </div>
          {dueOver && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 h-10 rounded-xl"
              onClick={() => setShowCompletion((s) => !s)}
            >
              {showCompletion ? "Hide" : "Mark completion"}
            </Button>
          )}
          {showCompletion && (
            <div className="mt-3 space-y-2 max-h-56 overflow-y-auto">
              {audience.map((s) => {
                const cur = completions.find((c) => c.student_id === s.id)?.status;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate flex-1">{s.name}</span>
                    <div className="flex gap-1">
                      <MarkBtn
                        active={cur === "completed"}
                        onClick={() => setStatus(s.id, "completed")}
                        color="emerald"
                        icon={<CheckCircle2 className="h-4 w-4" />}
                      />
                      <MarkBtn
                        active={cur === "partial"}
                        onClick={() => setStatus(s.id, "partial")}
                        color="amber"
                        icon={<MinusCircle className="h-4 w-4" />}
                      />
                      <MarkBtn
                        active={cur === "not_completed"}
                        onClick={() => setStatus(s.id, "not_completed")}
                        color="rose"
                        icon={<Circle className="h-4 w-4" />}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1 h-10 rounded-xl" onClick={onEdit}>
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-10 w-10 rounded-xl"
            onClick={remove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MarkBtn({
  active,
  onClick,
  color,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  color: "emerald" | "amber" | "rose";
  icon: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    emerald:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/40",
    rose: "bg-destructive/10 text-destructive border-destructive/40",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 w-8 rounded-lg border flex items-center justify-center transition",
        active ? colors[color] : "text-muted-foreground hover:bg-muted",
      )}
    >
      {icon}
    </button>
  );
}

// =====================================================
// CREATE / EDIT DIALOG
// =====================================================
function UpdateDialog({
  open,
  onOpenChange,
  userId,
  students,
  batches,
  editing,
  prefill,
  onSaved,
  onSavedTemplate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  students: Student[];
  batches: string[];
  editing: ClassUpdate | null;
  prefill: Partial<ClassUpdate> | null;
  onSaved: () => void;
  onSavedTemplate: () => void;
}) {
  const seed = editing ?? prefill ?? {};
  const [subject, setSubject] = useState<string>((seed.subject as string) ?? "");
  const [className, setClassName] = useState<string>((seed.class_name as string) ?? "");
  const [batch, setBatch] = useState<string>((seed.batch as string) ?? "");
  const [topic, setTopic] = useState<string>((seed.topic as string) ?? "");
  const [homework, setHomework] = useState<string>((seed.homework as string) ?? "");
  const [notice, setNotice] = useState<string>((seed.notice as string) ?? "");
  const [dueDate, setDueDate] = useState<string>((seed.due_date as string) ?? "");
  const [priority, setPriority] = useState<Priority>((seed.priority as Priority) ?? "normal");
  const [attachments, setAttachments] = useState<Attachment[]>(
    (seed.attachments as Attachment[]) ?? [],
  );
  const [audienceType, setAudienceType] = useState<AudienceType>(
    (seed.audience_type as AudienceType) ?? "class",
  );
  const [audienceIds, setAudienceIds] = useState<string[]>(
    (seed.audience_ids as string[]) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // reset when opening
  useEffect(() => {
    if (!open) return;
    const s = editing ?? prefill ?? {};
    setSubject((s.subject as string) ?? "");
    setClassName((s.class_name as string) ?? "");
    setBatch((s.batch as string) ?? "");
    setTopic((s.topic as string) ?? "");
    setHomework((s.homework as string) ?? "");
    setNotice((s.notice as string) ?? "");
    setDueDate((s.due_date as string) ?? "");
    setPriority((s.priority as Priority) ?? "normal");
    setAttachments((s.attachments as Attachment[]) ?? []);
    setAudienceType((s.audience_type as AudienceType) ?? "class");
    setAudienceIds((s.audience_ids as string[]) ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length || !userId) return;
    setUploading(true);
    const added: Attachment[] = [];
    for (const file of Array.from(files)) {
      const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage
        .from("class-attachments")
        .upload(path, file, { contentType: file.type });
      if (error) {
        toast.error(`${file.name}: ${error.message}`);
        continue;
      }
      added.push({ name: file.name, path, type: file.type, size: file.size });
    }
    setAttachments((prev) => [...prev, ...added]);
    setUploading(false);
  };

  const removeAttachment = (path: string) => {
    setAttachments((prev) => prev.filter((a) => a.path !== path));
  };

  const save = async () => {
    if (!subject.trim() || !className.trim() || !batch.trim() || !topic.trim() || !homework.trim()) {
      return toast.error("Fill Subject, Class, Batch, Topic and Homework");
    }
    if (audienceType === "students" && audienceIds.length === 0) {
      return toast.error("Select at least one student");
    }
    setSaving(true);
    const payload = {
      owner_id: userId,
      subject: subject.trim(),
      class_name: className.trim(),
      batch: batch.trim(),
      topic: topic.trim(),
      homework: homework.trim(),
      notice: notice.trim() || null,
      due_date: dueDate || null,
      priority,
      attachments: attachments as unknown as never,
      audience_type: audienceType,
      audience_ids: audienceIds,
    };
    const res = editing
      ? await supabase.from("class_updates").update(payload).eq("id", editing.id)
      : await supabase.from("class_updates").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Update saved" : "Update published");
    onSaved();
  };

  const saveTemplate = async () => {
    const name = prompt("Template name?", subject ? `${subject} — ${topic || "template"}` : "");
    if (!name) return;
    const { error } = await supabase.from("class_update_templates").insert({
      owner_id: userId,
      name,
      subject,
      topic,
      homework,
      notice: notice || null,
      priority,
      attachments: attachments as unknown as never,
    });
    if (error) return toast.error(error.message);
    toast.success("Saved as template");
    onSavedTemplate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit update" : "Create class update"}</DialogTitle>
          <DialogDescription>
            Share today's topic, homework, notices and attachments with your students.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Subject *</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Math" />
            </div>
            <div className="space-y-1">
              <Label>Class *</Label>
              <Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Class 10" />
            </div>
            <div className="space-y-1">
              <Label>Batch *</Label>
              <Select value={batch} onValueChange={setBatch}>
                <SelectTrigger><SelectValue placeholder="Pick batch" /></SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-1">
            <Label>Today's Topic *</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Quadratic equations — intro" />
          </div>
          <div className="space-y-1">
            <Label>Homework *</Label>
            <Textarea rows={3} value={homework} onChange={(e) => setHomework(e.target.value)} placeholder="Chapter 4 exercise 4.2 Q1–Q10" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Important Notice (optional)</Label>
              <Textarea rows={2} value={notice} onChange={(e) => setNotice(e.target.value)} placeholder="Bring graph book tomorrow" />
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Homework submission date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <div className="grid grid-cols-3 gap-1 rounded-lg border p-1">
                  {(["normal", "important", "urgent"] as Priority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={cn(
                        "h-9 rounded-md text-xs font-medium capitalize transition",
                        priority === p
                          ? priorityStyles[p]
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="rounded-xl border border-dashed p-3">
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                onChange={(e) => handleUpload(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                {uploading ? "Uploading..." : "Add files (PDF, images, docs)"}
              </Button>
              {attachments.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {attachments.map((a) => (
                    <li key={a.path} className="flex items-center justify-between gap-2 text-sm rounded-lg bg-muted/50 px-2 py-1.5">
                      <span className="flex items-center gap-2 min-w-0">
                        {isImage(a) ? <ImageIcon className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
                        <span className="truncate">{a.name}</span>
                      </span>
                      <button onClick={() => removeAttachment(a.path)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Audience */}
          <div className="space-y-2">
            <Label>Target audience</Label>
            <Tabs value={audienceType} onValueChange={(v) => setAudienceType(v as AudienceType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="class">Entire Class</TabsTrigger>
                <TabsTrigger value="batch">Specific Batch</TabsTrigger>
                <TabsTrigger value="students">Selected</TabsTrigger>
              </TabsList>
              <TabsContent value="class" className="text-xs text-muted-foreground pt-2">
                Every student in this class will receive it.
              </TabsContent>
              <TabsContent value="batch" className="text-xs text-muted-foreground pt-2">
                Only students in batch <b>{batch || "—"}</b> will receive it.
              </TabsContent>
              <TabsContent value="students" className="pt-2">
                <div className="border rounded-lg max-h-40 overflow-y-auto p-2 space-y-1">
                  {students.map((s) => {
                    const checked = audienceIds.includes(s.id);
                    return (
                      <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-muted rounded">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => {
                            if (c) setAudienceIds([...audienceIds, s.id]);
                            else setAudienceIds(audienceIds.filter((x) => x !== s.id));
                          }}
                        />
                        <span className="flex-1">{s.name}</span>
                        <span className="text-xs text-muted-foreground">{s.batch}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{audienceIds.length} selected</p>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={saveTemplate} className="sm:mr-auto">
            <Save className="h-4 w-4 mr-2" /> Save as template
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : editing ? "Save changes" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// TEMPLATES TAB
// =====================================================
function TemplatesTab({
  templates,
  onUse,
  onChanged,
}: {
  templates: Template[];
  onUse: (t: Template) => void;
  onChanged: () => void;
}) {
  const remove = async (id: string) => {
    if (!confirm("Delete template?")) return;
    const { error } = await supabase.from("class_update_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Template deleted");
    onChanged();
  };
  if (templates.length === 0) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-10 text-center text-muted-foreground">
          No templates yet. In the create dialog, click "Save as template".
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {templates.map((t) => (
        <Card key={t.id} className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="truncate">{t.name}</span>
              <PriorityBadge p={t.priority} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {t.subject && <p className="text-xs text-muted-foreground">Subject: {t.subject}</p>}
            {t.topic && <p className="text-sm truncate">{t.topic}</p>}
            {t.homework && (
              <p className="text-xs text-muted-foreground line-clamp-2">{t.homework}</p>
            )}
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1 h-10 rounded-xl" onClick={() => onUse(t)}>
                Use
              </Button>
              <Button size="sm" variant="outline" className="h-10 w-10 rounded-xl" onClick={() => remove(t.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =====================================================
// REPORTS TAB
// =====================================================
function ReportsTab({
  updates,
  students,
  completions,
}: {
  updates: ClassUpdate[];
  students: Student[];
  completions: Completion[];
}) {
  const stats = useMemo(() => {
    let total = 0, done = 0, partial = 0, missed = 0;
    completions.forEach((c) => {
      total++;
      if (c.status === "completed") done++;
      else if (c.status === "partial") partial++;
      else missed++;
    });
    const rate = total ? Math.round(((done + partial * 0.5) / total) * 100) : 0;
    return { total, done, partial, missed, rate };
  }, [completions]);

  const missers = useMemo(() => {
    const map = new Map<string, number>();
    completions.forEach((c) => {
      if (c.status === "not_completed")
        map.set(c.student_id, (map.get(c.student_id) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([id, count]) => ({
        student: students.find((s) => s.id === id)?.name ?? "Unknown",
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [completions, students]);

  const byBatch = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>();
    for (const u of updates) {
      const key = u.batch || "Unassigned";
      const rel = completions.filter((c) => c.update_id === u.id);
      const cur = map.get(key) ?? { done: 0, total: 0 };
      cur.done += rel.filter((c) => c.status === "completed").length;
      cur.total += rel.length;
      map.set(key, cur);
    }
    return Array.from(map.entries());
  }, [updates, completions]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>();
    for (const u of updates) {
      const key = u.published_at.slice(0, 7);
      const rel = completions.filter((c) => c.update_id === u.id);
      const cur = map.get(key) ?? { done: 0, total: 0 };
      cur.done += rel.filter((c) => c.status === "completed").length;
      cur.total += rel.length;
      map.set(key, cur);
    }
    return Array.from(map.entries()).sort();
  }, [updates, completions]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Completion Rate" value={`${stats.rate}%`} tone="emerald" />
        <StatCard label="Completed" value={String(stats.done)} tone="emerald" />
        <StatCard label="Partial" value={String(stats.partial)} tone="amber" />
        <StatCard label="Not Completed" value={String(stats.missed)} tone="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base">Top students missing homework</CardTitle></CardHeader>
          <CardContent>
            {missers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No missed homework yet.</p>
            ) : (
              <ul className="space-y-2">
                {missers.map((m) => (
                  <li key={m.student} className="flex items-center justify-between text-sm">
                    <span>{m.student}</span>
                    <Badge variant="destructive">{m.count}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base">Batch-wise completion</CardTitle></CardHeader>
          <CardContent>
            {byBatch.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              <ul className="space-y-2">
                {byBatch.map(([k, v]) => {
                  const r = v.total ? Math.round((v.done / v.total) * 100) : 0;
                  return (
                    <li key={k} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{k}</span>
                        <span className="text-muted-foreground">{r}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${r}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Monthly completion</CardTitle></CardHeader>
        <CardContent>
          {byMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data.</p>
          ) : (
            <ul className="space-y-2">
              {byMonth.map(([k, v]) => {
                const r = v.total ? Math.round((v.done / v.total) * 100) : 0;
                return (
                  <li key={k} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{k}</span>
                      <span className="text-muted-foreground">{r}% ({v.done}/{v.total})</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${r}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "emerald" | "amber" | "rose" }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    rose: "bg-destructive/10 text-destructive",
  };
  return (
    <Card className={cn("rounded-2xl border-0", map[tone])}>
      <CardContent className="p-4">
        <p className="text-xs font-medium opacity-80">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

// =====================================================
// ATTACHMENT LIST (view/download/preview)
// =====================================================
function AttachmentList({ files }: { files: Attachment[] }) {
  const open = async (a: Attachment) => {
    const url = await signedUrl(a.path);
    if (!url) return toast.error("Could not fetch file");
    window.open(url, "_blank", "noopener");
  };
  const download = async (a: Attachment) => {
    const url = await signedUrl(a.path);
    if (!url) return toast.error("Could not fetch file");
    const link = document.createElement("a");
    link.href = url;
    link.download = a.name;
    link.click();
  };
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        ATTACHMENTS ({files.length})
      </p>
      <ul className="space-y-2">
        {files.map((a) => (
          <li key={a.path} className="flex items-center justify-between gap-2 rounded-xl border p-2">
            <button onClick={() => open(a)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
              {isImage(a) ? <ImageIcon className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
              <span className="truncate text-sm">{a.name}</span>
            </button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => download(a)}>
              <Download className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// =====================================================
// STUDENT VIEW
// =====================================================
function StudentView({ userId }: { userId: string }) {
  const [updates, setUpdates] = useState<ClassUpdate[]>([]);
  const [reads, setReads] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fSubject, setFSubject] = useState<string>("all");
  const [fBatch, setFBatch] = useState<string>("all");
  const [fDate, setFDate] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [uRes, rRes] = await Promise.all([
      supabase.from("class_updates").select("*").order("published_at", { ascending: false }),
      supabase.from("class_update_reads").select("update_id").eq("student_user_id", userId),
    ]);
    setUpdates((uRes.data ?? []) as ClassUpdate[]);
    setReads(new Set(((rRes.data ?? []) as { update_id: string }[]).map((r) => r.update_id)));
    setLoading(false);
  };

  useEffect(() => {
    if (userId) load();
  }, [userId]);

  const markRead = async (id: string) => {
    if (reads.has(id)) return;
    setReads((prev) => new Set(prev).add(id));
    await supabase
      .from("class_update_reads")
      .upsert({ update_id: id, student_user_id: userId }, { onConflict: "update_id,student_user_id" });
  };

  const subjects = useMemo(
    () => Array.from(new Set(updates.map((u) => u.subject).filter(Boolean))),
    [updates],
  );
  const batches = useMemo(
    () => Array.from(new Set(updates.map((u) => u.batch).filter(Boolean))),
    [updates],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return updates.filter((u) => {
      if (fSubject !== "all" && u.subject !== fSubject) return false;
      if (fBatch !== "all" && u.batch !== fBatch) return false;
      if (fDate && u.published_at.slice(0, 10) !== fDate) return false;
      if (!term) return true;
      return (
        u.topic.toLowerCase().includes(term) ||
        u.subject.toLowerCase().includes(term) ||
        u.homework.toLowerCase().includes(term)
      );
    });
  }, [updates, q, fSubject, fBatch, fDate]);

  const unread = updates.filter((u) => !reads.has(u.id)).length;

  return (
    <div className="space-y-4 pb-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
            Class Updates
          </h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0 ? `${unread} new update${unread === 1 ? "" : "s"}` : "You're all caught up"}
          </p>
        </div>
        {unread > 0 && (
          <Badge className="rounded-full">{unread} new</Badge>
        )}
      </header>

      <Card className="rounded-2xl">
        <CardContent className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search updates..."
              className="pl-9 h-11"
            />
          </div>
          <Select value={fSubject} onValueChange={setFSubject}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Select value={fBatch} onValueChange={setFBatch}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Batch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                {batches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className="h-11" />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-10 text-center text-muted-foreground">
            No updates to show.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {filtered.map((u) => (
            <StudentUpdateCard key={u.id} update={u} isNew={!reads.has(u.id)} onOpen={() => markRead(u.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function StudentUpdateCard({
  update,
  isNew,
  onOpen,
}: {
  update: ClassUpdate;
  isNew: boolean;
  onOpen: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => {
    setExpanded((e) => !e);
    if (!expanded) onOpen();
  };
  return (
    <Card
      className={cn(
        "rounded-2xl overflow-hidden transition",
        isNew && "ring-2 ring-primary/40",
      )}
    >
      <CardContent className="p-4 sm:p-5 space-y-3">
        <button onClick={toggle} className="w-full text-left space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <PriorityBadge p={update.priority} />
              {isNew && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> NEW
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{fmtDate(update.published_at)}</span>
          </div>
          <h3 className="font-semibold text-base leading-tight">{update.subject}</h3>
          <p className="text-sm text-muted-foreground">{update.topic}</p>
        </button>

        {expanded && (
          <div className="space-y-3">
            {update.homework && (
              <div className="rounded-xl bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                <span className="font-medium text-xs text-muted-foreground block mb-1">HOMEWORK</span>
                {update.homework}
              </div>
            )}
            {update.notice && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <span className="font-medium text-xs block mb-1 flex items-center gap-1">
                  <Bell className="h-3 w-3" /> NOTICE
                </span>
                {update.notice}
              </div>
            )}
            {update.due_date && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" /> Submit by {fmtDate(update.due_date)}
              </p>
            )}
            {update.attachments?.length > 0 && <AttachmentList files={update.attachments} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
