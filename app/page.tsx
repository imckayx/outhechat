import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Group Trip Planner
        </h1>
        <p className="mx-auto max-w-md text-base text-muted-foreground">
          Pick a window, share a link, see when everyone&apos;s free. No
          accounts, no calendar imports.
        </p>
      </div>
      <Link
        href="/trips/new"
        className={buttonVariants({ size: "lg" })}
      >
        Create a trip
      </Link>
    </main>
  );
}
