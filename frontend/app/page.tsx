import { Suspense } from "react";
import Link from "next/link";
import BotDashboard from "@/components/bot-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Bot Management Dashboard</h1>
        <Link
          href="/api-docs"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          📚 Ver Documentación API
        </Link>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <BotDashboard />
      </Suspense>
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {[1, 2].map((i) => (
        <div key={i} className="border rounded-lg p-6 shadow-sm">
          <Skeleton className="h-8 w-40 mb-4" />
          <Skeleton className="h-6 w-24 mb-6" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
