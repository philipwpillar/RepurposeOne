import { z } from "zod";
import {
  INPUT_CONTENT_MAX_LENGTH,
  INPUT_CONTENT_MIN_LENGTH,
} from "@/lib/config";
import {
  PHOTO_CONTEXT_MAX_LENGTH,
  PHOTO_CONTEXT_MIN_LENGTH,
  PHOTO_CTA_MAX_LENGTH,
  PHOTO_ACCEPTED_MIMES,
} from "@/lib/image/constants";

// ---------------------------------------------------------------------------
// Plan & usage
// ---------------------------------------------------------------------------

export const PlanSchema = z.enum(["free", "creator", "pro", "pro_plus"]);
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
  is_default: z.boolean(),
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

export const InputTypeSchema = z.enum([
  "paste",
  "txt",
  "pdf",
  "audio",
  "image",
]);
export type InputType = z.infer<typeof InputTypeSchema>;

export const TargetFormatSchema = z.enum([
  "x_thread",
  "linkedin",
  "instagram",
  "email",
]);
export type TargetFormat = z.infer<typeof TargetFormatSchema>;

const PhotoMimeSchema = z.enum(PHOTO_ACCEPTED_MIMES);

const GenerateRequestSharedSchema = z.object({
  brand_voice_id: z.string().uuid().optional(),
  brand_voice: BrandVoiceInputSchema.optional(),
  target_format: TargetFormatSchema.default("x_thread"),
  target_tweets: z.number().int().min(3).max(15).optional(),
  generation_id: z.string().uuid().optional(),
});

export const TextGenerateRequestSchema = GenerateRequestSharedSchema.extend({
  input_type: z.literal("paste").default("paste"),
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
});

export const ImageGenerateRequestSchema = GenerateRequestSharedSchema.extend({
  input_type: z.literal("image"),
  image_base64: z.string().min(1, "Image data is required"),
  image_mime: PhotoMimeSchema,
  photo_context: z
    .string()
    .min(
      PHOTO_CONTEXT_MIN_LENGTH,
      `Context must be at least ${PHOTO_CONTEXT_MIN_LENGTH} characters`
    )
    .max(PHOTO_CONTEXT_MAX_LENGTH),
  photo_cta: z.string().max(PHOTO_CTA_MAX_LENGTH).optional(),
});

export const RepurposeStatusSchema = z.enum(["pending", "complete", "failed"]);
export type RepurposeStatus = z.infer<typeof RepurposeStatusSchema>;

export const GenerateRequestSchema = z.union([
  TextGenerateRequestSchema,
  ImageGenerateRequestSchema,
]);
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type TextGenerateRequest = z.infer<typeof TextGenerateRequestSchema>;
export type ImageGenerateRequest = z.infer<typeof ImageGenerateRequestSchema>;

// ---------------------------------------------------------------------------
// X/Twitter thread output (structured)
// ---------------------------------------------------------------------------

export const TweetSchema = z.object({
  number: z.number().int().min(1),
  text: z.string().min(1).max(280),
  media_suggestion: z.string().max(200).nullish(),
});
export type Tweet = z.infer<typeof TweetSchema>;

export const XThreadOutputSchema = z.object({
  format: z.literal("x_thread"),
  tweets: z.array(TweetSchema).min(3).max(15),
  thread_summary: z.string().max(500).nullish(),
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
  hashtags: z.array(z.string().min(1).max(100)).min(0).max(8),
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
  // Brief S2 — .nullish() so select("*") nulls and omitted API keys both parse
  user_rating: z.union([z.literal(-1), z.literal(1)]).nullish(),
  user_output: RepurposeOutputSchema.nullish(),
  edited_at: z.string().nullish(),
});
export type Repurpose = z.infer<typeof RepurposeSchema>;

