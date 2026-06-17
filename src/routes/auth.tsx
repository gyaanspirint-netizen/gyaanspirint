import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { studentLoginLookup } from "@/lib/students.functions";
import { registerInstitute } from "@/lib/institutes.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap, CheckCircle2 } from "lucide-react";
import logoAsset from "@/assets/gyanspirint-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Sign in — Gyanspirint" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const lookupFn = useServerFn(studentLoginLookup);
  const registerFn = useServerFn(registerInstitute);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [cuid, setCuid] = useState("");
  const [studentPhone, setStudentPhone] = useState("");

  // Institute registration fields
  const [instName, setInstName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [instEmail, setInstEmail] = useState("");
  const [city, setCity] = useState("");
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/dashboard", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await registerFn({
        data: {
          name: instName,
          ownerName,
          mobile,
          email: instEmail,
          city,
        },
      });
      setRegistered(true);
      setInstName("");
      setOwnerName("");
      setMobile("");
      setInstEmail("");
      setCity("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
  };

  const handleStudentSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const creds = await lookupFn({ data: { cuid, phone: studentPhone } });
      const { error } = await supabase.auth.signInWithPassword({
        email: creds.email,
        password: creds.password,
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error("Google sign-in failed");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <img
            src={logoAsset.url}
            alt="Gyanspirint"
            className="h-12 w-12 rounded-lg object-contain bg-white shadow-md"
          />
          <span className="text-lg font-semibold tracking-tight">Gyanspirint</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Students sign in with CUID and phone. Institutes register and sign in with email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="student">Student</TabsTrigger>
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register Institute</TabsTrigger>
              </TabsList>

              <TabsContent value="student">
                <form onSubmit={handleStudentSignIn} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="cuid">CUID</Label>
                    <Input id="cuid" value={cuid} onChange={(e) => setCuid(e.target.value)} placeholder="e.g. JOH482917" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student-phone">Phone</Label>
                    <Input id="student-phone" type="tel" value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign in as student"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">Don't have a CUID? Ask your admin.</p>
                </form>
              </TabsContent>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <div className="flex justify-between items-center">
                    <Link to="/activate" className="text-xs text-primary hover:underline">
                      Have an activation code?
                    </Link>
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                {registered ? (
                  <div className="mt-4 space-y-4 text-center py-4">
                    <div className="flex justify-center">
                      <CheckCircle2 className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="font-semibold">Registration submitted</h3>
                    <p className="text-sm text-muted-foreground">
                      Your registration request has been submitted successfully. Your account will be
                      activated after approval by the platform administrator. You'll receive an email
                      with a password setup link once approved.
                    </p>
                    <Button variant="outline" onClick={() => setRegistered(false)} className="w-full">
                      Register another
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-3 mt-4">
                    <p className="text-xs text-muted-foreground">
                      Register your institute. After approval by the platform administrator, you'll receive
                      a password setup link by email.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="inst-name">Institute Name</Label>
                      <Input id="inst-name" value={instName} onChange={(e) => setInstName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="owner-name">Owner Name</Label>
                      <Input id="owner-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile Number</Label>
                      <Input id="mobile" type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inst-email">Email Address</Label>
                      <Input id="inst-email" type="email" value={instEmail} onChange={(e) => setInstEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Submitting..." : "Submit registration"}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogle}>
              Continue with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
