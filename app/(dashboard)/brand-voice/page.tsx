import { createClient } from "@/lib/supabase/server";
import { BrandVoiceManager } from "./_components/BrandVoiceManager";

export default async function BrandVoicePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: voices } = await supabase
    .from("brand_voices")
    .select("id, user_id, samples, description, is_default, created_at")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Brand Voice</h1>
        <p className="text-muted-foreground">
          Learn your writing style from 2–3 samples and apply it consistently
          across every output.
        </p>
      </div>

      <BrandVoiceManager initialVoices={voices ?? []} />
    </div>
  );
}
