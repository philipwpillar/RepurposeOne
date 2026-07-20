import { createClient } from "@/lib/supabase/server";
import { checkUsageLimit } from "@/lib/usage";
import { STUDIO_EXAMPLE_INPUT } from "@/lib/repurpose/studio-example";
import RepurposeWorkspace from "./_components/RepurposeWorkspace";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ example?: string }>;
}) {
  const { example } = await searchParams;
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
  const initialInput = example === "1" ? STUDIO_EXAMPLE_INPUT : "";

  return (
    <RepurposeWorkspace
      initialInput={initialInput}
      repurposesUsed={usage.used}
      repurposesLimit={usage.limit}
      userPlan={usage.plan}
      brandVoice={defaultVoice}
    />
  );
}
