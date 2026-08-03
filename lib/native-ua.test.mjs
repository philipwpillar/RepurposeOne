import assert from "node:assert/strict";
import test from "node:test";
import { isNativeUserAgent, NATIVE_UA_TOKEN } from "./native-ua.ts";

test("isNativeUserAgent detects Capacitor appendUserAgent token", () => {
  assert.equal(
    isNativeUserAgent(
      `Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 VoiceoraiOS/1`
    ),
    true
  );
  assert.equal(
    isNativeUserAgent(`Something ${NATIVE_UA_TOKEN} something`),
    true
  );
});

test("isNativeUserAgent rejects Safari and empty UAs", () => {
  assert.equal(
    isNativeUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
    ),
    false
  );
  assert.equal(isNativeUserAgent(null), false);
  assert.equal(isNativeUserAgent(""), false);
  assert.equal(isNativeUserAgent("Voiceora"), false);
});
