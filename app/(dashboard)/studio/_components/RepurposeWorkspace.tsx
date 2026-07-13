"use client";

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { INPUT_CONTENT_MIN_LENGTH, planAllowsVision } from '@/lib/config';
import {
  callPhotoGenerateApi,
  PhotoGenerateApiError,
} from '@/lib/repurpose/photo-generate-client';
import type { InputMode, PhotoInputReady } from '@/types/photo-input';
import type { Plan } from '@/types';
import InputModeTabs from './InputModeTabs';
import PhotoInputSection from './PhotoInputSection';
import TextSourceCard from './TextSourceCard';
import { EmailOutputPanel } from '@/components/repurpose/email-output-panel';
import { InstagramOutputPanel } from '@/components/repurpose/instagram-output-panel';
import { LinkedInOutputPanel } from '@/components/repurpose/linkedin-output-panel';
import { XThreadTweetList } from '@/components/repurpose/x-thread-tweet-list';
import {
  formatEmailForCopy,
  formatInstagramForCopy,
  formatLinkedInForCopy,
  formatXThreadForCopy,
} from '@/lib/format-output';
import type {
  BrandVoiceInput,
  EmailOutput,
  GenerateErrorResponse,
  GenerateSuccessResponse,
  InstagramOutput,
  LinkedInOutput,
  RepurposeOutput,
  TargetFormat,
  UsageInfo,
  XThreadOutput,
} from '@/types';

const TWITTER_LENGTH_MIN = 3;
const TWITTER_LENGTH_MAX = 15;

const ALL_FORMATS: TargetFormat[] = ['x_thread', 'linkedin', 'instagram', 'email'];

type FormatLoadingState = Record<TargetFormat, boolean>;
type FormatErrorState = Record<TargetFormat, string | null>;

function createFormatRecord<T>(value: T): Record<TargetFormat, T> {
  return {
    x_thread: value,
    linkedin: value,
    instagram: value,
    email: value,
  };
}

function clampTargetTweets(count: number): number {
  return Math.min(TWITTER_LENGTH_MAX, Math.max(TWITTER_LENGTH_MIN, count));
}

function isFormatOutput<F extends TargetFormat>(
  output: RepurposeOutput,
  format: F
): output is Extract<RepurposeOutput, { format: F }> {
  return output.format === format;
}

class GenerateApiError extends Error {
  usage?: UsageInfo;
  code?: GenerateErrorResponse['code'];

  constructor(
    message: string,
    opts?: { usage?: UsageInfo; code?: GenerateErrorResponse['code'] }
  ) {
    super(message);
    this.name = 'GenerateApiError';
    this.usage = opts?.usage;
    this.code = opts?.code;
  }
}

interface BrandVoiceProp {
  id: string;
  samples: string[] | null;
  description: string | null;
}

interface RepurposeWorkspaceProps {
  initialInput?: string;
  initialTwitterOutput?: string;
  initialTwitterLength?: number;
  repurposesUsed: number;
  repurposesLimit: number;
  userPlan: Plan;
  brandVoice?: BrandVoiceProp | null;
  onTwitterGenerate?: (output: string) => void;
}

