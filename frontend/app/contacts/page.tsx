import { Suspense } from "react";
import Link from "next/link";
import ContactMappingDashboard from "@/components/contact-mapping-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContactsPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Contact Mappings</h1>
          <p className="text-gray-600 mt-2">
            Gestiona los mapeos entre IDs externos y números de teléfono
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
          >
            ← Dashboard
          </Link>
          <Link
            href="/api-docs"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            📚 API Docs
          </Link>
        </div>
      </div>
      <Suspense fallback={<ContactMappingsSkeleton />}>
        <ContactMappingDashboard />
      </Suspense>
    </main>
  );
}

function ContactMappingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-6 shadow-sm">
            <Skeleton className="h-6 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="border rounded-lg p-6 shadow-sm">
        <Skeleton className="h-8 w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}