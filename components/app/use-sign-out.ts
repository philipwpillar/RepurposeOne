"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Shared sign-out used by SignOutButton and AccountMenu. */
export function useSignOut() {
  const router = useRouter();

  return async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  };
}
