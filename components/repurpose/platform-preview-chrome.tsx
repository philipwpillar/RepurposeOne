import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlatformAuthorRow({
  name,
  handle,
  avatarClassName,
}: {
  name: string;
  handle: string;
  avatarClassName?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <div
        className={cn(
          "h-10 w-10 flex-shrink-0 rounded-full bg-muted",
          avatarClassName
        )}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{handle}</p>
      </div>
    </div>
  );
}

export function InstagramPhotoFrame({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mb-4 flex aspect-square w-full max-w-sm items-center justify-center rounded-xl border border-border bg-muted/40",
        className
      )}
    >
      <div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
        <ImageIcon className="h-6 w-6" aria-hidden />
        Your photo goes here
      </div>
    </div>
  );
}

export function EmailInboxChrome({
  subject,
  previewText,
}: {
  subject: string;
  previewText?: string | null;
}) {
  return (
    <div className="mb-4 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 border-b border-border pb-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Inbox</span>
        <span>·</span>
        <span>Just now</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-foreground">{subject}</p>
      {previewText ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {previewText}
        </p>
      ) : null}
    </div>
  );
}

export function LinkedInEngagementBar() {
  return (
    <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
      <span>Like</span>
      <span>Comment</span>
      <span>Repost</span>
      <span>Send</span>
    </div>
  );
}
