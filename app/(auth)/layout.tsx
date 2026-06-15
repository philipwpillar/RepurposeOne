// Route group for unauthenticated auth pages (sign-in, sign-up).
// No shared layout chrome yet — pages render their own centered card UI.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
