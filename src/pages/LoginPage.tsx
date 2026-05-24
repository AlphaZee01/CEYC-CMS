import { useState, type FormEvent } from "react";
import { Church } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { resetPasswordForEmail, supabaseConfigured } from "@/lib/supabase";
import { Btn, Input, Card, IconBox } from "@/components/church/ui";

export default function LoginPage() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState("pastor@celcm.org");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetInfo, setResetInfo] = useState("");

  if (user) return <Navigate to="/app" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      window.location.href = "/app";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setResetInfo("");
    setLoading(true);
    try {
      if (supabaseConfigured) {
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
    <div className="flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--sidebar-background))] p-4 pb-safe">
      <Card className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <IconBox icon={Church} tone="blue" size="lg" variant="solid" className="mb-3 h-14 w-14 rounded-xl" />
          <h1 className="text-xl font-bold text-primary">Christ Embassy LCM</h1>
          <p className="text-sm text-muted-foreground">Local Church Management System</p>
          {supabaseConfigured && (
            <p className="mt-1 text-xs text-accent">Secured with Supabase Auth</p>
          )}
        </div>
        {forgotMode ? (
          <form onSubmit={handleForgot} className="space-y-4">
            <Input label="Email" value={email} onChange={setEmail} type="email" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            {resetInfo && <p className="text-sm text-accent">{resetInfo}</p>}
            <Btn type="submit" className="w-full" disabled={loading}>{loading ? "Sending..." : "Send Reset Link"}</Btn>
            <button type="button" className="w-full text-sm text-muted-foreground hover:underline" onClick={() => setForgotMode(false)}>Back to sign in</button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" value={email} onChange={setEmail} type="email" />
            <Input label="Password" value={password} onChange={setPassword} type="password" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Btn type="submit" className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</Btn>
            <button type="button" className="w-full text-sm text-accent hover:underline" onClick={() => setForgotMode(true)}>Forgot password?</button>
          </form>
        )}
        <p className="mt-4 text-center text-xs text-muted-foreground">Default: pastor@celcm.org / ChangeMe123!</p>
      </Card>
    </div>
  );
}
