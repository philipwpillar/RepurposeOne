import Image from "next/image";
import { cn } from "@/lib/utils";

export interface UserAvatarUser {
  name: string;
  avatarUrl?: string;
}

export function UserAvatar({
  user,
  size = "md",
}: {
  user: UserAvatarUser;
  size?: "sm" | "md";
}) {
  const px = size === "sm" ? 32 : 36;
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm";

  if (user.avatarUrl) {
    return (
      <Image
        src={user.avatarUrl}
        alt=""
        width={px}
        height={px}
        className={cn(sizeClass, "rounded-full object-cover ring-2 ring-background")}
      />
    );
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      aria-hidden="true"
      className={cn(
        sizeClass,
        "flex items-center justify-center rounded-full bg-primary/20 font-medium text-primary ring-2 ring-background"
      )}
    >
      {initials}
    </div>
  );
}
