import { z } from "zod";
import {
  INPUT_CONTENT_MAX_LENGTH,
  INPUT_CONTENT_MIN_LENGTH,
} from "@/lib/config";

// ---------------------------------------------------------------------------
// Plan & usage
// ---------------------------------------------------------------------------

export const PlanSchema = z.enum(["free", "creator", "pro"]);
export type Plan = z.infer<typeof PlanSchema>;

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  stripe_customer_id: z.string().nullable(),
  stripe_subscription_id: z.string().nullable(),
  plan: PlanSchema,
  created_at: z.string(),
});
export type Profile = z.infer<typeof ProfileSchema>;

// ---------------------------------------------------------------------------
// Brand voice
// ---------------------------------------------------------------------------

export const BrandVoiceSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  samples: z.array(z.string()),
  description: z.string().nullable(),
  created_at: z.string(),
});
export type BrandVoice = z.infer<typeof BrandVoiceSchema>;

export const BrandVoiceInputSchema = z.object({
  samples: z.array(z.string().min(1)).max(5).optional(),
  description: z.string().min(10).max(2000).optional(),
}).refine(
  (data) =>
  (data.samples && data.samples.length > 0) || Boolean(data.description),
  { message: "Provide at least one sample or a description" }
);
export type BrandVoiceInput = z.infer<typeof BrandVoiceInputSchema>;

// ---------------------------------------------------------------------------
// Repurpose input / output
// ---------------------------------------------------------------------------

export const InputTypeSchema = z.enum(["paste", "txt", "pdf", "audio"]);
export type InputType = z.infer<typeof InputTypeSchema>;

export const TargetFormatSchema = z.enum([
  "x_thread",
  "linkedin",
  "instagram",
  "email",
]);
export type TargetFormat = z.infer<typeof TargetFormatSchema>;

export const RepurposeStatusSchema = z.enum(["pending", "complete", "failed"]);
export type RepurposeStatus = z.infer<typeof RepurposeStatusSchema>;

export const GenerateRequestSchema = z.object({
  input_type: InputTypeSchema.default("paste"),
  input_content: z
    .string()
    .min(
      INPUT_CONTENT_MIN_LENGTH,
      `Source content must be at least ${INPUT_CONTENT_MIN_LENGTH} characters`
    )
    .max(
      INPUT_CONTENT_MAX_LENGTH,
      `Source content must be at most ${INPUT_CONTENT_MAX_LENGTH.toLocaleString()} characters`
    ),
  brand_voice_id: z.string().uuid().optional(),
  brand_voice: BrandVoiceInputSchema.optional(),
  target_format: TargetFormatSchema.default("x_thread"),
  target_tweets: z.number().int().min(3).max(15).optional(),
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

// ---------------------------------------------------------------------------
// X/Twitter thread output (structured)
// ---------------------------------------------------------------------------

export const TweetSchema = z.object({
  number: z.number().int().min(1),
  text: z.string().min(1).max(280),
  media_suggestion: z.string().max(200).optional(),
});
export type Tweet = z.infer<typeof TweetSchema>;

export const XThreadOutputSchema = z.object({
  format: z.literal("x_thread"),
  tweets: z.array(TweetSchema).min(3).max(15),
  thread_summary: z.string().max(500).optional(),
});
export type XThreadOutput = z.infer<typeof XThreadOutputSchema>;

// ---------------------------------------------------------------------------
// LinkedIn output (structured)
// ---------------------------------------------------------------------------

export const LinkedInSlideSchema = z.object({
  number: z.number().int().min(1),
  title: z.string().min(1).max(200),
  body: z.string().max(500).optional(),
});
export type LinkedInSlide = z.infer<typeof LinkedInSlideSchema>;

export const LinkedInOutputSchema = z.object({
  format: z.literal("linkedin"),
  post: z.string().min(1).max(3000),
  carousel_slides: z.array(LinkedInSlideSchema).min(3).max(15),
  post_summary: z.string().max(500).optional(),
});
export type LinkedInOutput = z.infer<typeof LinkedInOutputSchema>;

// ---------------------------------------------------------------------------
// Instagram output (structured)
// ---------------------------------------------------------------------------

export const InstagramOutputSchema = z.object({
  format: z.literal("instagram"),
  caption: z.string().min(1).max(2200),
  hook_variations: z.array(z.string().min(1).max(300)).min(2).max(5),
  hashtags: z.array(z.string().min(1).max(100)).min(5).max(30),
});
export type InstagramOutput = z.infer<typeof InstagramOutputSchema>;

// ---------------------------------------------------------------------------
// Email newsletter output (structured)
// ---------------------------------------------------------------------------

export const EmailOutputSchema = z.object({
  format: z.literal("email"),
  subject_line: z.string().min(1).max(200),
  preview_text: z.string().max(200).optional(),
  body: z.string().min(1).max(15_000),
});
export type EmailOutput = z.infer<typeof EmailOutputSchema>;

export const RepurposeOutputSchema = z.discriminatedUnion("format", [
  XThreadOutputSchema,
  LinkedInOutputSchema,
  InstagramOutputSchema,
  EmailOutputSchema,
]);
export type RepurposeOutput = z.infer<typeof RepurposeOutputSchema>;

export const RepurposeSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  input_type: InputTypeSchema,
  input_content: z.string(),
  brand_voice_id: z.string().uuid().nullable(),
  target_format: TargetFormatSchema,
  output: RepurposeOutputSchema.nullable(),
  status: RepurposeStatusSchema,
  error_message: z.string().nullable(),
  created_at: z.string(),
});
export type Repurpose = z.infer<typeof RepurposeSchema>;

// ---------------------------------------------------------------------------
// API responses
// ---------------------------------------------------------------------------

export const UsageInfoSchema = z.object({
  plan: PlanSchema,
  used: z.number().int(),
  limit: z.number().int(),
  period_start: z.string(),
  period_end: z.string(),
});
export type UsageInfo = z.infer<typeof UsageInfoSchema>;

export const GenerateSuccessResponseSchema = z.object({
  repurpose_id: z.string().uuid(),
  status: z.literal("complete"),
  output: RepurposeOutputSchema,
  usage: UsageInfoSchema,
  model: z.string(),
  tokens_used: z.number().int().optional(),
});
export type GenerateSuccessResponse = z.infer<typeof GenerateSuccessResponseSchema>;

export const GenerateErrorResponseSchema = z.object({
  error: z.string(),
  code: z.enum([
    "unauthorized",
    "validation_error",
    "limit_exceeded",
    "rate_limited",
    "generation_failed",
    "internal_error",
  ]),
  usage: UsageInfoSchema.optional(),
  upgrade_message: z.string().optional(),
  retry_after_seconds: z.number().int().optional(),
});
export type GenerateErrorResponse = z.infer<typeof GenerateErrorResponseSchema>;
