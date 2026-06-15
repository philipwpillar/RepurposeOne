import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

interface SignUpPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirect ?? "/dashboard";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <Link href="/" className="text-xl font-bold tracking-tight">
        RepurposeOne
      </Link>
      <AuthForm mode="sign-up" redirectTo={redirectTo} />
    </div>
  );
}
