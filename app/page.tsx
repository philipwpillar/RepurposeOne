import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="text-lg font-bold tracking-tight">RepurposeOne</span>
        <div className="flex gap-2">
          {user ? (
            <Button asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          One piece of content. Every platform. Your voice.
        </h1>
        <p className="max-w-lg text-lg text-muted-foreground">
          RepurposeOne turns long-form content into platform-native outputs —
          starting with X/Twitter threads that sound like you wrote them.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {user ? (
            <Button asChild size="lg">
              <Link href="/new">Create a repurpose</Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link href="/sign-up">Start free</Link>
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
