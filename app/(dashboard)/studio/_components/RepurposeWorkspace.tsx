"use client";

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { INPUT_CONTENT_MIN_LENGTH } from '@/lib/config';
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

interface RepurposeWorkspaceProps {
  initialInput?: string;
  initialTwitterOutput?: string;
  initialTwitterLength?: number;
  repurposesUsed: number;
  repurposesLimit: number;
  onTwitterGenerate?: (output: string) => void;
}

export default function RepurposeWorkspace({
  initialInput = "How I built and launched my first SaaS in 30 days while working full-time",
  initialTwitterOutput,
  initialTwitterLength,
  repurposesUsed,
  repurposesLimit,
  onTwitterGenerate,
}: RepurposeWorkspaceProps) {
  const [inputSummary, setInputSummary] = useState(initialInput);
  const [draftInputContent, setDraftInputContent] = useState(initialInput);
  const [inputModalError, setInputModalError] = useState<string | null>(null);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);

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

  const isAnyLoading =
    isRegeneratingAll || ALL_FORMATS.some((format) => formatLoading[format]);

  const callGenerateApi = useCallback(
    async (
      inputContent: string,
      targetFormat: TargetFormat,
      targetTweets?: number
    ): Promise<RepurposeOutput> => {
      const brandVoice: BrandVoiceInput = {
        samples: [],
        description: 'Professional, UK founder',
      };

      const body: Record<string, unknown> = {
        input_type: 'paste',
        input_content: inputContent,
        target_format: targetFormat,
        brand_voice: brandVoice,
      };

      if (targetFormat === 'x_thread') {
        body.target_tweets = clampTargetTweets(targetTweets ?? pendingTwitterLength);
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
        try {
          const errorData = JSON.parse(text) as GenerateErrorResponse;
          if (errorData.error) {
            message = errorData.error;
          }
        } catch {
          if (text) {
            message = text;
          }
        }
        throw new Error(message);
      }

      const data = JSON.parse(text) as GenerateSuccessResponse;
      if (!data.output || data.output.format !== targetFormat) {
        throw new Error('Unexpected response from generation API');
      }

      return data.output;
    },
    [pendingTwitterLength]
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

  const generateFormat = useCallback(
    async (
      format: TargetFormat,
      options?: { inputContent?: string; targetTweets?: number }
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
        const output = await callGenerateApi(
          trimmed,
          format,
          options?.targetTweets
        );
        applyOutput(format, output);

        if (format === 'x_thread' && options?.targetTweets !== undefined) {
          const length = clampTargetTweets(options.targetTweets);
          setTwitterLength(length);
          setPendingTwitterLength(length);
        }
      } catch (err) {
        console.error(err);
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
    void generateFormat('x_thread', {
      inputContent: inputContentOverride,
      targetTweets: lengthOverride ?? pendingTwitterLength,
    });
  };

  const handleApplyTwitterLength = () => {
    void generateTwitter(pendingTwitterLength);
  };

  const regenerateFormat = (format: TargetFormat) => {
    void generateFormat(format);
  };

  const regenerateAll = async () => {
    setIsRegeneratingAll(true);
    await Promise.allSettled(ALL_FORMATS.map((format) => generateFormat(format)));
    setIsRegeneratingAll(false);
  };

  const handleInputUpdate = () => {
    const trimmed = draftInputContent.trim();
    if (trimmed.length < INPUT_CONTENT_MIN_LENGTH) {
      setInputModalError(
        `Source content must be at least ${INPUT_CONTENT_MIN_LENGTH} characters.`
      );
      return;
    }

    setInputSummary(trimmed);
    setIsInputModalOpen(false);
    setInputModalError(null);
    void regenerateAll();
  };

  const copyToClipboard = (format: TargetFormat) => {
    let text = '';

    switch (format) {
      case 'x_thread':
        if (xThreadOutput) text = formatXThreadForCopy(xThreadOutput);
        break;
      case 'linkedin':
        if (linkedinOutput) text = formatLinkedInForCopy(linkedinOutput);
        break;
      case 'instagram':
        if (instagramOutput) text = formatInstagramForCopy(instagramOutput);
        break;
      case 'email':
        if (emailOutput) text = formatEmailForCopy(emailOutput);
        break;
    }

    if (text) {
      void navigator.clipboard.writeText(text);
    }
  };

  const copyAllToClipboard = () => {
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

    if (parts.length > 0) {
      void navigator.clipboard.writeText(parts.join('\n\n'));
    }
  };

  const exportBundle = () => {
    copyAllToClipboard();
    alert('Copied all generated formats to clipboard as plain text.');
  };

  const renderFormatError = (format: TargetFormat, message: string) => (
    <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-2xl px-3 py-2 flex items-start gap-2">
      <i className="fas fa-exclamation-circle mt-0.5"></i>
      <div className="flex-1">
        <div>{message}</div>
        <button
          type="button"
          onClick={() => regenerateFormat(format)}
          className="mt-1 text-[11px] font-medium text-red-700 underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    </div>
  );

  const twitterDisplayText = xThreadOutput
    ? formatXThreadForCopy(xThreadOutput)
    : 'Click Regenerate to generate your X thread from the source content.';

  return (
    <div className="max-w-screen-md mx-auto px-4 pt-6 pb-24 bg-slate-50 min-h-screen">

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Content Studio</h1>
        <p className="text-sm text-slate-500 mt-1">One input → Multiple high-quality outputs</p>
      </div>

      <div
        onClick={() => setIsInputModalOpen(true)}
        className="bg-white border border-slate-200 rounded-2xl p-4 mb-5 cursor-pointer active:bg-slate-50 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-500 mb-1">SOURCE CONTENT</div>
            <div className="font-medium text-slate-800 line-clamp-2 pr-4">{inputSummary}</div>
            <div className="text-xs text-slate-500 mt-1">
              {inputSummary.length.toLocaleString()} characters • Blog post
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDraftInputContent(inputSummary);
              setInputModalError(null);
              setIsInputModalOpen(true);
            }}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            Change
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div
          onClick={() => alert("Brand Voice settings modal (to be connected)")}
          className="flex items-center gap-x-2 cursor-pointer"
        >
          <div className="bg-white border border-slate-200 rounded-2xl px-3 py-2 flex items-center gap-x-2">
            <i className="fas fa-magic text-teal-500"></i>
            <span className="text-sm">Brand Voice: <span className="font-medium">Professional, UK founder</span></span>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2 flex items-center gap-x-2">
          <i className="fas fa-clock text-emerald-500"></i>
          <div className="text-sm">
            <span className="font-medium text-emerald-700">~40 min saved</span>
            <span className="text-emerald-600 text-xs ml-1">(~10 min × 4 formats)</span>
          </div>
        </div>
      </div>

      <div className="mb-4 px-1 flex items-center justify-between text-sm">
        <div className="text-slate-600">
          <span className="font-medium">{repurposesUsed} / {repurposesLimit}</span> repurposes used this month
        </div>
        <Link
          href="/upgrade"
          className="text-teal-600 hover:text-teal-700 text-xs font-medium"
        >
          Upgrade →
        </Link>
      </div>

      <div className="flex items-center justify-between mb-3 px-1">
        <div className="text-xs font-semibold tracking-wider text-slate-500">GENERATED OUTPUTS</div>
        <div className="text-xs text-slate-500">4 formats</div>
      </div>

      <div className="space-y-4">

        {/* X / Twitter */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b">
            <div className="flex items-center gap-x-3">
              <i className="fab fa-x-twitter text-xl"></i>
              <div>
                <div className="font-semibold">X / Twitter Thread</div>
                <div className="text-xs text-slate-500">
                  {xThreadOutput ? `${twitterLength} tweets` : 'Not generated yet'}
                </div>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard('x_thread')}
              disabled={formatLoading.x_thread || !xThreadOutput}
              className="text-xs px-3 py-1.5 rounded-2xl border border-slate-200 disabled:opacity-50"
            >
              Copy
            </button>
          </div>

          <div className="p-5">
            <div className={`text-sm mb-4 leading-relaxed whitespace-pre-line ${xThreadOutput ? 'text-slate-700' : 'text-slate-400 italic'}`}>
              {twitterDisplayText}
            </div>

            {formatErrors.x_thread && renderFormatError('x_thread', formatErrors.x_thread)}

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-500">Target length</span>
                <span className="font-mono">{pendingTwitterLength} tweets</span>
              </div>
              <input
                type="range"
                min={TWITTER_LENGTH_MIN}
                max={TWITTER_LENGTH_MAX}
                value={pendingTwitterLength}
                onChange={(e) => setPendingTwitterLength(clampTargetTweets(parseInt(e.target.value, 10)))}
                className="w-full accent-teal-500"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleApplyTwitterLength}
                  disabled={formatLoading.x_thread}
                  className="text-xs px-4 py-1.5 rounded-2xl bg-teal-500 text-white font-medium disabled:opacity-50"
                >
                  {formatLoading.x_thread ? 'Generating...' : 'Apply & Regenerate'}
                </button>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 bg-slate-50 border-t flex gap-2">
            <button
              onClick={() => regenerateFormat('x_thread')}
              disabled={formatLoading.x_thread}
              className="flex-1 py-2 text-xs rounded-2xl border border-slate-200 disabled:opacity-50"
            >
              {formatLoading.x_thread ? 'Generating…' : 'Regenerate'}
            </button>
            <button onClick={() => alert("Edit modal coming soon")} className="flex-1 py-2 text-xs rounded-2xl border border-slate-200">Edit</button>
          </div>
        </div>

        {/* LinkedIn */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b">
            <div className="flex items-center gap-x-3">
              <i className="fab fa-linkedin text-xl text-blue-600"></i>
              <div>
                <div className="font-semibold">LinkedIn Carousel</div>
                <div className="text-xs text-slate-500">
                  {linkedinOutput
                    ? `${linkedinOutput.carousel_slides.length} slides`
                    : 'Not generated yet'}
                </div>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard('linkedin')}
              disabled={formatLoading.linkedin || !linkedinOutput}
              className="text-xs px-3 py-1.5 rounded-2xl border border-slate-200 disabled:opacity-50"
            >
              Copy
            </button>
          </div>

          <div className="p-5 space-y-4">
            {formatErrors.linkedin && renderFormatError('linkedin', formatErrors.linkedin)}

            {linkedinOutput ? (
              <>
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-2">POST</div>
                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl">
                    {linkedinOutput.post}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-500 mb-2">CAROUSEL SLIDES</div>
                  <div className="space-y-2">
                    {linkedinOutput.carousel_slides.map((slide) => (
                      <div key={slide.number} className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl text-sm">
                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                          {slide.number}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-800">{slide.title}</div>
                          {slide.body && (
                            <div className="text-slate-600 mt-1">{slide.body}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">
                Click Regenerate to generate your LinkedIn post and carousel slide ideas.
              </p>
            )}
          </div>

          <div className="px-5 py-3 bg-slate-50 border-t flex gap-2">
            <button
              onClick={() => regenerateFormat('linkedin')}
              disabled={formatLoading.linkedin}
              className="flex-1 py-2 text-xs rounded-2xl border border-slate-200 disabled:opacity-50"
            >
              {formatLoading.linkedin ? 'Generating…' : 'Regenerate'}
            </button>
            <button onClick={() => alert("Edit modal coming soon")} className="flex-1 py-2 text-xs rounded-2xl border border-slate-200">Edit</button>
          </div>
        </div>

        {/* Instagram */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b">
            <div className="flex items-center gap-x-3">
              <i className="fab fa-instagram text-xl text-pink-600"></i>
              <div>
                <div className="font-semibold">Instagram Caption</div>
                <div className="text-xs text-slate-500">
                  {instagramOutput
                    ? `${instagramOutput.hook_variations.length} hook variations`
                    : 'Not generated yet'}
                </div>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard('instagram')}
              disabled={formatLoading.instagram || !instagramOutput}
              className="text-xs px-3 py-1.5 rounded-2xl border border-slate-200 disabled:opacity-50"
            >
              Copy
            </button>
          </div>

          <div className="p-5 space-y-4">
            {formatErrors.instagram && renderFormatError('instagram', formatErrors.instagram)}

            {instagramOutput ? (
              <>
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-2">CAPTION</div>
                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {instagramOutput.caption}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-500 mb-2">HOOK VARIATIONS</div>
                  <ul className="space-y-2">
                    {instagramOutput.hook_variations.map((hook, index) => (
                      <li key={index} className="text-sm text-slate-700 bg-slate-50 p-3 rounded-2xl">
                        {hook}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-500 mb-2">HASHTAGS</div>
                  <div className="text-sm text-teal-700">
                    {instagramOutput.hashtags
                      .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
                      .join(' ')}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">
                Click Regenerate to generate your Instagram caption, hooks, and hashtags.
              </p>
            )}
          </div>

          <div className="px-5 py-3 bg-slate-50 border-t flex gap-2">
            <button
              onClick={() => regenerateFormat('instagram')}
              disabled={formatLoading.instagram}
              className="flex-1 py-2 text-xs rounded-2xl border border-slate-200 disabled:opacity-50"
            >
              {formatLoading.instagram ? 'Generating…' : 'Regenerate'}
            </button>
            <button onClick={() => alert("Edit modal coming soon")} className="flex-1 py-2 text-xs rounded-2xl border border-slate-200">Edit</button>
          </div>
        </div>

        {/* Email */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b">
            <div className="flex items-center gap-x-3">
              <i className="fas fa-envelope text-xl text-slate-600"></i>
              <div>
                <div className="font-semibold">Email Newsletter</div>
                <div className="text-xs text-slate-500">
                  {emailOutput ? 'Newsletter draft' : 'Not generated yet'}
                </div>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard('email')}
              disabled={formatLoading.email || !emailOutput}
              className="text-xs px-3 py-1.5 rounded-2xl border border-slate-200 disabled:opacity-50"
            >
              Copy
            </button>
          </div>

          <div className="p-5 space-y-4">
            {formatErrors.email && renderFormatError('email', formatErrors.email)}

            {emailOutput ? (
              <>
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">SUBJECT LINE</div>
                  <div className="text-sm font-medium text-slate-800">{emailOutput.subject_line}</div>
                </div>

                {emailOutput.preview_text && (
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1">PREVIEW TEXT</div>
                    <div className="text-sm text-slate-600">{emailOutput.preview_text}</div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-medium text-slate-500 mb-2">BODY</div>
                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl">
                    {emailOutput.body}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">
                Click Regenerate to generate your email subject line and newsletter draft.
              </p>
            )}
          </div>

          <div className="px-5 py-3 bg-slate-50 border-t flex gap-2">
            <button
              onClick={() => regenerateFormat('email')}
              disabled={formatLoading.email}
              className="flex-1 py-2 text-xs rounded-2xl border border-slate-200 disabled:opacity-50"
            >
              {formatLoading.email ? 'Generating…' : 'Regenerate'}
            </button>
            <button onClick={() => alert("Edit modal coming soon")} className="flex-1 py-2 text-xs rounded-2xl border border-slate-200">Edit</button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 z-50">
        <div className="max-w-screen-md mx-auto flex gap-3">
          <button
            onClick={() => void regenerateAll()}
            disabled={isAnyLoading}
            className="flex-1 py-3 text-sm font-medium rounded-2xl border border-slate-300 disabled:opacity-50"
          >
            {isRegeneratingAll ? 'Regenerating all formats…' : 'Regenerate All'}
          </button>

          <button
            onClick={exportBundle}
            disabled={!xThreadOutput && !linkedinOutput && !instagramOutput && !emailOutput}
            className="flex-1 py-3 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-2xl disabled:opacity-50"
          >
            Export Bundle (Text)
          </button>
        </div>
      </div>

      {isInputModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60]">
          <div className="bg-white w-full sm:w-[480px] sm:rounded-3xl rounded-t-3xl p-5">
            <div className="font-semibold mb-3">Source Content</div>
            <textarea
              className="w-full h-40 border rounded-2xl p-4 text-sm"
              value={draftInputContent}
              onChange={(e) => setDraftInputContent(e.target.value)}
            />
            {inputModalError ? (
              <p className="mt-2 text-xs text-red-600">{inputModalError}</p>
            ) : null}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setIsInputModalOpen(false)} className="flex-1 py-2.5 rounded-2xl border">Cancel</button>
              <button
                onClick={handleInputUpdate}
                disabled={isAnyLoading}
                className="flex-1 py-2.5 rounded-2xl bg-teal-500 text-white font-medium disabled:opacity-50"
              >
                {isAnyLoading ? 'Generating…' : 'Update & Regenerate All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isRegeneratingAll && (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-[70]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-3"></div>
            <p className="text-sm text-slate-600">Generating all formats…</p>
          </div>
        </div>
      )}
    </div>
  );
}
