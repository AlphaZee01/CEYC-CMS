import { useState, type FormEvent } from "react";
import { Church } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Btn, Input, Card } from "@/components/church/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("pastor@celcm.org");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(262,52%,22%)] p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-[hsl(262,52%,32%)] text-white">
            <Church className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-[hsl(262,52%,32%)]">Christ Embassy LCM</h1>
          <p className="text-sm text-muted-foreground">Local Church Management System</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" value={email} onChange={setEmail} type="email" />
          <Input label="Password" value={password} onChange={setPassword} type="password" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Btn type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Btn>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Default: pastor@celcm.org / ChangeMe123!
        </p>
      </Card>
    </div>
  );
}
