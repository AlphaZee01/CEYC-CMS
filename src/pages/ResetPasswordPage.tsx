import { useState, useEffect, type FormEvent } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { supabase, supabaseConfigured, updateSupabasePassword } from "@/lib/supabase";
import { Btn, Input, Card } from "@/components/church/ui";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const legacyToken = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(!supabaseConfigured);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setRecoveryReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (supabaseConfigured) {
        await updateSupabasePassword(password);
      } else {
        await api("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ token: legacyToken, newPassword: password }),
        });
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (!supabaseConfigured && !legacyToken) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <p className="text-destructive">Invalid reset link.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-accent">Back to login</Link>
        </Card>
      </div>
    );
  }

  if (supabaseConfigured && !recoveryReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--sidebar-background))] p-4">
        <Card className="w-full max-w-md text-center">
          <p className="text-sm text-muted-foreground">Open the password reset link from your email to continue.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-accent">Back to login</Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--sidebar-background))] p-4">
      <Card className="w-full max-w-md">
        <h1 className="mb-4 text-xl font-bold text-primary">Reset Password</h1>
        {done ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Password updated. You can sign in now.</p>
            <Link to="/" className="mt-4 inline-block text-sm text-accent">Sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="New password" type="password" value={password} onChange={setPassword} />
            <Input label="Confirm password" type="password" value={confirm} onChange={setConfirm} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Btn type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Reset Password"}
            </Btn>
          </form>
        )}
      </Card>
    </div>
  );
}
