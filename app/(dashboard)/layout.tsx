import { redirect } from "next/navigation";
import {
  DashboardShell,
  type DashboardUser,
} from "./_components/dashboard-shell";
import { ShortcutProvider } from "@/components/shortcut-provider";
import { CommandPalette } from "@/components/command-palette";
import { createClient } from "@/lib/supabase/server";
import { checkUsageLimit } from "@/lib/usage";

function getDisplayName(metadata: Record<string, unknown> | undefined, email: string | undefined) {
  const fullName = metadata?.full_name ?? metadata?.name;
  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  if (email) {
    return email.split("@")[0] ?? "User";
  }

  return "User";
}

export default async function DashboardLayout({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at, payment_failed_at")
    .eq("id", user.id)
    .single();

  if (profile && !profile.onboarding_completed_at) {
    redirect("/onboarding");
  }

  const { usage } = await checkUsageLimit(supabase, user.id);

  const dashboardUser: DashboardUser = {
    email: user.email,
    name: getDisplayName(user.user_metadata, user.email),
    avatarUrl:
      typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : undefined,
  };

  const paymentFailed = Boolean(profile?.payment_failed_at);

  return (
    <ShortcutProvider>
      <DashboardShell
        user={dashboardUser}
        usage={usage}
        paymentFailed={paymentFailed}
      >
        {children}
      </DashboardShell>
      <CommandPalette />
    </ShortcutProvider>
  );
}
