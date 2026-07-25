import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import "@/app/landing.css";

interface SignUpPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirect ?? "/dashboard";

  return (
    <AuthShell
      footerNote={
        <>
          Free plan included. By creating an account you agree to our{" "}
          <a href="/terms" className="underline underline-offset-2 hover:text-[#F4F4F5]">
            Terms
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-[#F4F4F5]">
            Privacy Policy
          </a>
          .
        </>
      }
    >
      <AuthForm mode="sign-up" redirectTo={redirectTo} />
    </AuthShell>
  );
}
