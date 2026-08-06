import Link from "next/link";

export default function AccountDeletedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-page-title">Account deleted</h1>
      <p className="mt-3 text-muted-foreground">
        Your Voiceora account and associated app data have been deleted. If you
        have questions, contact{" "}
        <a
          href="mailto:support@voiceora.io"
          className="text-foreground underline underline-offset-4"
        >
          support@voiceora.io
        </a>
        .
      </p>
      <Link
        href="/"
        className="mt-8 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Back to home
      </Link>
    </main>
  );
}
