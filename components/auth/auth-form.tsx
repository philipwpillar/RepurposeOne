"use client";

import { useCallback, useEffect, useState } from "react";
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

const RESEND_COOLDOWN_SEC = 60;

const EXISTING_ACCOUNT_MESSAGE =
  "An account with this email already exists. Sign in instead.";

function mapOtpError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("expired")) {
    return "That code has expired. Resend a new one and try again.";
  }
  if (lower.includes("invalid") || lower.includes("otp")) {
    return "That code didn't work. Check it and try again.";
  }
  if (lower.includes("too many") || lower.includes("rate")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  return message;
}

function mapSignUpError(message: string, code?: string): string {
  const lower = message.toLowerCase();
  const lowerCode = (code ?? "").toLowerCase();
  if (
    lowerCode === "user_already_exists" ||
    lowerCode === "email_exists" ||
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("already exists")
  ) {
    return EXISTING_ACCOUNT_MESSAGE;
  }
  return message;
}

/** Confirm-email projects return a fake user with empty identities for duplicates. */
function isExistingAccountSignUp(user: {
  identities?: { id?: string }[] | null;
} | null): boolean {
  return Array.isArray(user?.identities) && user.identities.length === 0;
}

export function AuthForm({
  mode,
  redirectTo = "/dashboard",
  initialError,
}: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  const isSignUp = mode === "sign-up";
  const showGoogle = isGoogleAuthEnabled() && !isNativePlatform();

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const startResendCooldown = useCallback(() => {
    setResendSeconds(RESEND_COOLDOWN_SEC);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    if (isSignUp) {
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            // Keep ConfirmationURL working until the email template also includes
            // {{ .Token }}. Either path completes signup.
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/onboarding")}`,
          },
        });

      if (signUpError) {
        setError(mapSignUpError(signUpError.message, signUpError.code));
        setLoading(false);
        return;
      }

      // With Confirm email enabled, duplicate signups return a fake user
      // (empty identities) and no error — surface that instead of the OTP step.
      if (isExistingAccountSignUp(signUpData.user)) {
        setError(EXISTING_ACCOUNT_MESSAGE);
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.push("/onboarding");
        router.refresh();
      } else {
        setAwaitingOtp(true);
        setOtpCode("");
        startResendCooldown();
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

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const token = otpCode.trim();
    if (token.length < 6) {
      setError("Enter the 6-digit code from your email.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    if (verifyError) {
      setError(mapOtpError(verifyError.message));
      setLoading(false);
      return;
    }

    router.push("/onboarding");
    router.refresh();
    setLoading(false);
  }

  async function handleResendCode() {
    if (resendSeconds > 0) return;

    setError("");
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (resendError) {
      setError(mapOtpError(resendError.message));
      return;
    }

    startResendCooldown();
  }

  if (awaitingOtp) {
    return (
      <div className="vo-auth-confirm space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.15)]">
          <Mail className="h-5 w-5 text-[color:var(--teal)]" aria-hidden />
        </div>
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Enter your code
        </h1>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-foreground">{email}</span>. Paste it
          below to finish creating your account.
        </p>

        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp-code">Confirmation code</Label>
            <Input
              id="otp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="123456"
              value={otpCode}
              onChange={(event) =>
                setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
            />
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Verify and continue
          </Button>
        </form>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full border-white/15 bg-transparent text-foreground hover:bg-white/5"
            disabled={resendSeconds > 0 || loading}
            onClick={() => void handleResendCode()}
          >
            {resendSeconds > 0
              ? `Resend code in ${resendSeconds}s`
              : "Resend code"}
          </Button>
          <Button
            asChild
            variant="ghost"
            className="w-full text-muted-foreground"
          >
            <Link href="/sign-in">Back to sign in</Link>
          </Button>
        </div>
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
            ? "Start free - teach your voice, then generate your first drafts."
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
