export default function AuthLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4 text-foreground">
      <span className="text-xl font-bold tracking-tight">
        Voice<span className="text-primary">ora</span>
      </span>
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
