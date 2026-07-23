"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteAccountForm() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Deletion failed"
        );
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/account-deleted");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deletion failed");
      setLoading(false);
    }
  }

  const canSubmit = confirmation === "DELETE" && !loading;

  return (
    <form onSubmit={handleDelete} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="delete-confirm">
          Type <span className="font-mono font-semibold">DELETE</span> to
          confirm
        </Label>
        <Input
          id="delete-confirm"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="off"
          disabled={loading}
          placeholder="DELETE"
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="destructive" disabled={!canSubmit}>
        {loading ? "Deleting…" : "Permanently delete account"}
      </Button>
    </form>
  );
}
