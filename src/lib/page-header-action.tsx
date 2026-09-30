import type { ReactNode } from "react";
import { PageRefreshIndicator } from "@/components/church/PageRefreshIndicator";

/** Show background refresh spinner beside optional page actions. */
export function mergePageHeaderAction(refreshing: boolean, action?: ReactNode): ReactNode | undefined {
  if (!refreshing && !action) return undefined;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {refreshing && <PageRefreshIndicator />}
      {action}
    </div>
  );
}
