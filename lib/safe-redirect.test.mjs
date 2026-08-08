import assert from "node:assert/strict";
import test from "node:test";
import { safeRedirectPath, safeRedirectUrl } from "./safe-redirect.ts";

test("safeRedirectPath allows same-origin relative paths", () => {
  assert.equal(safeRedirectPath("/studio"), "/studio");
  assert.equal(safeRedirectPath("/account?tab=billing"), "/account?tab=billing");
});

test("safeRedirectPath rejects protocol-relative and absolute URLs", () => {
  assert.equal(safeRedirectPath("//evil.com"), "/dashboard");
  assert.equal(safeRedirectPath("https://evil.com"), "/dashboard");
  assert.equal(safeRedirectPath(null), "/dashboard");
  assert.equal(safeRedirectPath(undefined), "/dashboard");
});

test("safeRedirectUrl returns same-origin URL or dashboard fallback", () => {
  const requestUrl = "https://www.voiceora.io/auth/callback?code=x";
  const origin = "https://www.voiceora.io";

  assert.equal(
    safeRedirectUrl("/onboarding", requestUrl, origin).href,
    "https://www.voiceora.io/onboarding"
  );
  assert.equal(
    safeRedirectUrl("//evil.com", requestUrl, origin).href,
    "https://www.voiceora.io/dashboard"
  );
  assert.equal(
    safeRedirectUrl("/..//evil.com", requestUrl, origin).href,
    "https://www.voiceora.io/dashboard"
  );
});