export default function RepurposeWorkspace({
  initialInput = "",
  initialTwitterOutput,
  initialTwitterLength,
  repurposesUsed,
  repurposesLimit,
  userPlan,
  brandVoice = null,
  onTwitterGenerate,
}: RepurposeWorkspaceProps) {
  const [inputSummary, setInputSummary] = useState(initialInput);
  const [inputMode, setInputMode] = useState<InputMode>('paste');
  const [photoInput, setPhotoInput] = useState<PhotoInputReady | null>(null);

  const [twitterLength, setTwitterLength] = useState(
    clampTargetTweets(initialTwitterLength ?? 6)
  );
  const [pendingTwitterLength, setPendingTwitterLength] = useState(
    clampTargetTweets(initialTwitterLength ?? 6)
  );
  const [xThreadOutput, setXThreadOutput] = useState<XThreadOutput | null>(
    initialTwitterOutput
      ? {
          format: 'x_thread',
          tweets: initialTwitterOutput
            .split(/\n\n+/)
            .filter(Boolean)
            .map((text, index) => ({ number: index + 1, text })),
        }
      : null
  );
  const [linkedinOutput, setLinkedinOutput] = useState<LinkedInOutput | null>(null);
  const [instagramOutput, setInstagramOutput] = useState<InstagramOutput | null>(null);
  const [emailOutput, setEmailOutput] = useState<EmailOutput | null>(null);

  const [formatLoading, setFormatLoading] = useState<FormatLoadingState>(
    createFormatRecord(false)
  );
  const [formatErrors, setFormatErrors] = useState<FormatErrorState>(
    createFormatRecord(null)
  );
  const [isRegeneratingAll, setIsRegeneratingAll] = useState(false);
  const [usedCount, setUsedCount] = useState(repurposesUsed);

  const isAnyLoading =
    isRegeneratingAll || ALL_FORMATS.some((format) => formatLoading[format]);

  const callGenerateApi = useCallback(
    async (
      inputContent: string,
      targetFormat: TargetFormat,
      targetTweets?: number,
      generationId?: string
    ): Promise<{ output: RepurposeOutput; usage: UsageInfo }> => {
      const body: Record<string, unknown> = {
        input_type: 'paste',
        input_content: inputContent,
        target_format: targetFormat,
      };

      if (brandVoice?.id) {
        body.brand_voice_id = brandVoice.id;
      } else {
        // No saved voice yet — minimal inline fallback so first-run still works.
        body.brand_voice = {
          samples: [],
          description: 'Clear, professional, conversational.',
        } satisfies BrandVoiceInput;
      }

      if (targetFormat === 'x_thread') {
        body.target_tweets = clampTargetTweets(targetTweets ?? pendingTwitterLength);
      }

      if (generationId) {
        body.generation_id = generationId;
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const text = await response.text();

      if (!response.ok) {
        let message = 'Failed to generate content';
        let usage: UsageInfo | undefined;
        let code: GenerateErrorResponse['code'] | undefined;
        try {
          const errorData = JSON.parse(text) as GenerateErrorResponse;
          if (errorData.error) {
            message = errorData.error;
          }
          usage = errorData.usage;
          code = errorData.code;
        } catch {
          if (text) {
            message = text;
          }
        }
        throw new GenerateApiError(message, { usage, code });
      }

      const data = JSON.parse(text) as GenerateSuccessResponse;
      if (!data.output || data.output.format !== targetFormat) {
        throw new Error('Unexpected response from generation API');
      }

      return { output: data.output, usage: data.usage };
    },
    [brandVoice, pendingTwitterLength]
  );

  const applyOutput = useCallback(
    (format: TargetFormat, output: RepurposeOutput) => {
      switch (format) {
        case 'x_thread':
          if (isFormatOutput(output, 'x_thread')) {
            setXThreadOutput(output);
            onTwitterGenerate?.(formatXThreadForCopy(output));
          }
          break;
        case 'linkedin':
          if (isFormatOutput(output, 'linkedin')) {
            setLinkedinOutput(output);
          }
          break;
        case 'instagram':
          if (isFormatOutput(output, 'instagram')) {
            setInstagramOutput(output);
          }
          break;
        case 'email':
          if (isFormatOutput(output, 'email')) {
            setEmailOutput(output);
          }
          break;
      }
    },
    [onTwitterGenerate]
  );

  const isPhotoMode = inputMode === 'photo';
  const canGeneratePhoto =
    isPhotoMode && photoInput !== null && planAllowsVision(userPlan);

  const handleModeChange = (mode: InputMode) => {
    if (mode === inputMode) return;

    if (mode === 'paste' && photoInput) {
      const confirmed = window.confirm(
        'Switching to paste text will clear your photo and context.'
      );
      if (!confirmed) return;
      setPhotoInput(null);
    }

    setInputMode(mode);
  };

  const generatePhotoFormat = useCallback(
    async (
      format: TargetFormat,
      options?: { targetTweets?: number; generationId?: string }
    ) => {
      if (!photoInput || !planAllowsVision(userPlan)) {
        setFormatErrors((prev) => ({
          ...prev,
          [format]:
            !planAllowsVision(userPlan)
              ? 'Photo repurpose requires a Creator or Pro plan.'
              : 'Add a photo and context before generating.',
        }));
        return;
      }

      setFormatErrors((prev) => ({ ...prev, [format]: null }));
      setFormatLoading((prev) => ({ ...prev, [format]: true }));

      try {
        const { output, usage } = await callPhotoGenerateApi({
          photo: photoInput,
          targetFormat: format,
          brandVoice,
          targetTweets: options?.targetTweets,
          generationId: options?.generationId,
        });
        applyOutput(format, output);
        setUsedCount(usage.used);

        if (format === 'x_thread' && options?.targetTweets !== undefined) {
          const length = clampTargetTweets(options.targetTweets);
          setTwitterLength(length);
          setPendingTwitterLength(length);
        }
      } catch (err) {
        console.error(err);
        if (err instanceof PhotoGenerateApiError && err.usage) {
          setUsedCount(err.usage.used);
        }
        const fallbackMessages: Record<TargetFormat, string> = {
          x_thread: 'Something went wrong while generating the Twitter thread. Please try again.',
          linkedin: 'Something went wrong while generating the LinkedIn content. Please try again.',
          instagram: 'Something went wrong while generating the Instagram caption. Please try again.',
          email: 'Something went wrong while generating the email newsletter. Please try again.',
        };
        setFormatErrors((prev) => ({
          ...prev,
          [format]:
            err instanceof Error ? err.message : fallbackMessages[format],
        }));
      } finally {
        setFormatLoading((prev) => ({ ...prev, [format]: false }));
      }
    },
    [applyOutput, brandVoice, photoInput, userPlan]
  );

  const generateFormat = useCallback(
    async (
      format: TargetFormat,
      options?: { inputContent?: string; targetTweets?: number; generationId?: string }
    ) => {
      const trimmed = (options?.inputContent ?? inputSummary).trim();
      if (trimmed.length < INPUT_CONTENT_MIN_LENGTH) {
        setFormatErrors((prev) => ({
          ...prev,
          [format]: `Source content must be at least ${INPUT_CONTENT_MIN_LENGTH} characters.`,
        }));
        return;
      }

      setFormatErrors((prev) => ({ ...prev, [format]: null }));
      setFormatLoading((prev) => ({ ...prev, [format]: true }));

      try {
        const { output, usage } = await callGenerateApi(
          trimmed,
          format,
          options?.targetTweets,
          options?.generationId
        );
        applyOutput(format, output);
        setUsedCount(usage.used);

        if (format === 'x_thread' && options?.targetTweets !== undefined) {
          const length = clampTargetTweets(options.targetTweets);
          setTwitterLength(length);
          setPendingTwitterLength(length);
        }
      } catch (err) {
        console.error(err);
        if (err instanceof GenerateApiError && err.usage) {
          setUsedCount(err.usage.used);
        }
        const fallbackMessages: Record<TargetFormat, string> = {
          x_thread: 'Something went wrong while generating the Twitter thread. Please try again.',
          linkedin: 'Something went wrong while generating the LinkedIn content. Please try again.',
          instagram: 'Something went wrong while generating the Instagram caption. Please try again.',
          email: 'Something went wrong while generating the email newsletter. Please try again.',
        };
        setFormatErrors((prev) => ({
          ...prev,
          [format]:
            err instanceof Error ? err.message : fallbackMessages[format],
        }));
      } finally {
        setFormatLoading((prev) => ({ ...prev, [format]: false }));
      }
    },
    [applyOutput, callGenerateApi, inputSummary]
  );

  const generateTwitter = (
    lengthOverride?: number,
    inputContentOverride?: string
  ) => {
    if (isPhotoMode) {
      void generatePhotoFormat('x_thread', {
        targetTweets: lengthOverride ?? pendingTwitterLength,
      });
      return;
    }

    void generateFormat('x_thread', {
      inputContent: inputContentOverride,
      targetTweets: lengthOverride ?? pendingTwitterLength,
    });
  };

  const handleApplyTwitterLength = () => {
    void generateTwitter(pendingTwitterLength);
  };

  const regenerateFormat = (format: TargetFormat) => {
    if (isPhotoMode) {
      void generatePhotoFormat(format);
      return;
    }
    void generateFormat(format);
  };

  const regenerateAll = async () => {
    setIsRegeneratingAll(true);
    const generationId = crypto.randomUUID();

    if (isPhotoMode) {
      await Promise.allSettled(
        ALL_FORMATS.map((format) => generatePhotoFormat(format, { generationId }))
      );
    } else {
      await Promise.allSettled(
        ALL_FORMATS.map((format) => generateFormat(format, { generationId }))
      );
    }

    setIsRegeneratingAll(false);
  };

  const handleTextInputUpdate = async (content: string) => {
    setInputSummary(content);
    setIsRegeneratingAll(true);
    const generationId = crypto.randomUUID();
    await Promise.allSettled(
      ALL_FORMATS.map((format) =>
        generateFormat(format, { generationId, inputContent: content })
      )
    );
    setIsRegeneratingAll(false);
  };

  const copyAllToClipboard = async () => {
    const parts: string[] = [];

    if (xThreadOutput) {
      parts.push(`=== X / Twitter Thread ===\n\n${formatXThreadForCopy(xThreadOutput)}`);
    }
    if (linkedinOutput) {
      parts.push(`=== LinkedIn ===\n\n${formatLinkedInForCopy(linkedinOutput)}`);
    }
    if (instagramOutput) {
      parts.push(`=== Instagram ===\n\n${formatInstagramForCopy(instagramOutput)}`);
    }
    if (emailOutput) {
      parts.push(`=== Email ===\n\n${formatEmailForCopy(emailOutput)}`);
    }

    if (parts.length === 0) {
      throw new Error('No generated content to copy');
    }

    await navigator.clipboard.writeText(parts.join('\n\n'));
  };

  const exportBundle = async () => {
    try {
      await copyAllToClipboard();
      alert('Copied all generated formats to clipboard as plain text.');
    } catch (err) {
      console.error('Clipboard write failed', err);
      alert('Could not copy to clipboard. Your browser may be blocking clipboard access.');
    }
  };

  const renderFormatError = (format: TargetFormat, message: string) => (
    <div className="mb-3 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-2xl px-3 py-2 flex items-start gap-2">
      <i className="fas fa-exclamation-circle mt-0.5"></i>
      <div className="flex-1">
        <div>{message}</div>
        <button
          type="button"
          onClick={() => regenerateFormat(format)}
          className="mt-1 text-[11px] font-medium text-destructive underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-screen-md mx-auto px-4 pt-6 pb-24 bg-background min-h-screen">

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Content Studio</h1>
        <p className="text-sm text-muted-foreground mt-1">One input → Multiple high-quality outputs</p>
      </div>

      <InputModeTabs
        value={inputMode}
        onChange={handleModeChange}
        disabled={isAnyLoading}
      />

      {isPhotoMode ? (
        <PhotoInputSection
          key="photo-input"
          userPlan={userPlan}
          disabled={isAnyLoading}
          onReadyChange={setPhotoInput}
        />
      ) : (
        <TextSourceCard
          inputSummary={inputSummary}
          isLoading={isAnyLoading}
          onUpdate={handleTextInputUpdate}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <Link href="/brand-voice" className="flex items-center gap-x-2 cursor-pointer">
          <div className="bg-card border border-border rounded-2xl px-3 py-2 flex items-center gap-x-2">
            <i className="fas fa-magic text-primary"></i>
            <span className="text-sm">Brand Voice: <span className="font-medium">{brandVoice?.description?.trim() || (brandVoice ? 'Custom voice' : 'No voice set — using default')}</span></span>
          </div>
        </Link>

        <div className="bg-teal-500/10 border border-teal-500/30 rounded-2xl px-4 py-2 flex items-center gap-x-2">
          <i className="fas fa-clock text-teal-600"></i>
          <div className="text-sm">
            <span className="font-medium text-teal-700">~40 min saved</span>
            <span className="text-teal-600 text-xs ml-1">(~10 min × 4 formats)</span>
          </div>
        </div>
      </div>

      <div className="mb-4 px-1 flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          <span className="font-medium">{usedCount} / {repurposesLimit}</span> repurposes used this month
        </div>
        <Link
          href="/upgrade"
          className="text-primary hover:text-primary text-xs font-medium"
        >
          Upgrade →
        </Link>
      </div>

      <div className="flex items-center justify-between mb-3 px-1">
        <div className="text-xs font-semibold tracking-wider text-muted-foreground">GENERATED OUTPUTS</div>
        <div className="text-xs text-muted-foreground">4 formats</div>
      </div>

      <div className="space-y-4">

        {/* X / Twitter */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-x-3">
              <i className="fab fa-x-twitter text-xl"></i>
              <div>
                <div className="font-semibold">X / Twitter Thread</div>
                <div className="text-xs text-muted-foreground">
                  {xThreadOutput ? `${twitterLength} tweets` : 'Not generated yet'}
                </div>
              </div>
            </div>
          </div>

          <div className="p-5">
            {xThreadOutput ? (
              <XThreadTweetList tweets={xThreadOutput.tweets} variant="studio" />
            ) : (
              <div className="text-sm mb-4 leading-relaxed text-muted-foreground italic">
                Click Regenerate to generate your X thread from the source content.
              </div>
            )}

            {formatErrors.x_thread && renderFormatError('x_thread', formatErrors.x_thread)}

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Target length</span>
                <span className="font-mono">{pendingTwitterLength} tweets</span>
              </div>
              <input
                type="range"
                min={TWITTER_LENGTH_MIN}
                max={TWITTER_LENGTH_MAX}
                value={pendingTwitterLength}
                onChange={(e) => setPendingTwitterLength(clampTargetTweets(parseInt(e.target.value, 10)))}
                className="w-full accent-primary"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleApplyTwitterLength}
                  disabled={formatLoading.x_thread}
                  className="text-xs px-4 py-1.5 rounded-2xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
                >
                  {formatLoading.x_thread ? 'Generating...' : 'Apply & Regenerate'}
                </button>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 bg-secondary border-t border-border flex gap-2">
            <button
              onClick={() => regenerateFormat('x_thread')}
              disabled={formatLoading.x_thread}
              className="flex-1 py-2 text-xs rounded-2xl border border-border disabled:opacity-50"
            >
              {formatLoading.x_thread ? 'Generating…' : 'Regenerate'}
            </button>
            <button onClick={() => alert("Edit modal coming soon")} className="flex-1 py-2 text-xs rounded-2xl border border-border">Edit</button>
          </div>
        </div>

        {/* LinkedIn */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-x-3">
              <i className="fab fa-linkedin text-xl text-blue-600"></i>
              <div>
                <div className="font-semibold">LinkedIn Carousel</div>
                <div className="text-xs text-muted-foreground">
                  {linkedinOutput
                    ? `${linkedinOutput.carousel_slides.length} slides`
                    : 'Not generated yet'}
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {formatErrors.linkedin && renderFormatError('linkedin', formatErrors.linkedin)}

            {linkedinOutput ? (
              <LinkedInOutputPanel output={linkedinOutput} variant="studio" />
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Click Regenerate to generate your LinkedIn post and carousel slide ideas.
              </p>
            )}
          </div>

          <div className="px-5 py-3 bg-secondary border-t border-border flex gap-2">
            <button
              onClick={() => regenerateFormat('linkedin')}
              disabled={formatLoading.linkedin}
              className="flex-1 py-2 text-xs rounded-2xl border border-border disabled:opacity-50"
            >
              {formatLoading.linkedin ? 'Generating…' : 'Regenerate'}
            </button>
            <button onClick={() => alert("Edit modal coming soon")} className="flex-1 py-2 text-xs rounded-2xl border border-border">Edit</button>
          </div>
        </div>

        {/* Instagram */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-x-3">
              <i className="fab fa-instagram text-xl text-pink-600"></i>
              <div>
                <div className="font-semibold">Instagram Caption</div>
                <div className="text-xs text-muted-foreground">
                  {instagramOutput
                    ? `${instagramOutput.hook_variations.length} hook variations`
                    : 'Not generated yet'}
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {formatErrors.instagram && renderFormatError('instagram', formatErrors.instagram)}

            {instagramOutput ? (
              <InstagramOutputPanel output={instagramOutput} variant="studio" />
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Click Regenerate to generate your Instagram caption, hooks, and hashtags.
              </p>
            )}
          </div>

          <div className="px-5 py-3 bg-secondary border-t border-border flex gap-2">
            <button
              onClick={() => regenerateFormat('instagram')}
              disabled={formatLoading.instagram}
              className="flex-1 py-2 text-xs rounded-2xl border border-border disabled:opacity-50"
            >
              {formatLoading.instagram ? 'Generating…' : 'Regenerate'}
            </button>
            <button onClick={() => alert("Edit modal coming soon")} className="flex-1 py-2 text-xs rounded-2xl border border-border">Edit</button>
          </div>
        </div>

        {/* Email */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-x-3">
              <i className="fas fa-envelope text-xl text-muted-foreground"></i>
              <div>
                <div className="font-semibold">Email Newsletter</div>
                <div className="text-xs text-muted-foreground">
                  {emailOutput ? 'Newsletter draft' : 'Not generated yet'}
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {formatErrors.email && renderFormatError('email', formatErrors.email)}

            {emailOutput ? (
              <EmailOutputPanel output={emailOutput} variant="studio" />
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Click Regenerate to generate your email subject line and newsletter draft.
              </p>
            )}
          </div>

          <div className="px-5 py-3 bg-secondary border-t border-border flex gap-2">
            <button
              onClick={() => regenerateFormat('email')}
              disabled={formatLoading.email}
              className="flex-1 py-2 text-xs rounded-2xl border border-border disabled:opacity-50"
            >
              {formatLoading.email ? 'Generating…' : 'Regenerate'}
            </button>
            <button onClick={() => alert("Edit modal coming soon")} className="flex-1 py-2 text-xs rounded-2xl border border-border">Edit</button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 z-50">
        <div className="max-w-screen-md mx-auto flex gap-3">
          <button
            onClick={() => void regenerateAll()}
            disabled={
              isAnyLoading ||
              (isPhotoMode
                ? !canGeneratePhoto
                : inputSummary.trim().length < INPUT_CONTENT_MIN_LENGTH)
            }
            className="flex-1 py-3 text-sm font-medium rounded-2xl border border-border disabled:opacity-50"
          >
            {isRegeneratingAll
              ? isPhotoMode
                ? 'Analysing your photo…'
                : 'Regenerating all formats…'
              : 'Regenerate All'}
          </button>

          <button
            onClick={() => void exportBundle()}
            disabled={!xThreadOutput && !linkedinOutput && !instagramOutput && !emailOutput}
            className="flex-1 py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-2xl disabled:opacity-50"
          >
            Export Bundle (Text)
          </button>
        </div>
      </div>

      {isRegeneratingAll && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-[70]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-sm text-muted-foreground">
              {isPhotoMode
                ? 'Analysing your photo and generating all formats…'
                : 'Generating all formats…'}
            </p>
            {isPhotoMode ? (
              <p className="mt-1 text-xs text-muted-foreground">
                This may take a little longer than text.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
