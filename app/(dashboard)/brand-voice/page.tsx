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
      "id, user_id, name, samples, description, voice_range, is_default, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Brand Voice"
        description="Your samples stay the ground truth. Voiceora learns from how you edit, then rewrites each piece in your voice - without ever overriding those samples."
      />

      <BrandVoiceManager initialVoices={voices ?? []} />
    </div>
  );
}
