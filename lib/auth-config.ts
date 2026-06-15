/** Google OAuth is opt-in via env — email/password works standalone without it. */
export function isGoogleAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
}
