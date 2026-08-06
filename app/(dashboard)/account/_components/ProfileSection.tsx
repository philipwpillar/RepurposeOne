"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/components/app/sign-out-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileSectionProps = {
  email: string | undefined;
  displayName: string;
  avatarUrl: string | undefined;
  signedInVia: string;
};

export function ProfileSection({
  email,
  displayName,
  avatarUrl,
  signedInVia,
}: ProfileSectionProps) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Display name cannot be empty.");
      setSaving(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: trimmed, name: trimmed },
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update name");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="profile" className="space-y-4 scroll-mt-20">
      <div>
        <h2 className="text-section">Profile</h2>
        <p className="text-sm text-muted-foreground">
          How you appear in Voiceora. Email changes are not available in-app
          yet.
        </p>
      </div>

      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name}
            width={56}
            height={56}
            className="h-14 w-14 rounded-full object-cover ring-2 ring-background"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary ring-2 ring-background">
            {initials || "?"}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-medium">{displayName}</p>
          {email ? (
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Signed in via {signedInVia}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            disabled={saving}
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="account-email">Email</Label>
          <Input
            id="account-email"
            value={email ?? ""}
            disabled
            readOnly
            autoComplete="email"
          />
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="text-sm text-muted-foreground" role="status">
            Display name saved.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving || name.trim() === displayName}>
            {saving ? "Saving…" : "Save name"}
          </Button>
          <div className="w-full sm:w-auto">
            <SignOutButton />
          </div>
        </div>
      </form>
    </section>
  );
}
