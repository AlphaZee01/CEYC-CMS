import { useState, type FormEvent } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Btn, Input, Card } from "@/components/church/ui";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

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
      await api("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: password }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <p className="text-destructive">Invalid reset link.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-[hsl(174,55%,42%)]">Back to login</Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(262,52%,22%)] p-4">
      <Card className="w-full max-w-md">
        <h1 className="mb-4 text-xl font-bold text-[hsl(262,52%,32%)]">Reset Password</h1>
        {done ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Password updated. You can sign in now.</p>
            <Link to="/" className="mt-4 inline-block text-sm text-[hsl(174,55%,42%)]">Sign in</Link>
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
