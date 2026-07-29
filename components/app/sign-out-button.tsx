"use client";

import { LogOut } from "lucide-react";
import { useSignOut } from "@/components/app/use-sign-out";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const signOut = useSignOut();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-muted-foreground"
      onClick={() => void signOut()}
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}
