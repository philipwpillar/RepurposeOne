import { createClient } from "@/lib/supabase/server";
import { checkUsageLimit } from "@/lib/usage";
import { NewRepurposeForm } from "@/components/repurpose/new-repurpose-form";

export default async function NewRepurposePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { usage } = await checkUsageLimit(supabase, user.id);

  return <NewRepurposeForm initialUsage={usage} />;
}
