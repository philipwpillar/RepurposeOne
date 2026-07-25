"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { isGoogleAuthEnabled } from "@/lib/auth-config";
import { isNativePlatform } from "@/lib/platform";
import { Separator } from "@/components/ui/separator";
import "@/app/landing.css";

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
  redirectTo?: string;
  initialError?: string;
}

export function AuthForm({
  mode,
  redirectTo = "/dashboard",
  initialError,
}: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [message, setMessage] = useState("");
  const [awaitingEmail, setAwaitingEmail] = useState(false);

  const isSignUp = mode === "sign-up";
  const showGoogle = isGoogleAuthEnabled() && !isNativePlatform();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const supabase = createClient();

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.push(redirectTo);
        router.refresh();
      } else {
        setAwaitingEmail(true);
        setMessage(
          "Check your email for a confirmation link, then sign in to continue."
        );
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    }

    setLoading(false);
  }

  if (awaitingEmail) {
    return (
      <div className="vo-auth-confirm space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.15)]">
          <Mail className="h-5 w-5 text-[color:var(--teal)]" aria-hidden />
        </div>
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Check your inbox
        </h1>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to{" "}
          <span className="font-medium text-foreground">{email}</span>. Open it,
          then sign in to finish setup.
        </p>
        {message ? (
          <p className="text-xs text-muted-foreground" role="status">
            {message}
          </p>
        ) : null}
        <Button asChild variant="outline" className="w-full border-white/15 bg-transparent text-foreground hover:bg-white/5">
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <Card className="vo-auth-card w-full max-w-md border-0 shadow-none">
      <CardHeader className="text-center">
        <h1 className="font-display text-2xl text-foreground">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <CardDescription>
          {isSignUp
            ? "Start free — teach your voice, then generate your first drafts."
            : "Sign in to continue to Voiceora"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showGoogle ? (
          <GoogleSignInButton
            redirectTo={redirectTo}
            onError={(msg) => setError(msg)}
          />
        ) : null}

        {showGoogle ? (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[color:var(--panel-translucent)] px-2 text-muted-foreground">
                or continue with email
              </span>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder={isSignUp ? "Min. 6 characters" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {isSignUp ? (
          <>
            Already have an account?{" "}
            <Link
              href={`/sign-in${redirectTo !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
              className="ml-1 font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <Link
              href={`/sign-up${redirectTo !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`}
              className="ml-1 font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign up
            </Link>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
