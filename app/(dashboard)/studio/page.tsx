import { createClient } from "@/lib/supabase/server";
import { checkUsageLimit } from "@/lib/usage";
import RepurposeWorkspace from "./_components/RepurposeWorkspace";

export default async function StudioPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ usage }, { data: voices }] = await Promise.all([
    checkUsageLimit(supabase, user.id),
    supabase
      .from("brand_voices")
      .select("id, samples, description, is_default")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const defaultVoice = voices?.[0] ?? null;

  return (
    <RepurposeWorkspace
      repurposesUsed={usage.used}
      repurposesLimit={usage.limit}
      brandVoice={defaultVoice}
    />
  );
}
