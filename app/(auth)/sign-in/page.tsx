import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { safeRedirectPath } from "@/lib/safe-redirect";
import "@/app/landing.css";

interface SignInPageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const redirectTo = safeRedirectPath(params.redirect);

  return (
    <AuthShell
      footerNote={
        <>
          By continuing you agree to our{" "}
          <a href="/terms" className="underline underline-offset-2 hover:text-foreground">
            Terms
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </a>
          .
        </>
      }
    >
      <AuthForm
        mode="sign-in"
        redirectTo={redirectTo}
        initialError={params.error}
      />
    </AuthShell>
  );
}
