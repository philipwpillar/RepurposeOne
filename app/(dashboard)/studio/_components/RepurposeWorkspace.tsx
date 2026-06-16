"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { INPUT_CONTENT_MIN_LENGTH } from '@/lib/config';
import type {
  BrandVoiceInput,
  GenerateErrorResponse,
  GenerateSuccessResponse,
  XThreadOutput,
} from '@/types';

const TWITTER_LENGTH_MIN = 3;
const TWITTER_LENGTH_MAX = 15;

function clampTargetTweets(count: number): number {
  return Math.min(TWITTER_LENGTH_MAX, Math.max(TWITTER_LENGTH_MIN, count));
}

function formatXThreadOutput(output: XThreadOutput): string {
  return output.tweets.map((tweet) => tweet.text).join('\n\n');
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
  
  // === State ===
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
  const [twitterOutput, setTwitterOutput] = useState(
    initialTwitterOutput ??
      "I launched my first SaaS in 30 days while keeping my day job.\nHere’s the exact playbook I used (and the costly mistakes I made)."
  );
  const [isTwitterLoading, setIsTwitterLoading] = useState(false);
  const [twitterError, setTwitterError] = useState<string | null>(null);
  
  const [linkedinSlides, setLinkedinSlides] = useState([
    "The harsh truth about launching a SaaS while employed full-time",
    "Week 1: Validating the idea without writing code",
    "The tech stack I chose (and the one decision I regret)",
    "How I got my first 47 paying customers",
    "The 3 mistakes that almost killed the launch"
  ]);

  const [isLoading, setIsLoading] = useState(false);

  // === Handlers ===
  const openInputModal = () => {
    setDraftInputContent(inputSummary);
    setInputModalError(null);
    setIsInputModalOpen(true);
  };
  const callGenerateApi = async (
    inputContent: string,
    targetTweets: number
  ): Promise<XThreadOutput> => {
    // TODO: wire to real brand voice
    const brandVoice: BrandVoiceInput = {
      samples: [],
      description: 'Professional, UK founder',
    };

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input_type: 'paste',
        input_content: inputContent,
        target_format: 'x_thread',
        target_tweets: clampTargetTweets(targetTweets),
        brand_voice: brandVoice,
      }),
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
    if (!data.output || data.output.format !== 'x_thread') {
      throw new Error('Unexpected response from generation API');
    }

    return data.output;
  };

  const generateTwitter = async (
    lengthOverride?: number,
    inputContentOverride?: string
  ) => {
    const trimmed = (inputContentOverride ?? inputSummary).trim();
    if (trimmed.length < INPUT_CONTENT_MIN_LENGTH) {
      setTwitterError(
        `Source content must be at least ${INPUT_CONTENT_MIN_LENGTH} characters.`
      );
      return;
    }

    const targetLength = clampTargetTweets(lengthOverride ?? pendingTwitterLength);
    setTwitterError(null);
    setIsTwitterLoading(true);
    setIsLoading(true);

    try {
      const output = await callGenerateApi(trimmed, targetLength);
      const displayText = formatXThreadOutput(output);

      setTwitterLength(targetLength);
      setPendingTwitterLength(targetLength);
      setTwitterOutput(displayText);
      onTwitterGenerate?.(displayText);
    } catch (err) {
      console.error(err);
      setTwitterError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while generating the Twitter thread. Please try again.'
      );
    } finally {
      setIsTwitterLoading(false);
      setIsLoading(false);
    }
  };

  const handleApplyTwitterLength = () => {
    void generateTwitter(pendingTwitterLength);
  };

  const addLinkedInSlide = () => {
    const newSlide = prompt("New slide title:");
    if (newSlide?.trim()) {
      setLinkedinSlides([...linkedinSlides, newSlide.trim()]);
    }
  };

  const removeLinkedInSlide = (index: number) => {
    if (linkedinSlides.length <= 3) {
      alert("Minimum 3 slides recommended");
      return;
    }
    setLinkedinSlides(linkedinSlides.filter((_, i) => i !== index));
  };

  const regenerateFormat = (format: string) => {
    if (format === 'twitter') {
      void generateTwitter();
    }
  };

  const regenerateAll = () => {
    void generateTwitter();
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
    void generateTwitter(undefined, trimmed);
  };

  const copyToClipboard = (format: string) => {
    if (format === 'twitter') {
      void navigator.clipboard.writeText(twitterOutput);
    }
  };

  const exportBundle = () => {
    // MVP: Only Markdown + text (no images)
    alert("Exporting as Markdown + Plain Text bundle (MVP scope)");
  };

  // === Render ===
  return (
    <div className="max-w-screen-md mx-auto px-4 pt-6 pb-24 bg-slate-50 min-h-screen">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Content Studio</h1>
        <p className="text-sm text-slate-500 mt-1">One input → Multiple high-quality outputs</p>
      </div>

      {/* Input Summary (Collapsed) */}
      <div 
        onClick={openInputModal}
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
            onClick={(e) => { e.stopPropagation(); openInputModal(); }}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            Change
          </button>
        </div>
      </div>

      {/* Brand Voice + Time Saved + Usage */}
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

        {/* Time Saved */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2 flex items-center gap-x-2">
          <i className="fas fa-clock text-emerald-500"></i>
          <div className="text-sm">
            <span className="font-medium text-emerald-700">~40 min saved</span>
            <span className="text-emerald-600 text-xs ml-1">(~10 min × 4 formats)</span>
          </div>
        </div>
      </div>

      {/* Usage Indicator (MVP) */}
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

      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="text-xs font-semibold tracking-wider text-slate-500">GENERATED OUTPUTS</div>
        <div className="text-xs text-slate-500">4 formats</div>
      </div>

      {/* Artboards */}
      <div className="space-y-4">
        
        {/* X / Twitter */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b">
            <div className="flex items-center gap-x-3">
              <i className="fab fa-x-twitter text-xl"></i>
              <div>
                <div className="font-semibold">X / Twitter Thread</div>
                <div className="text-xs text-slate-500">{twitterLength} tweets</div>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard('twitter')}
              disabled={isTwitterLoading}
              className="text-xs px-3 py-1.5 rounded-2xl border border-slate-200 disabled:opacity-50"
            >
              Copy
            </button>
          </div>

          <div className="p-5">
            <div className="text-sm text-slate-700 mb-4 leading-relaxed whitespace-pre-line">
              {twitterOutput}
            </div>

            {twitterError && (
              <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-2xl px-3 py-2 flex items-start gap-2">
                <i className="fas fa-exclamation-circle mt-0.5"></i>
                <div className="flex-1">
                  <div>{twitterError}</div>
                  <button
                    type="button"
                    onClick={() => void generateTwitter()}
                    className="mt-1 text-[11px] font-medium text-red-700 underline underline-offset-2"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {/* Twitter Length Control */}
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
                  disabled={isTwitterLoading}
                  className="text-xs px-4 py-1.5 rounded-2xl bg-teal-500 text-white font-medium disabled:opacity-50"
                >
                  {isTwitterLoading ? 'Generating...' : 'Apply & Regenerate'}
                </button>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 bg-slate-50 border-t flex gap-2">
            <button
              onClick={() => regenerateFormat('twitter')}
              disabled={isTwitterLoading}
              className="flex-1 py-2 text-xs rounded-2xl border border-slate-200 disabled:opacity-50"
            >
              {isTwitterLoading ? 'Generating…' : 'Regenerate'}
            </button>
            <button onClick={() => alert("Edit modal coming soon")} className="flex-1 py-2 text-xs rounded-2xl border border-slate-200">Edit</button>
          </div>
        </div>

        {/* LinkedIn Carousel */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b">
            <div className="flex items-center gap-x-3">
              <i className="fab fa-linkedin text-xl text-blue-600"></i>
              <div>
                <div className="font-semibold">LinkedIn Carousel</div>
                <div className="text-xs text-slate-500">
                  {linkedinSlides.length} slides • <span className="font-medium text-amber-600">Coming soon</span>
                </div>
              </div>
            </div>
            <button
              disabled
              title="Coming soon"
              className="text-xs px-3 py-1.5 rounded-2xl border border-slate-200 opacity-50 cursor-not-allowed"
            >
              Copy
            </button>
          </div>

          <div className="p-5 space-y-2">
            {linkedinSlides.map((slide, index) => (
              <div key={index} className="flex items-start gap-3 bg-slate-50 p-3 rounded-2xl text-sm">
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">{index + 1}</div>
                <div className="flex-1">{slide}</div>
                <button onClick={() => removeLinkedInSlide(index)} className="text-slate-400 hover:text-red-500">
                  <i className="fas fa-times text-xs"></i>
                </button>
              </div>
            ))}
            
            <button onClick={addLinkedInSlide} className="w-full py-2 text-xs border border-dashed border-slate-300 rounded-2xl hover:border-teal-300">
              + Add Slide
            </button>
          </div>

          <div className="px-5 py-3 bg-slate-50 border-t flex gap-2">
            <button
              disabled
              title="Coming soon"
              className="flex-1 py-2 text-xs rounded-2xl border border-slate-200 opacity-50 cursor-not-allowed"
            >
              Regenerate
            </button>
            <button onClick={() => alert("Edit modal coming soon")} className="flex-1 py-2 text-xs rounded-2xl border border-slate-200">Edit</button>
          </div>
        </div>

        {/* Instagram & Email (simplified for brevity) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5">
          <div className="font-semibold mb-2">
            Instagram Caption <span className="ml-1 text-[11px] font-medium text-amber-600">Coming soon</span>
          </div>
          <div className="text-sm text-slate-700">Built my first SaaS in 30 days while working full-time. Here’s the exact framework.</div>
          <div className="flex gap-2 mt-3">
            <button
              disabled
              title="Coming soon"
              className="flex-1 py-2 text-xs rounded-2xl border border-slate-200 opacity-50 cursor-not-allowed"
            >
              Regenerate
            </button>
            <button
              disabled
              title="Coming soon"
              className="flex-1 py-2 text-xs rounded-2xl border border-slate-200 opacity-50 cursor-not-allowed"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5">
          <div className="font-semibold mb-2">
            Email Newsletter <span className="ml-1 text-[11px] font-medium text-amber-600">Coming soon</span>
          </div>
          <div className="text-sm text-slate-700">Subject: How I launched a SaaS in 30 days (while keeping my job)</div>
          <div className="flex gap-2 mt-3">
            <button
              disabled
              title="Coming soon"
              className="flex-1 py-2 text-xs rounded-2xl border border-slate-200 opacity-50 cursor-not-allowed"
            >
              Regenerate
            </button>
            <button
              disabled
              title="Coming soon"
              className="flex-1 py-2 text-xs rounded-2xl border border-slate-200 opacity-50 cursor-not-allowed"
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 z-50">
        <div className="max-w-screen-md mx-auto flex gap-3">
          <button 
            onClick={regenerateAll} 
            disabled={isLoading}
            className="flex-1 py-3 text-sm font-medium rounded-2xl border border-slate-300 disabled:opacity-50"
          >
            {isLoading ? "Regenerating X / Twitter…" : "Regenerate X / Twitter"}
          </button>
          
          <button 
            onClick={exportBundle} 
            className="flex-1 py-3 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-2xl"
          >
            Export Bundle (Text)
          </button>
        </div>
      </div>

      {/* Input Modal */}
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
                disabled={isTwitterLoading}
                className="flex-1 py-2.5 rounded-2xl bg-teal-500 text-white font-medium disabled:opacity-50"
              >
                {isTwitterLoading ? 'Generating…' : 'Update & Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-[70]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-3"></div>
            <p className="text-sm text-slate-600">Generating high-quality outputs...</p>
          </div>
        </div>
      )}
    </div>
  );
}