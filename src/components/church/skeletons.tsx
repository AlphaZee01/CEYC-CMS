import { Skeleton } from "@/components/ui/skeleton";
import { Card, cn } from "@/components/church/ui";

export function StatCardsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", count > 4 && "xl:grid-cols-6", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="flex items-start justify-between gap-2 p-3 sm:p-5">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-16 sm:w-20" />
            <Skeleton className="h-7 w-12 sm:h-8 sm:w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl sm:h-10 sm:w-10" />
        </Card>
      ))}
    </div>
  );
}

export function DashboardSectionSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-8 w-24" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full max-w-md" />
        ))}
      </div>
    </Card>
  );
}

export function DashboardSkeleton({ pastoral = false }: { pastoral?: boolean }) {
  return (
    <div className="space-y-6">
      <StatCardsSkeleton count={pastoral ? 6 : 4} />
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <DashboardSectionSkeleton lines={3} />
          <DashboardSectionSkeleton lines={2} />
        </div>
        <DashboardSectionSkeleton lines={5} />
        <DashboardSectionSkeleton lines={4} />
        <DashboardSectionSkeleton lines={3} />
        {pastoral && <DashboardSectionSkeleton lines={2} />}
      </div>
    </div>
  );
}

export function MemberListSkeleton() {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card className="hidden overflow-hidden md:block">
        <div className="border-b border-border p-4">
          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-4 flex-[2]" />
            <Skeleton className="h-4 flex-[2]" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        ))}
      </Card>
    </>
  );
}

export function GenericPageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Skeleton className="mb-3 h-10 w-full max-w-md rounded-lg" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </Card>
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full max-w-sm" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ChatListSkeleton() {
  return (
    <div className="divide-y">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex justify-between gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-full max-w-[12rem]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatThreadSkeleton() {
  return (
    <div className="space-y-3 px-3 py-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
          <Skeleton
            className={cn(
              "rounded-2xl",
              i % 2 === 0 ? "h-14 w-[70%] rounded-bl-md" : "h-10 w-[55%] rounded-br-md"
            )}
          />
        </div>
      ))}
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="flex min-h-[100dvh] bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-[hsl(var(--sidebar-background))] p-4 lg:flex">
        <div className="mb-6 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg bg-white/10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24 bg-white/10" />
            <Skeleton className="h-3 w-32 bg-white/10" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
              <Skeleton className="h-8 w-8 rounded-lg bg-white/10" />
              <Skeleton className="h-4 flex-1 bg-white/10" />
            </div>
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b bg-gradient-to-r from-[hsl(var(--sidebar-accent))] to-[hsl(var(--sidebar-primary))] px-4 py-3 pt-safe sm:px-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-2xl bg-white/15" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32 bg-white/15" />
              <Skeleton className="h-3 w-24 bg-white/10" />
            </div>
            <Skeleton className="h-10 w-10 rounded-xl bg-white/10" />
            <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-start gap-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <DashboardSkeleton pastoral />
        </main>
      </div>
    </div>
  );
}
