import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  EmailOutputSchema,
  InstagramOutputSchema,
  LinkedInOutputSchema,
  RepurposeOutputSchema,
  TargetFormatSchema,
  XThreadOutputSchema,
  type TargetFormat,
} from "@/types";

const FeedbackBodySchema = z
  .object({
    rating: z.union([z.literal(-1), z.literal(1), z.null()]).optional(),
    user_output: RepurposeOutputSchema.optional(),
  })
  .refine(
    (body) => body.rating !== undefined || body.user_output !== undefined,
    { message: "Provide rating and/or user_output" }
  );

function schemaForFormat(format: TargetFormat) {
  switch (format) {
    case "x_thread":
      return XThreadOutputSchema;
    case "linkedin":
      return LinkedInOutputSchema;
    case "instagram":
      return InstagramOutputSchema;
    case "email":
      return EmailOutputSchema;
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const idParsed = z.string().uuid().safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json({ error: "Invalid repurpose id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = FeedbackBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }

  const { data: row, error: fetchError } = await supabase
    .from("repurposes")
    .select("id, status, target_format")
    .eq("id", idParsed.data)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !row) {
    return NextResponse.json({ error: "Repurpose not found" }, { status: 404 });
  }

  if (row.status !== "complete") {
    return NextResponse.json(
      { error: "Only complete outputs can receive feedback" },
      { status: 400 }
    );
  }

  const formatParsed = TargetFormatSchema.safeParse(row.target_format);
  if (!formatParsed.success) {
    return NextResponse.json({ error: "Invalid target format" }, { status: 500 });
  }

  const updates: {
    user_rating?: -1 | 1 | null;
    user_output?: unknown;
    edited_at?: string;
  } = {};

  if (parsed.data.rating !== undefined) {
    updates.user_rating = parsed.data.rating;
  }

  if (parsed.data.user_output !== undefined) {
    const formatSchema = schemaForFormat(formatParsed.data);
    const outputParsed = formatSchema.safeParse(parsed.data.user_output);
    if (!outputParsed.success) {
      return NextResponse.json(
        {
          error: outputParsed.error.issues.map((i) => i.message).join("; "),
        },
        { status: 400 }
      );
    }
    if (outputParsed.data.format !== formatParsed.data) {
      return NextResponse.json(
        { error: "user_output.format must match the repurpose target_format" },
        { status: 400 }
      );
    }
    updates.user_output = outputParsed.data;
    updates.edited_at = new Date().toISOString();
  }

  const { data: updated, error: updateError } = await supabase
    .from("repurposes")
    .update(updates)
    .eq("id", idParsed.data)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("Failed to update feedback:", updateError);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }

  return NextResponse.json({ repurpose: updated });
}
