import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">RepurposeOne</h1>
      <p className="max-w-md text-center text-neutral-600">
        Turn one piece of content into platform-native outputs in your brand voice.
      </p>
      <Link
        href="/test-generate"
        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Test generation endpoint
      </Link>
    </main>
  );
}