export type UserRating = -1 | 1;

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
  source_hash: z.string(),
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
    "plan_required",
  ]),
  usage: UsageInfoSchema.optional(),
  upgrade_message: z.string().optional(),
  retry_after_seconds: z.number().int().optional(),
});
export type GenerateErrorResponse = z.infer<typeof GenerateErrorResponseSchema>;

// ---------------------------------------------------------------------------
// Moment Bundle (Brief 1b photo pack + Brief 2c video clip specs)
// ---------------------------------------------------------------------------

const BundlePhotoInputSchema = z.object({
  data: z.string().min(1, "Image data is required"),
  filename: z.string().max(255).optional(),
});

const BundleVideoSheetSchema = z.object({
  data: z.string().min(1, "Sheet image data is required"),
  timestamps: z.array(z.number()).min(1).max(9),
});

export const BundleVideoInputSchema = z.object({
  sheets: z.array(BundleVideoSheetSchema).min(1).max(4),
  duration_s: z.number().gt(0).lte(183),
  filename: z.string().max(255).optional(),
  asset_id: z.string().uuid().optional(),
});
export type BundleVideoInput = z.infer<typeof BundleVideoInputSchema>;

export const BundleGenerateRequestSchema = z
  .object({
    bundle_id: z.string().uuid().optional(),
    title: z.string().max(200).optional(),
    context: z
      .string()
      .min(
        PHOTO_CONTEXT_MIN_LENGTH,
        `Context must be at least ${PHOTO_CONTEXT_MIN_LENGTH} characters`
      )
      .max(PHOTO_CONTEXT_MAX_LENGTH),
    photos: z.array(BundlePhotoInputSchema).min(0).max(8).default([]),
    videos: z.array(BundleVideoInputSchema).max(2).optional(),
    formats: z.array(TargetFormatSchema).min(1).max(4).optional(),
  })
  .refine(
    (data) => data.photos.length + (data.videos?.length ?? 0) >= 1,
    { message: "Add at least one photo or video" }
  );
export type BundleGenerateRequest = z.infer<typeof BundleGenerateRequestSchema>;

export const BundlePhotoAnalysisSchema = z.object({
  photos: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      description: z.string().min(1),
      caption_angle: z.string().min(1),
      quality_note: z.string().optional(),
    })
  ),
});
export type BundlePhotoAnalysis = z.infer<typeof BundlePhotoAnalysisSchema>;

export const BundleVideoMomentsSchema = z.object({
  moments: z
    .array(
      z.object({
        start_s: z.number().nonnegative(),
        end_s: z.number().positive(),
        description: z.string().min(1),
        why_interesting: z.string().min(1),
      })
    )
    .min(1)
    .max(5),
});
export type BundleVideoMoments = z.infer<typeof BundleVideoMomentsSchema>;

export const BundleClipSpecSchema = z
  .object({
    video_index: z.number().int().nonnegative(),
    start_s: z.number().nonnegative(),
    end_s: z.number().positive(),
    overlay_text: z.string().max(60),
    caption: z.string().min(1).max(2200),
    tags: z.array(z.string().max(40)).max(12),
    clip_id: z.string().uuid().optional(),
  })
  .refine((c) => c.end_s > c.start_s, {
    message: "end_s must be greater than start_s",
  })
  .refine((c) => {
    const dur = c.end_s - c.start_s;
    return dur >= 10 && dur <= 45;
  }, {
    message: "clip window must be between 10 and 45 seconds",
  });
export type BundleClipSpec = z.infer<typeof BundleClipSpecSchema>;

/** Looser clip shape for stage-2 AI parse — window length enforced in backstops. */
const BundleClipSpecAiSchema = z
  .object({
    video_index: z.number().int().nonnegative(),
    start_s: z.number().nonnegative(),
    end_s: z.number().positive(),
    overlay_text: z.string().max(60),
    caption: z.string().min(1).max(2200),
    tags: z.array(z.string().max(40)).max(12).default([]),
  })
  .refine((c) => c.end_s > c.start_s, {
    message: "end_s must be greater than start_s",
  });

