import { Suspense } from "react"
import BotDashboard from "@/components/bot-dashboard"
import { Skeleton } from "@/components/ui/skeleton"

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Bot Management Dashboard</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <BotDashboard />
      </Suspense>
    </main>
  )
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
  )
}

