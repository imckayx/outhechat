import type { Metadata } from "next";

import { CreateTripForm } from "./create-trip-form";

export const metadata: Metadata = {
  title: "Create a trip — Group Trip Planner",
};

export default function NewTripPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Create a trip
        </h1>
        <p className="text-sm text-muted-foreground">
          Set the basics, then send the share link to your group. Members
          mark dates they can&apos;t make it — you&apos;ll see the best
          windows for everyone.
        </p>
      </header>
      <CreateTripForm />
    </main>
  );
}