export const BundlePackSchema = z.object({
  photo_captions: z.array(
    z.object({
      photo_index: z.number().int().nonnegative(),
      caption: z.string().min(1).max(2200),
      alt_text: z.string().max(500),
    })
  ),
  posting_order: z.array(z.number().int().nonnegative()),
  post_brief: z.string().min(1).max(2000),
  clip_specs: z.array(BundleClipSpecSchema).max(6).default([]),
});
export type BundlePack = z.infer<typeof BundlePackSchema>;

/** Stage-2 AI output — clip windows tightened by applyClipSpecBackstops. */
export const BundlePackAiSchema = z.object({
  photo_captions: z.array(
    z.object({
      photo_index: z.number().int().nonnegative(),
      caption: z.string().min(1).max(2200),
      alt_text: z.string().max(500),
    })
  ),
  posting_order: z.array(z.number().int().nonnegative()),
  post_brief: z.string().min(1).max(2000),
  clip_specs: z.array(BundleClipSpecAiSchema).max(6).default([]),
});

export const BundleRepurposeResultSchema = z.object({
  id: z.string().uuid(),
  target_format: TargetFormatSchema,
  status: RepurposeStatusSchema,
  output: RepurposeOutputSchema.nullable(),
});
export type BundleRepurposeResult = z.infer<typeof BundleRepurposeResultSchema>;

export const BundleGenerateSuccessResponseSchema = z.object({
  bundle_id: z.string().uuid(),
  pack: BundlePackSchema,
  repurposes: z.array(BundleRepurposeResultSchema),
  usage: UsageInfoSchema,
});
export type BundleGenerateSuccessResponse = z.infer<
  typeof BundleGenerateSuccessResponseSchema
>;

export const BundleGenerateErrorResponseSchema = z.object({
  error: z.string(),
  code: z.enum([
    "unauthorized",
    "validation_error",
    "limit_exceeded",
    "bundle_limit_reached",
    "rate_limited",
    "generation_failed",
    "internal_error",
    "plan_required",
    "conflict",
  ]),
  usage: UsageInfoSchema.optional(),
  upgrade_message: z.string().optional(),
  retry_after_seconds: z.number().int().optional(),
});
export type BundleGenerateErrorResponse = z.infer<
  typeof BundleGenerateErrorResponseSchema
>;

/** Brief 3a — prepare signed uploads before generate. */
export const BundlePrepareVideoSchema = z.object({
  filename: z.string().min(1).max(255),
  size_bytes: z.number().int().positive().max(500 * 1024 * 1024),
  duration_s: z.number().min(15).max(180),
});

export const BundlePrepareRequestSchema = z.object({
  videos: z.array(BundlePrepareVideoSchema).min(1).max(2),
});
export type BundlePrepareRequest = z.infer<typeof BundlePrepareRequestSchema>;

export const BundlePrepareUploadSchema = z.object({
  asset_id: z.string().uuid(),
  storage_path: z.string().min(1),
  signed_url: z.string().url(),
  token: z.string().min(1),
});

export const BundlePrepareSuccessResponseSchema = z.object({
  bundle_id: z.string().uuid(),
  uploads: z.array(BundlePrepareUploadSchema).min(1).max(2),
});
export type BundlePrepareSuccessResponse = z.infer<
  typeof BundlePrepareSuccessResponseSchema
>;

export const BundlePrepareErrorResponseSchema = z.object({
  error: z.string(),
  code: z.enum([
    "unauthorized",
    "validation_error",
    "bundle_limit_reached",
    "rate_limited",
    "internal_error",
    "plan_required",
  ]),
  usage: UsageInfoSchema.optional(),
  upgrade_message: z.string().optional(),
  retry_after_seconds: z.number().int().optional(),
});
export type BundlePrepareErrorResponse = z.infer<
  typeof BundlePrepareErrorResponseSchema
>;
