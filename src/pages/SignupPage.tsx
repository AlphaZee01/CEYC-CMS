import { useState, useEffect, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchPublicBranding, getCachedBranding } from "@/lib/branding";
import { Btn, Input } from "@/components/church/ui";
import { ChurchBrand } from "@/components/church/ChurchBrand";
import { publicApi } from "@/lib/api";
import { authLog, authLogError } from "@/lib/auth-log";
import { getAuthMode } from "@/lib/auth-mode";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, user, loading: authLoading } = useAuth();
  const [branding, setBranding] = useState(getCachedBranding);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [allowSignup, setAllowSignup] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    authLog("SignupPage mount", `mode=${getAuthMode()}`);
    fetchPublicBranding().then(setBranding).catch(() => {});
    publicApi<{ allowSignup?: boolean }>("/public/config")
      .then((c) => {
        const allowed = c.allowSignup !== false;
        setAllowSignup(allowed);
        authLog("SignupPage config", `allowSignup=${allowed}`);
      })
      .catch((err) => {
        authLogError("SignupPage config", err);
        setAllowSignup(true);
      })
      .finally(() => setConfigLoading(false));
  }, []);

  if (user) return <Navigate to="/app" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const fullName = name.trim();
    const emailNorm = email.trim().toLowerCase();
    authLog("SignupPage submit", `authLoading=${authLoading} mode=${getAuthMode()} email=${emailNorm}`);

    if (!fullName) {
      setError("Please enter your full name");
      return;
    }
    if (!emailNorm) {
      setError("Please enter your email address");
      return;
    }
    if (!EMAIL_RE.test(emailNorm)) {
      setError("Enter a valid email address");
      return;
    }
    if (password !== confirm) {
      authLog("SignupPage submit", "validation failed: passwords do not match");
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      authLog("SignupPage submit", "validation failed: password too short");
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await signup(fullName, emailNorm, password, phone.trim() || undefined);
      authLog("SignupPage submit", "success → redirect");
      toast.success("Account created — welcome!");
      navigate("/app", { replace: true });
    } catch (err) {
      authLogError("SignupPage submit", err);
      const message = err instanceof Error ? err.message : "Signup failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      authLog("SignupPage submit", "button loading=false");
    }
  };

  return (
    <div className="flex min-h-[100dvh] min-h-[100svh] overflow-x-hidden bg-background px-safe">
      <div className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_55%)]" />
        <div className="relative">
          <ChurchBrand
            name={branding.name}
            logoUrl={branding.logoUrl}
            tagline={branding.tagline}
            size="lg"
            theme="header"
            layout="stacked"
            className="items-start text-left [&_p]:text-left [&_p]:text-white [&_p]:opacity-90"
          />
        </div>
        <div className="relative space-y-4">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-balance">Join your church community</h2>
          <p className="max-w-sm text-sm leading-relaxed text-primary-foreground/80">
            Create an account to access announcements, media, prayer, and more.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 pb-safe sm:px-6">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <ChurchBrand
              name={branding.name}
              logoUrl={branding.logoUrl}
              tagline={branding.tagline}
              size="lg"
              layout="stacked"
            />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Create account</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Register as a church member to get started.</p>
          </div>

          {configLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !allowSignup ? (
            <div className="space-y-4 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              <p>Self-registration is not open. Please contact your church office for an account.</p>
              <Link to="/" className="inline-flex font-medium text-primary hover:text-primary/80">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Input label="Full name" value={name} onChange={setName} placeholder="Your name" />
              <Input label="Email address" value={email} onChange={setEmail} type="email" placeholder="you@church.org" />
              <Input label="Phone (optional)" value={phone} onChange={setPhone} type="tel" placeholder="+233 …" />
              <Input label="Password" value={password} onChange={setPassword} type="password" placeholder="At least 8 characters" />
              <Input label="Confirm password" value={confirm} onChange={setConfirm} type="password" placeholder="••••••••" />
              {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              <Btn type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {loading ? "Creating account…" : "Sign up"}
              </Btn>
              {authLoading && !loading && (
                <p className="text-center text-xs text-muted-foreground">Checking connection…</p>
              )}
            </form>
          )}

          {allowSignup && !configLoading && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/" className="font-medium text-primary transition hover:text-primary/80">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
