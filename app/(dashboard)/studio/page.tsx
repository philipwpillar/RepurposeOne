import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { checkUsageLimit } from "@/lib/usage";
import { STUDIO_EXAMPLE_INPUT, getStudioTemplate } from "@/lib/repurpose/templates";
import { isNativeRequest } from "@/lib/native-request";
import RepurposeWorkspace from "./_components/RepurposeWorkspace";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ example?: string; reuse?: string; template?: string }>;
}) {
  const { example, reuse, template } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ usage }, { data: voices }] = await Promise.all([
    checkUsageLimit(supabase, user.id),
    supabase
      .from("brand_voices")
      .select("id, name, samples, description, is_default")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const defaultVoice = voices?.[0] ?? null;

  let initialInput = "";
  let workspaceKey = "blank";

  if (template?.trim()) {
    const picked = getStudioTemplate(template.trim());
    if (picked) {
      initialInput = picked.body;
      workspaceKey = `template-${picked.id}`;
    }
  } else if (example === "1") {
    initialInput = STUDIO_EXAMPLE_INPUT;
    workspaceKey = "example";
  }

  if (reuse?.trim()) {
    const { data: reused } = await supabase
      .from("repurposes")
      .select("input_content")
      .eq("user_id", user.id)
      .eq("source_hash", reuse.trim())
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reused?.input_content) {
      initialInput = reused.input_content;
      workspaceKey = `reuse-${reuse.trim()}`;
    }
  }

  return (
    <Suspense fallback={null}>
      <RepurposeWorkspace
        key={workspaceKey}
        initialInput={initialInput}
        repurposesUsed={usage.used}
        repurposesLimit={usage.limit}
        userPlan={usage.plan}
        brandVoice={defaultVoice}
        native={await isNativeRequest()}
      />
    </Suspense>
  );
}
