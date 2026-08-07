"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Plan } from "@/types";
import {
  EMPTY_PHOTO_INPUT_STATE,
  type PhotoInputReady,
  type PhotoInputState,
} from "@/types/photo-input";
import {
  PHOTO_ACCEPT_ATTRIBUTE,
  PHOTO_CONTEXT_MIN_LENGTH,
} from "@/lib/image/constants";
import { downscaleImage, validateImageFile } from "@/lib/image/downscale";
import PhotoDropZone from "./PhotoDropZone";
import PhotoPreviewCard from "./PhotoPreviewCard";
import PhotoContextForm from "./PhotoContextForm";
import PhotoUpgradeGate from "./PhotoUpgradeGate";

interface PhotoInputSectionProps {
  userPlan: Plan;
  disabled?: boolean;
  onReadyChange: (ready: PhotoInputReady | null) => void;
  native?: boolean;
}

export default function PhotoInputSection({
  userPlan,
  disabled = false,
  onReadyChange,
  native = false,
}: PhotoInputSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<PhotoInputState>(EMPTY_PHOTO_INPUT_STATE);
  const [context, setContext] = useState("");
  const [cta, setCta] = useState("");
  const [processing, setProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);

  const revokePreview = useCallback((previewUrl: string | null) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, []);

  useEffect(() => {
    return () => {
      revokePreview(photo.previewUrl);
    };
  }, [photo.previewUrl, revokePreview]);

  const buildReady = useCallback((): PhotoInputReady | null => {
    const trimmedContext = context.trim();
    if (
      !photo.imageBase64 ||
      !photo.mimeType ||
      trimmedContext.length < PHOTO_CONTEXT_MIN_LENGTH
    ) {
      return null;
    }

    const ready: PhotoInputReady = {
      imageBase64: photo.imageBase64,
      mimeType: photo.mimeType,
      context: trimmedContext,
    };

    const trimmedCta = cta.trim();
    if (trimmedCta) {
      ready.cta = trimmedCta;
    }

    return ready;
  }, [context, cta, photo.imageBase64, photo.mimeType]);

  useEffect(() => {
    onReadyChange(buildReady());
  }, [buildReady, onReadyChange]);

  const validateContext = () => {
    const trimmed = context.trim();
    if (trimmed.length > 0 && trimmed.length < PHOTO_CONTEXT_MIN_LENGTH) {
      setContextError(
        `Context must be at least ${PHOTO_CONTEXT_MIN_LENGTH} characters.`
      );
      return false;
    }
    setContextError(null);
    return true;
  };

  const handleFile = async (file: File) => {
    const fileValidation = validateImageFile(file);
    if (!fileValidation.ok) {
      setValidationError(fileValidation.error);
      return;
    }

    setValidationError(null);
    setProcessing(true);

    try {
      const result = await downscaleImage(file);
      setPhoto((prev) => {
        revokePreview(prev.previewUrl);
        return {
          imageBase64: result.base64,
          mimeType: result.mimeType,
          fileName: file.name,
          width: result.width,
          height: result.height,
          byteSize: result.byteSize,
          previewUrl: result.previewUrl,
        };
      });
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : "Failed to process image."
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleRemove = () => {
    setPhoto((prev) => {
      revokePreview(prev.previewUrl);
      return EMPTY_PHOTO_INPUT_STATE;
    });
    setValidationError(null);
  };

  const handleChange = () => {
    fileInputRef.current?.click();
  };

  const hasPreview =
    photo.previewUrl &&
    photo.fileName &&
    photo.width &&
    photo.height &&
    photo.byteSize;

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={PHOTO_ACCEPT_ATTRIBUTE}
        className="sr-only"
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
          event.target.value = "";
        }}
      />

      {hasPreview ? (
        <PhotoPreviewCard
          previewUrl={photo.previewUrl!}
          fileName={photo.fileName!}
          width={photo.width!}
          height={photo.height!}
          byteSize={photo.byteSize!}
          disabled={disabled || processing}
          onChange={handleChange}
          onRemove={handleRemove}
        />
      ) : (
        <PhotoDropZone
          processing={processing}
          disabled={disabled}
          onFileSelect={(file) => void handleFile(file)}
        />
      )}

      <PhotoContextForm
        context={context}
        cta={cta}
        contextError={contextError}
        disabled={disabled || processing}
        onContextChange={setContext}
        onCtaChange={setCta}
        onContextBlur={validateContext}
      />

      {validationError ? (
        <div className="mb-5 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          {validationError}
        </div>
      ) : null}

      <PhotoUpgradeGate plan={userPlan} native={native} />
    </div>
  );
}
