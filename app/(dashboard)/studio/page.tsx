import { createClient } from "@/lib/supabase/server";
import { checkUsageLimit } from "@/lib/usage";
import RepurposeWorkspace from "./_components/RepurposeWorkspace";

export default async function StudioPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { usage } = await checkUsageLimit(supabase, user.id);

  return (
    <RepurposeWorkspace
      repurposesUsed={usage.used}
      repurposesLimit={usage.limit}
    />
  );
}
