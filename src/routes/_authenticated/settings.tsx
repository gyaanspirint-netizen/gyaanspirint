import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Gyanspirint" }] }),
  component: SettingsPage,
});

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
};

type StudentInfo = {
  name: string;
  batch: string;
  cuid: string;
  student_phone: string;
  parent_phone: string;
  admission_date: string;
};

function SettingsPage() {
  const { user, role } = useAuth();
  const isStudent = role === "student";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [student, setStudent] = useState<StudentInfo | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (p) {
        setProfile(p as Profile);
        setFullName(p.full_name ?? "");
        setPhone(p.phone ?? "");
        setAvatarUrl(p.avatar_url ?? "");
      }
      if (role === "student") {
        const { data: s } = await supabase
          .from("students")
          .select("name, batch, cuid, student_phone, parent_phone, admission_date")
          .eq("user_id", user.id)
          .maybeSingle();
        if (s) setStudent(s as StudentInfo);
      }
      setLoading(false);
    })();
  }, [user, role]);

  const saveProfile = async () => {
    if (!user) return;
    if (!fullName.trim()) return toast.error("Name is required");
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    setProfile((prev) =>
      prev ? { ...prev, full_name: fullName.trim(), phone: phone.trim() || null, avatar_url: avatarUrl.trim() || null } : prev,
    );
  };

  const initials = (fullName || profile?.email || "U")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile photo and personal details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Profile
          </CardTitle>
          <CardDescription>
            Update your display name, phone, and profile photo. Email cannot be changed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl || undefined} alt={fullName} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Label htmlFor="avatar">Profile photo URL</Label>
              <Input
                id="avatar"
                placeholder="https://example.com/photo.jpg"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Paste a public image link. Tip: upload your photo to a free image host and paste the URL here.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 …"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div>
                <Badge variant="secondary">{role ?? "—"}</Badge>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {isStudent && student && (
        <Card>
          <CardHeader>
            <CardTitle>Enrollment details</CardTitle>
            <CardDescription>
              These details are managed by your admin and cannot be edited here. Contact your institute to make changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Student name (on record)" value={student.name} />
            <ReadOnlyField label="CUID" value={student.cuid} />
            <ReadOnlyField label="Batch(es)" value={student.batch} />
            <ReadOnlyField label="Admission date" value={student.admission_date} />
            <ReadOnlyField label="Student phone (on record)" value={student.student_phone} />
            <ReadOnlyField label="Parent phone" value={student.parent_phone} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">{value || "—"}</div>
    </div>
  );
}
