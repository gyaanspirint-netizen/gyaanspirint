import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getTeacherProfile, updateTeacherProfile } from "@/lib/teacher-portal.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/teacher/profile")({
  head: () => ({ meta: [{ title: "My Profile — Gyanspirint" }] }),
  component: TeacherProfile,
});

function TeacherProfile() {
  const getFn = useServerFn(getTeacherProfile);
  const updFn = useServerFn(updateTeacherProfile);
  const [p, setP] = useState<any | null>(null);
  const [email, setEmail] = useState("");
  const [q, setQ] = useState("");
  const [ex, setEx] = useState("");
  const [photo, setPhoto] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  useEffect(() => { getFn().then((d: any) => { if (d) { setP(d); setEmail(d.email ?? ""); setQ(d.qualification ?? ""); setEx(d.experience ?? ""); setPhoto(d.photo_url ?? ""); } }); }, [getFn]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updFn({ data: { email: email || null, qualification: q || null, experience: ex || null, photo_url: photo || null } });
      toast.success("Profile updated");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) { toast.error("Passwords do not match"); return; }
    if (pw.length < 8) { toast.error("Min 8 characters"); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setPw(""); setPw2(""); }
  };

  if (!p) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">My Profile</h1>
        <p className="text-sm text-muted-foreground">Update your details and password.</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><div className="text-xs text-muted-foreground">Teacher ID</div><div className="font-mono">{p.teacher_code}</div></div>
            <div><div className="text-xs text-muted-foreground">Mobile</div><div>{p.mobile}</div></div>
          </div>
          <p className="text-xs text-muted-foreground">Teacher ID and mobile number cannot be changed. Ask your admin if these need updating.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-3">
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label>Photo URL</Label><Input value={photo} onChange={(e) => setPhoto(e.target.value)} placeholder="https://…" /></div>
            <div className="space-y-2"><Label>Qualification</Label><Input value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="space-y-2"><Label>Experience</Label><Input value={ex} onChange={(e) => setEx(e.target.value)} /></div>
            <Button type="submit">Save changes</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Change password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={changePw} className="space-y-3">
            <div className="space-y-2"><Label>New password</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Confirm</Label><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required /></div>
            <Button type="submit">Update password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
