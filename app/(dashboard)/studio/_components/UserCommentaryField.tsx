"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { USER_COMMENTARY_MAX_LENGTH } from "@/lib/config";

interface UserCommentaryFieldProps {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export default function UserCommentaryField({
  value,
  disabled = false,
  onChange,
}: UserCommentaryFieldProps) {
  return (
    <div className="mb-5 space-y-1.5">
      <Label htmlFor="user-commentary">
        Your take{" "}
        <span className="font-normal text-muted-foreground">(optional)</span>
      </Label>
      <Textarea
        id="user-commentary"
        value={value}
        disabled={disabled}
        maxLength={USER_COMMENTARY_MAX_LENGTH}
        placeholder="Emphasize the contrarian angle - I think the real insight is X, not Y."
        className="min-h-[72px] rounded-2xl"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
