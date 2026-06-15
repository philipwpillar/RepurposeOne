import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { createClient } from "@/lib/supabase/server";
import { checkUsageLimit } from "@/lib/usage";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { usage } = await checkUsageLimit(supabase, user.id);

  return <AppShell usage={usage}>{children}</AppShell>;
}
