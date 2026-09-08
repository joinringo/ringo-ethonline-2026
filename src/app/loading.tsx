import { StatsSkeleton } from "@/components/stats";

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-5 pt-12 pb-4 sm:px-6 sm:pt-16">
      <StatsSkeleton />
    </main>
  );
}
