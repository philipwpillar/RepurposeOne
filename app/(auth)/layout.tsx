// Route group for unauthenticated auth pages (sign-in, sign-up).
// Shared aurora chrome lives in AuthShell.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
