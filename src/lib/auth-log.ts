export const authDebugEnabled = import.meta.env.DEV;

let traceStart = 0;

function consoleLine(step: string, ms: number, detail?: string, error = false) {
  if (!authDebugEnabled) return;
  const tag = error ? "error" : "log";
  const suffix = detail ? ` — ${detail}` : "";
  console[tag](`[sign-in +${ms}ms] ${step}${suffix}`);
}

export function authLogStart(label = "Sign-in started") {
  traceStart = performance.now();
  consoleLine(label, 0);
}

export function authLog(step: string, detail?: string) {
  consoleLine(step, Math.round(performance.now() - traceStart), detail);
}

export function authLogError(step: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  consoleLine(step, Math.round(performance.now() - traceStart), message, true);
}

export async function authLogTimed<T>(step: string, fn: () => Promise<T>, detail?: string): Promise<T> {
  authLog(step, detail);
  const start = performance.now();
  try {
    const result = await fn();
    authLog(`${step} done`, `${Math.round(performance.now() - start)}ms`);
    return result;
  } catch (err) {
    authLogError(`${step} failed`, err);
    throw err;
  }
}
