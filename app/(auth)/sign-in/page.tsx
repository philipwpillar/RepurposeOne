import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

interface SignInPageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirect ?? "/dashboard";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <Link href="/" className="text-xl font-bold tracking-tight">
        RepurposeOne
      </Link>
      <AuthForm
        mode="sign-in"
        redirectTo={redirectTo}
        initialError={params.error}
      />
    </div>
  );
}
