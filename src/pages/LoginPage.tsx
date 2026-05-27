import { useState, useEffect, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { resetPasswordForEmail } from "@/lib/supabase";
import { useSupabaseForAuth } from "@/lib/auth-mode";
import { fetchPublicBranding, getCachedBranding } from "@/lib/branding";
import { Btn, Input } from "@/components/church/ui";
import { ChurchBrand } from "@/components/church/ChurchBrand";

export default function LoginPage() {
  const { login, user } = useAuth();
  const [branding, setBranding] = useState(getCachedBranding);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetInfo, setResetInfo] = useState("");

  useEffect(() => {
    fetchPublicBranding().then(setBranding).catch(() => {});
  }, []);

  if (user) return <Navigate to="/app" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setResetInfo("");
    setLoading(true);
    try {
      if (useSupabaseForAuth()) {
        await resetPasswordForEmail(email);
        setResetInfo("Password reset email sent. Check your inbox and follow the link.");
      } else {
        const res = await api<{ message: string; resetToken?: string }>(
          "/auth/forgot-password",
          { method: "POST", body: JSON.stringify({ email }) }
        );
        let msg = res.message;
        if (res.resetToken) {
          msg += ` Dev token: ${res.resetToken} — open /reset-password?token=${res.resetToken}`;
        }
        setResetInfo(msg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] min-h-[100svh] overflow-x-hidden bg-background px-safe">
      {/* Brand panel — desktop */}
      <div className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_55%)]" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
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
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-balance">
            Manage your church with clarity and care
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-primary-foreground/80">
            Members, attendance, finances, communications, and ministry tools — all in one place.
          </p>
        </div>
      </div>

      {/* Form panel */}
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {forgotMode ? "Reset password" : "Sign in"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {forgotMode
                ? "Enter your email and we'll send you a reset link."
                : "Enter your credentials to access the dashboard."}
            </p>
          </div>

          {forgotMode ? (
            <form onSubmit={handleForgot} className="space-y-5">
              <Input label="Email address" value={email} onChange={setEmail} type="email" placeholder="you@church.org" />
              {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              {resetInfo && <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary">{resetInfo}</p>}
              <Btn type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? "Sending..." : "Send reset link"}
              </Btn>
              <button
                type="button"
                className="w-full text-sm font-medium text-muted-foreground transition hover:text-foreground"
                onClick={() => setForgotMode(false)}
              >
                Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input label="Email address" value={email} onChange={setEmail} type="email" placeholder="pastor@celcm.org" />
              <Input label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
              {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              <Btn type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {loading ? "Signing in..." : "Continue"}
              </Btn>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  className="font-medium text-primary transition hover:text-primary/80"
                  onClick={() => setForgotMode(true)}
                >
                  Forgot password?
                </button>
              </div>
            </form>
          )}

          {!forgotMode && (
            <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Demo access</p>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> pastor@celcm.org</p>
                <p className="flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> ChangeMe123!</p>
              </div>
            </div>
          )}

          {useSupabaseForAuth() && (
            <p className="mt-6 text-center text-xs text-muted-foreground">Secured with Supabase Auth</p>
          )}
        </div>
      </div>
    </div>
  );
}
