import { redirect } from "next/navigation";
import { Suspense } from "react";

import { signOutAction } from "@/features/auth/actions";
import { SIGN_IN_PATH } from "@/lib/auth/callback-url";
import { auth } from "@/server/auth";

// The overview dashboard replaces this page in Phase 4; the app shell arrives in Phase 3.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Bank Analytics Dashboard</h1>
      <Suspense fallback={<p className="opacity-70">Loading your session…</p>}>
        <SessionPanel />
      </Suspense>
    </main>
  );
}

async function SessionPanel() {
  const session = await auth();
  // The proxy normally handles this; checking again keeps the page safe on its own.
  if (!session?.user) redirect(SIGN_IN_PATH);
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="opacity-70">
        Signed in as <span className="font-medium">{session.user.name ?? session.user.email}</span>.
        The dashboard is built phase by phase; see docs/DECISIONS.md.
      </p>
      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
