import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { BrandVoiceManager } from "./_components/BrandVoiceManager";

export default async function BrandVoicePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: voices } = await supabase
    .from("brand_voices")
    .select(
      "id, user_id, name, samples, description, is_default, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Brand Voice"
        description="Named profiles with writing samples — your default voice steers every Studio generate."
      />

      <BrandVoiceManager initialVoices={voices ?? []} />
    </div>
  );
}
