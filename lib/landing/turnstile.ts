interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

/** Returns true when verification passes. Skips when secret is unset (local/CI). */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp: string | null
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;

  if (!token?.trim()) return false;

  const body = new URLSearchParams({
    secret,
    response: token.trim(),
  });
  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  if (!response.ok) return false;

  const data = (await response.json()) as TurnstileVerifyResponse;
  return data.success === true;
}
