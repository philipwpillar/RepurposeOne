import { redirect } from "next/navigation";
import {
  DashboardShell,
  type DashboardUser,
} from "./_components/dashboard-shell";
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

  const { usage } = await checkUsageLimit(supabase, user.id);

  const dashboardUser: DashboardUser = {
    email: user.email,
    name: getDisplayName(user.user_metadata, user.email),
    avatarUrl:
      typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : undefined,
  };

  return (
    <DashboardShell user={dashboardUser} usage={usage}>
      {children}
    </DashboardShell>
  );
}
