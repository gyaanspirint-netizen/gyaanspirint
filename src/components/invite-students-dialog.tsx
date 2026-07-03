import { useEffect, useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getInviteSettings,
  updateInviteSettings,
  rotateInviteToken,
} from "@/lib/registration.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Copy,
  Share2,
  RefreshCw,
  Download,
  FileText,
  Loader2,
  QrCode,
  Link2,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";

type Settings = {
  registration_enabled: boolean;
  require_approval: boolean;
  auto_generate_id: boolean;
  auto_generate_password: boolean;
  registration_token: string | null;
};

export function InviteStudentsDialog({
  open,
  onOpenChange,
  instituteName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  instituteName?: string;
}) {
  const getFn = useServerFn(getInviteSettings);
  const updateFn = useServerFn(updateInviteSettings);
  const rotateFn = useServerFn(rotateInviteToken);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getFn()
      .then((s) => setSettings(s as Settings))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [open]);

  const link =
    settings?.registration_token && typeof window !== "undefined"
      ? `${window.location.origin}/register/${settings.registration_token}`
      : "";

  const qrUrl = link
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(link)}`
    : "";

  async function toggle(key: keyof Settings, value: boolean) {
    if (!settings) return;
    const next = { ...settings, [key]: value };
    setSettings(next);
    try {
      await updateFn({
        data: {
          registration_enabled: next.registration_enabled,
          require_approval: next.require_approval,
          auto_generate_id: next.auto_generate_id,
          auto_generate_password: next.auto_generate_password,
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
      setSettings(settings);
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("Link copied");
  }

  function shareWhatsApp() {
    if (!link) return;
    const text = `Register at ${instituteName ?? "our institute"}: ${link}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function rotate() {
    if (!confirm("Generate a new link? The old link will stop working."))
      return;
    try {
      const res = await rotateFn();
      setSettings((s) => (s ? { ...s, registration_token: res.registration_token } : s));
      toast.success("New link generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function downloadQR() {
    if (!qrUrl) return;
    const res = await fetch(qrUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "registration-qr.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPoster() {
    if (!qrUrl || !link) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = qrUrl;
    await new Promise((r, rej) => {
      img.onload = r;
      img.onerror = rej;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 1100;
    const ctx = canvas.getContext("2d")!;
    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, "#1e293b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 48px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Admissions Open", canvas.width / 2, 120);
    ctx.font = "28px system-ui, sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(instituteName ?? "Join Our Institute", canvas.width / 2, 175);
    // QR white card
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    const x = 150,
      y = 240,
      w = 500,
      h = 500,
      r = 24;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.drawImage(img, x + 100, y + 100, 300, 300);
    // Footer
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px system-ui, sans-serif";
    ctx.fillText("Scan to Register", canvas.width / 2, 820);
    ctx.font = "22px system-ui, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("or visit the link below", canvas.width / 2, 860);
    ctx.font = "18px monospace";
    ctx.fillStyle = "#e2e8f0";
    const shortLink = link.length > 60 ? link.slice(0, 57) + "..." : link;
    ctx.fillText(shortLink, canvas.width / 2, 920);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "admission-poster.png";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" /> Invite Students
          </DialogTitle>
          <DialogDescription>
            Share a link or QR code. Registrations appear in the "Pending" tab.
          </DialogDescription>
        </DialogHeader>

        {loading || !settings ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Registration link */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Link2 className="h-4 w-4" /> Registration Link
              </div>
              <div className="flex gap-2">
                <Input readOnly value={link} className="font-mono text-xs" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={copy} className="h-10">
                  <Copy className="h-4 w-4 mr-1" /> Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={shareWhatsApp}
                  className="h-10"
                >
                  <Share2 className="h-4 w-4 mr-1" /> WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={rotate}
                  className="h-10"
                >
                  <RefreshCw className="h-4 w-4 mr-1" /> New Link
                </Button>
              </div>
            </section>

            <Separator />

            {/* QR */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <QrCode className="h-4 w-4" /> QR Code
              </div>
              <div className="flex justify-center rounded-xl border bg-muted/30 p-4">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="Registration QR"
                    className="w-48 h-48 rounded-md bg-white p-2"
                  />
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadQR}
                  className="h-10"
                >
                  <Download className="h-4 w-4 mr-1" /> Download QR
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadPoster}
                  className="h-10"
                >
                  <FileText className="h-4 w-4 mr-1" /> Poster
                </Button>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </section>

            <Separator />

            {/* Settings */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Settings2 className="h-4 w-4" /> Registration Settings
              </div>
              <div className="space-y-3 rounded-xl border p-4">
                <SettingRow
                  label="Enable Registration"
                  hint="Allow students to sign up via the link"
                  checked={settings.registration_enabled}
                  onChange={(v) => toggle("registration_enabled", v)}
                />
                <SettingRow
                  label="Require Admin Approval"
                  hint="Review each registration before enrollment"
                  checked={settings.require_approval}
                  onChange={(v) => toggle("require_approval", v)}
                />
                <SettingRow
                  label="Auto Generate Student ID"
                  hint="Create a unique CUID automatically"
                  checked={settings.auto_generate_id}
                  onChange={(v) => toggle("auto_generate_id", v)}
                />
                <SettingRow
                  label="Auto Generate Password"
                  hint="Use student phone as initial password"
                  checked={settings.auto_generate_password}
                  onChange={(v) => toggle("auto_generate_password", v)}
                />
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SettingRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
