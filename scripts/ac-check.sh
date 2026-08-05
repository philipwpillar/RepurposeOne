#!/usr/bin/env bash
# Voiceora acceptance-criteria harness.
#   Usage:  bash scripts/ac-check.sh [floor|0|1|2|3|4|5|6|7|8|all]
#   Every check is a count. Exits 1 if any assertion in the selected phase fails.
#   Requires: ripgrep (rg). Run from the repo root.
set -uo pipefail
command -v rg >/dev/null || { echo "FATAL: ripgrep (rg) not installed — brew install ripgrep"; exit 2; }

PHASE="${1:-floor}"; FAIL=0

A='app'; C='components'
W='app/(dashboard)/studio/_components/RepurposeWorkspace.tsx'

# Files where raw hex is legitimate and permanent.
#  globals.css              — the token source of truth
#  app/global-error.tsx     — replaces the root layout; globals.css is NOT loaded
#  app/loading.tsx          — SVG gradient stopColor attributes
#  vo-logo-mark.tsx         — SVG gradient stopColor attributes
#  google-sign-in-button    — Google brand marks, fixed by Google branding guidelines
#  app/dev/**               — dev-only harness, never shipped
#  opengraph-image / icon / apple-icon — Satori (no stylesheet; CSS vars unavailable)
#  app/manifest.ts — Web App Manifest requires literal hex theme/background colors
HEXALLOW=(-g '!**/globals.css' -g '!app/global-error.tsx' -g '!app/loading.tsx' \
          -g '!components/landing/vo-logo-mark.tsx' -g '!app/dev/**' \
          -g '!components/auth/google-sign-in-button.tsx' \
          -g '!app/opengraph-image.tsx' -g '!app/icon.tsx' -g '!app/apple-icon.tsx' \
          -g '!app/manifest.ts')

# Files where raw <img> is legitimate: local object-URL/blob previews that
# next/image cannot optimise, plus the dev harness.
IMGALLOW=(-g '!app/dev/**' -g '!**/BundlePhotoPicker.tsx' -g '!**/BundleVideoPicker.tsx' \
          -g '!**/BundleWorkspace.tsx' -g '!**/PhotoPreviewCard.tsx')

# Collects rg invocation failures so they can't hide behind a count of 0.
RGERR="$(mktemp)"; trap 'rm -f "$RGERR"' EXIT

# rg exit codes: 0 = matched, 1 = no match, >=2 = error (bad regex, bad path).
# Discarding stderr turns a regex parse error into a silent "0 matches", which
# makes every `eq 0` gate pass vacuously. Errors are recorded and force a FAIL.
#
# NEVER write \" inside an rg pattern. The regex crate accepts an escaped quote
# on rg 15 but rejects it on rg 13 ("unrecognized escape sequence"), so such a
# gate passes on one machine and fails on another. Quotes need no escaping;
# inside a single-quoted shell string, write them bare.
n(){
  local out rc
  out="$(rg -n --no-heading "$@" 2>&1)"; rc=$?
  if [ "$rc" -ge 2 ]; then
    { echo "rg exit $rc for: $*"; printf '%s\n' "$out"; } >>"$RGERR"
    echo 0; return
  fi
  [ "$rc" -eq 1 ] && { echo 0; return; }
  printf '%s\n' "$out" | wc -l | tr -d ' '
}
f(){ ls $1 >/dev/null 2>&1 && echo 1 || echo 0; }

# assert <label> <actual> <op> <expected>      op: eq | ge | le
assert(){
  local label="$1" got="$2" op="$3" want="$4" ok=0
  case "$op" in
    eq) [ "$got" -eq "$want" ] && ok=1 ;;
    ge) [ "$got" -ge "$want" ] && ok=1 ;;
    le) [ "$got" -le "$want" ] && ok=1 ;;
  esac
  if [ $ok -eq 1 ]; then printf "  PASS  %-38s %s %s %s\n" "$label" "$got" "$op" "$want"
  else printf "  FAIL  %-38s %s %s %s\n" "$label" "$got" "$op" "$want"; FAIL=1; fi
}

run_floor(){
  echo "── GLOBAL FLOOR (every phase) ──"
  assert "no obsolete armv7 capability"  "$(n 'armv7' ios/App/App/Info.plist)" eq 0
  assert "export compliance declared"    "$(n -U 'ITSAppUsesNonExemptEncryption</key>\s*<false/>' ios/App/App/Info.plist)" ge 1
  assert "no window.confirm / alert()"      "$(n 'window\.confirm|(^|[^.[:alnum:]_])alert\(' $A $C)" eq 0
  assert "live regions preserved"           "$(n 'aria-live|role="status"|role="alert"' $A $C)" ge 11
  assert "prefers-reduced-motion present"   "$(n 'prefers-reduced-motion' $A $C)" ge 4
  # Net count vs origin/main — line-level diff false-positives on moved hex (e.g. CardTitle→h1).
  BASE_HEX=$(git --no-pager grep -cE '(text|bg|border|ring|fill|stroke|from|via|to|shadow|outline|placeholder|accent|caret|divide)-\[#' origin/main -- app components 2>/dev/null | awk -F: '{s+=$NF} END {print s+0}')
  NOW_HEX=$(n '(text|bg|border|ring|fill|stroke|from|via|to|shadow|outline|placeholder|accent|caret|divide)-\[#' $A $C)
  assert "no NET Tailwind arbitrary hex added" "$NOW_HEX" le "$BASE_HEX"
  # Typographic dashes banned in app/components (UI + CSS). lib/ai/strip-em-dashes.ts
  # is intentionally out of scope so the stripper can still match — – ―.
  assert "no em/en/horizontal dashes in UI"  "$(n '[—–―]' $A $C)" eq 0
  # Holding / auth surface regression gates (B2, 2026-08-04).
  # Fixed-string '"/api/stripe"' must stay eq 0 so checkout/portal are never
  # allowlisted; '/api/stripe/webhook' is a longer literal and does not match.
  assert "webhook exempt present"           "$(n '/api/stripe/webhook' middleware.ts)" ge 2
  assert "webhook exempt wired"             "$(n 'SESSION_EXEMPT_PREFIXES\.some' middleware.ts)" ge 1
  assert "privacy allowlisted"              "$(n '/privacy' middleware.ts)" ge 1
  assert "terms allowlisted"                "$(n '/terms' middleware.ts)" ge 1
  assert "no over-broad stripe prefix"      "$(n -F '"/api/stripe"' middleware.ts)" eq 0
  assert "bundles protected"                "$(n '/bundles' lib/supabase/middleware.ts)" ge 1
  assert "sentry nav instrumentation"       "$(n 'onRouterTransitionStart' instrumentation-client.ts)" ge 1
  # Studio generate fence (ratified 2026-07-23; floor re-spec proposed 2026-07-30).
  # Floors use current counts (ge N) so UI additions around the fence do not
  # break the gate, while deletions of usage-sync or error classes still fail.
  # Usage sync must stay consolidated: error path uses apiErr; success uses usage.
  echo "── FENCE (assert only if the PR touches Studio) ──"
  assert "GenerateApiError present"         "$(n 'GenerateApiError' "$W")" ge 8
  assert "PhotoGenerateApiError present"    "$(n 'PhotoGenerateApiError' "$W")" ge 2
  assert "callGenerateApi present"          "$(n 'callGenerateApi' "$W")" ge 3
  assert "callPhotoGenerateApi present"     "$(n 'callPhotoGenerateApi' "$W")" ge 2
  assert "resolveGenerateError present"     "$(n 'resolveGenerateError' "$W")" ge 1
  assert "setUsedCount(apiErr.usage.used)"  "$(n 'setUsedCount\(apiErr\.usage\.used\)' "$W")" eq 1
  assert "setUsedCount(usage.used) success" "$(n 'setUsedCount\(usage\.used\)' "$W")" ge 3
  assert "no obsolete setUsedCount(err…)"   "$(n 'setUsedCount\(err\.usage\.used\)' "$W")" eq 0
  # Voice variant adjective denylist - only when the catalog/tests exist (#107+).
  # Requires Node 22+ (package.json uses --experimental-strip-types).
  if [ -f lib/ai/voice-variants.test.mjs ]; then
    VV_OUT=$(mktemp)
    if ! npm run test:voice-variants >"$VV_OUT" 2>&1; then
      printf "  FAIL  %-38s %s\n" "voice-variants adjective denylist" "npm run test:voice-variants"; FAIL=1
      sed 's/^/         /' "$VV_OUT" >&2
    else
      printf "  PASS  %-38s %s\n" "voice-variants adjective denylist" "ok"
    fi
    rm -f "$VV_OUT"
  fi
  # App icon must stay opaque RGB (PNG colour type 2). Types 4/6 mean alpha —
  # a recurring App Store rejection cause when optimisers re-export with alpha.
  ICON=ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
  CT=$(od -An -tu1 -j25 -N1 "$ICON" | tr -d ' ')
  assert "app icon has no alpha channel" "$([ "$CT" = "4" ] || [ "$CT" = "6" ] && echo 1 || echo 0)" eq 0
}
run_0(){ echo "── PHASE 0 ──"
  assert "@vercel/analytics+speed-insights" "$(n '@vercel/analytics|@vercel/speed-insights' app/layout.tsx package.json)" ge 2
  assert "@playwright/test installed"       "$(n '@playwright/test' package.json)" ge 1
  assert "auth setup spec exists"           "$(f 'e2e/auth.setup.ts')" eq 1
  assert "storageState wired"               "$(n 'storageState' playwright.config.ts e2e)" ge 2
  assert "setup project + dependencies"     "$(n 'name:\s*.setup.|dependencies:\s*\[' playwright.config.ts)" ge 2
  assert "authenticated critical paths"     "$(ls e2e/*.spec.ts 2>/dev/null | grep -cv '\.anon\.spec\.ts')" ge 2
  assert "studio spec hits /studio"         "$(n 'goto\(./studio' e2e)" ge 1
  assert "library spec hits /library"       "$(n 'goto\(./library|/library' e2e)" ge 1
  assert "402 upgrade-gate covered"         "$(n '402|limit_exceeded' e2e)" ge 1
  assert "AI calls stubbed in e2e"          "$(n 'page\.route\(|route\(.\*\*/api/generate' e2e)" ge 1
  assert "auth guard covered"               "$(n 'sign-in' e2e)" ge 1
  assert "CI runs the AC harness"           "$(n 'ac-check' .github/workflows/ci.yml)" ge 2
  assert "CI runs playwright"               "$(n 'playwright test' .github/workflows/ci.yml)" ge 1
  assert "acceptance note committed"        "$(f 'docs/acceptance/phase-0-*.md')" eq 1 ; }
run_1(){ echo "── PHASE 1 ──"
  # OG/twitter may be Satori .tsx or static .jpg/.png (logo pack).
  assert "og-pack files present"            "$(ls $A 2>/dev/null | rg -c '^(opengraph-image|twitter-image|icon|apple-icon|robots|sitemap)\.(tsx|ts|jpg|jpeg|png)$' || echo 0)" ge 6
  assert "metadataBase set"                 "$(n 'metadataBase' app/layout.tsx)" ge 1
  assert "raw <img> outside allowlist"      "$(n '<img\b' $A $C "${IMGALLOW[@]}")" eq 0
  assert "next/image imported"              "$(n 'from "next/image"' $A $C)" ge 2
  assert "images.remotePatterns configured" "$(n 'remotePatterns' next.config.ts)" ge 1
  assert "asChild+disabled removed"         "$(n 'asChild[^>]{0,120}disabled|disabled[^>]{0,120}asChild' 'app/(dashboard)/dashboard/page.tsx')" eq 0
  assert "format-card opacity-50 removed"   "$(n 'opacity-50' 'app/(dashboard)/studio/_components/StudioFormatResultCard.tsx')" eq 0
  assert ":has() layout hack removed"       "$(n 'has\(\.max-w-screen-md\)' 'app/(dashboard)/_components/dashboard-shell.tsx')" eq 0
  assert "empty <CardContent /> removed"    "$(n '<CardContent />' 'app/(dashboard)/error.tsx')" eq 0
  assert "skeleton animate-pulse removed"   "$(n 'animate-pulse' components/ui/skeleton.tsx)" eq 0
  assert "skeleton shimmer added"           "$(n 'shimmer' components/ui/skeleton.tsx app/globals.css)" ge 1
  assert "coarse-pointer targets added"     "$(n 'pointer:\s*coarse' app/globals.css components/ui/button.tsx)" ge 1
  assert "auth pages expose a real h1"      "$(n '<h1' components/auth/auth-form.tsx app/onboarding/_components/OnboardingForm.tsx)" ge 2
  assert "e2e asserts sign-up heading role" "$(n 'heading.*Create your account' e2e)" ge 1
  assert "acceptance note committed"        "$(f 'docs/acceptance/phase-1-*.md')" eq 1 ; }
run_2(){ echo "── PHASE 2 ──"
  assert "Tailwind arbitrary hex"           "$(n '(text|bg|border|ring|fill|stroke|from|via|to|shadow|outline|placeholder|accent|caret|divide)-\[#' $A $C)" eq 0
  assert "raw hex outside allowlist"        "$(n '#[0-9A-Fa-f]{3,8}\b' $A $C "${HEXALLOW[@]}")" eq 0
  assert "orphan #A78BFA gone"              "$(n '#A78BFA' $A $C)" eq 0
  # Space-delimited token match — \bdark\b would also match chrome-dark.
  assert "legacy className=\"dark\" gone"   "$(n 'className="([^"]* )?dark( [^"]*)?"' $A $C)" eq 0
  assert "chrome-dark scope introduced"     "$(n 'chrome-dark' app/globals.css $A $C)" ge 4
  assert "--surface-0..3 tokens"            "$(n -- '--surface-[0-3]' app/globals.css)" ge 8
  assert "aurora-foreground token"          "$(n -- '--aurora-foreground' app/globals.css $A $C)" ge 2
  assert "theme provider present"           "$(n 'ThemeProvider|setTheme|useTheme' $A $C)" ge 3
  assert "no-flash script in layout"        "$(n 'dangerouslySetInnerHTML' app/layout.tsx)" ge 1
  assert "theme toggle on Account"          "$(n 'Light|Dark|System' 'app/(dashboard)/account')" ge 3
  assert "contrast script exists"           "$(f 'scripts/contrast-check.mjs')" eq 1
  assert "CI runs contrast-check"           "$(n 'contrast-check' .github/workflows/ci.yml package.json)" ge 2
  assert "og:description trimmed"           "$(n 'Instagram caption, and email draft' app/layout.tsx)" ge 1
  assert "default title lengthened"         "$(n 'content repurposing in your brand voice' app/layout.tsx)" ge 1
  assert "acceptance note committed"        "$(f 'docs/acceptance/phase-2-*.md')" eq 1 ; }
run_3(){ echo "── PHASE 3 ──"
  assert "sonner / Toaster wired"           "$(n 'sonner|<Toaster' $A $C package.json)" ge 3
  assert "no tailwindcss-animate"           "$(n 'tailwindcss-animate' package.json package-lock.json)" eq 0
  # Case-insensitive: catches setStatusMessage / setExportMessage too (baseline 16 at 614be2b).
  assert "studio ad-hoc msg state removed"  "$(rg -ni --no-heading 'statusmessage|exportmessage' "$W" 2>/dev/null | wc -l | tr -d ' ')" eq 0
  assert "live regions STILL preserved"     "$(n 'aria-live|role="status"|role="alert"' $A $C)" ge 11
  assert "dialog enter/exit animated"       "$(n 'vo-overlay|vo-dialog' components/ui/dialog.tsx)" ge 2
  assert "motion keyframes @keyframes vo-"  "$(n '@keyframes vo-' app/globals.css)" ge 6
  assert "motion tokens consumed"           "$(n -- '--motion-' app/globals.css $A $C)" ge 4
  assert "drawer animated"                  "$(n 'vo-slide-in-left|vo-fade-in' 'app/(dashboard)/_components/dashboard-shell.tsx')" ge 2
  assert "undo action toast exists"         "$(n 'label:\s*"Undo"' $A $C)" ge 1
  assert "deferred-delete timer"            "$(n 'pendingDelete|PENDING_DELETE' 'app/(dashboard)/brand-voice')" ge 2
  assert "account delete form untouched"    "$(git diff --name-only origin/main...HEAD -- 'app/(dashboard)/account/_components/DeleteAccountForm.tsx' 2>/dev/null | wc -l | tr -d ' ')" eq 0
  assert "reduced-motion block intact"      "$(n 'prefers-reduced-motion' $A $C)" ge 4
  assert "acceptance note committed"        "$(f 'docs/acceptance/phase-3-*.md')" eq 1 ; }
run_4(){ echo "── PHASE 4 ──"
  S='app/api/generate/stream/route.ts'
  assert "stream route exists"              "$(f "$S")" eq 1
  assert "stream client exists"             "$(f 'lib/repurpose/stream-generate-client.ts')" eq 1
  assert "photo client byte-unchanged"      "$(git diff --numstat origin/main...HEAD -- lib/repurpose/photo-generate-client.ts 2>/dev/null | wc -l | tr -d ' ')" eq 0
  assert "non-streaming route untouched"    "$(git diff --numstat origin/main...HEAD -- app/api/generate/route.ts 2>/dev/null | wc -l | tr -d ' ')" eq 0
  assert "reservation in stream route"      "$(n 'reservePendingRepurpose' "$S")" ge 1
  assert "rate + usage checks present"      "$(n 'checkRateLimit|checkUsageLimit' "$S")" ge 2
  assert "provider allowlist in stream path" "$(n 'OPENROUTER_ALLOWED_PROVIDERS' "$S" lib)" ge 2
  RES=$(rg -n 'reservePendingRepurpose\(' "$S" 2>/dev/null | head -1 | cut -d: -f1)
  STR=$(rg -n 'streamObject\(' "$S" 2>/dev/null | head -1 | cut -d: -f1)
  assert "reservation precedes stream open" "$( [ -n "$RES" ] && [ -n "$STR" ] && [ "$RES" -lt "$STR" ] && echo 1 || echo 0 )" eq 1
  assert "AbortController wired"            "$(n 'AbortController' 'app/(dashboard)/studio' lib/repurpose)" ge 2
  assert "Stop control present"             "$(n 'Stop' 'app/(dashboard)/studio')" ge 1
  assert "NO variant migration added"       "$(ls supabase/migrations 2>/dev/null | rg -c 'variant' || echo 0)" eq 0
  assert "variants are client state"        "$(n 'formatVariants' 'app/(dashboard)/studio')" ge 3
  assert "refinement chips"                 "$(f 'app/(dashboard)/studio/_components/RefinementChips.tsx')" eq 1
  assert "live output limits consumed"      "$(n 'LINKEDIN_POST_MAX|INSTAGRAM_CAPTION_MAX' components app)" ge 2
  assert "stream flag defaults off"         "$(n 'NEXT_PUBLIC_STREAM_STUDIO' lib/config.ts)" ge 1
  assert "stream query opt-in"              "$(n 'get\("stream"\)' 'app/(dashboard)/studio')" ge 1
  assert "canary script kept"               "$(f 'scripts/spike-stream.mjs')" eq 1
  assert "e2e proves chunks before done"    "$(n 'stream' e2e)" ge 1
  assert "generate stubs catch stream path" "$(n '\*\*/api/generate\*\*' e2e)" ge 1
  assert "acceptance note committed"        "$(f 'docs/acceptance/phase-4-*.md')" eq 1 ; }
run_5(){ echo "── PHASE 5 ──"
  assert "command palette component"        "$(n 'CommandDialog|CommandPalette' $A $C)" ge 1
  assert "cmdk dependency"                  "$(n '"cmdk"' package.json)" ge 1
  assert "library pagination"               "$(n '\.range\(|\.limit\(' 'app/(dashboard)/library/page.tsx')" ge 1
  # DEFERRED from Phase 5 on 2026-07-26 — bundle_clips has never had a row in
  # production (clip rendering is gated behind NEXT_PUBLIC_VIDEO_BUNDLES_DEV).
  # Re-instate in the phase that un-gates video bundles; a job tray with no jobs
  # is untestable UI.
  #   assert "job tray component"             "$(n 'JobTray' $A $C)" ge 2
  #   assert "supabase realtime subscription" "$(n '\.channel\(|postgres_changes' $A $C lib)" ge 1
  assert "view-transition-name used"        "$(n 'view-transition-name|viewTransitionName' $A $C)" ge 2
  assert "shortcut registry module"         "$(f 'lib/shortcuts.ts')" eq 1
  assert "acceptance note committed"        "$(f 'docs/acceptance/phase-5-*.md')" eq 1
  assert "library pagination links"         "$(n 'page=|searchParams.*page' 'app/(dashboard)/library')" ge 2
  assert "bulk selection control"           "$(n 'selectedIds|bulkSelect' 'app/(dashboard)/library')" ge 3
  assert "library card shared element"      "$(n 'vo-source-' 'app/(dashboard)/library')" ge 2
  assert "library query drops heavy cols"   "$(n 'input_content, source_hash, output' 'app/(dashboard)/library/page.tsx')" eq 0 ; }
run_6(){ echo "── PHASE 6 ──"
  assert "capacitor server.url = voiceora"  "$(n 'url:\s*.https://voiceora\.io' capacitor.config.ts)" ge 1
  assert "vercel preview url gone"          "$(n 'url:\s*.https://repurpose-one-seven\.vercel\.app' capacitor.config.ts)" eq 0
  assert "safe-area on Studio action bar"   "$(n 'safe-area-inset-bottom' "$W")" ge 1
  assert "BottomTabs component"             "$(n 'BottomTabs' $A $C)" ge 2
  assert "haptics wired"                    "$(n '@capacitor/haptics|Haptics\.' package.json lib $C $A)" ge 3
  assert "app/manifest.ts"                  "$(f 'app/manifest.ts')" eq 1
  assert "acceptance note committed"        "$(f 'docs/acceptance/phase-6-*.md')" eq 1 ; }
run_7(){ echo "── PHASE 7 ──"
  assert "voice-lab route exists"             "$(f 'app/api/voice-lab/route.ts')" eq 1
  assert "voice-lab calls real AI pipeline"   "$(n 'generateRepurpose' app/api/voice-lab/route.ts)" ge 1
  assert "voice-lab rate limit is DB-backed"  "$(n 'voice_lab_hits' app/api/voice-lab lib)" ge 2
  assert "voice-lab hashes the IP"          "$(n 'createHash|sha256' app/api/voice-lab/route.ts lib/landing/voice-lab-rate-limit.ts)" ge 1
  assert "voice-lab input cap enforced"       "$(n 'VOICE_LAB_MAX_CHARS' app components lib)" ge 3
  assert "turnstile verification present"   "$(n 'TURNSTILE_SECRET_KEY' app/api/voice-lab/route.ts lib/landing/turnstile.ts)" ge 1
  assert "voice-lab honesty label updated"  "$(n 'Illustrative demo' components/landing)" eq 0
  assert "no silent curated fallback"       "$(n 'VOICE_LAB_FALLBACK|voice-lab-demo' components/landing lib/landing)" eq 0
  assert "demo privacy notice present"      "$(n 'DeepInfra' components/landing/voice-lab.tsx app/privacy/page.tsx)" ge 2
  assert "voice-lab calls a real route"     "$(n 'fetch\(' components/landing/voice-lab.tsx)" ge 1
  assert "no numeric social proof"          "$(n '\b[0-9]{1,3}(,[0-9]{3})+\s*(users|creators|customers|teams|makers)\b|★{3,}|[0-9]+% of (users|creators)' $A $C)" eq 0
  assert "studio templates module"          "$(f 'lib/repurpose/templates.ts')" eq 1
  assert "hex gate still clean"             "$(n '#[0-9A-Fa-f]{3,8}\b' $A $C "${HEXALLOW[@]}")" eq 0
  assert "og-pack still present"            "$(ls $A 2>/dev/null | rg -c '^(opengraph-image|twitter-image|icon|apple-icon|robots|sitemap)\.(tsx|ts|jpg|jpeg|png)$' || echo 0)" ge 6
  assert "acceptance note committed"        "$(f 'docs/acceptance/phase-7-*.md')" eq 1 ; }
run_8(){ echo "── PHASE 8 ──"
  assert "@sentry installed"                "$(n '@sentry/' package.json)" ge 1
  assert "sentry configs present"           "$(ls sentry.*.config.* 2>/dev/null | wc -l | tr -d ' ')" ge 2
  assert "e2e specs (expanded)"             "$(ls e2e/*.spec.ts 2>/dev/null | wc -l | tr -d ' ')" ge 4
  assert "visual spec un-skipped"           "$(n 'test\.describe\.skip|test\.skip' e2e/visual.spec.ts)" eq 0
  assert "CI executes visual.spec.ts"       "$(n 'visual\.spec\.ts' .github/workflows/ci.yml)" ge 1
  assert "Linux visual baselines committed" "$(find e2e -name '*-linux.png' 2>/dev/null | wc -l | tr -d ' ')" ge 4
  assert "acceptance note committed"        "$(f 'docs/acceptance/phase-8-*.md')" eq 1 ; }

run_wave1(){ echo "── WAVE 1 ──"
  # Em/en/horizontal-bar characters must not appear in model-facing prompts
  # (few-shot would fight the ban rule). Baseline before Wave 1 was 44.
  assert "prompts free of em/en dashes"     "$(n '—|–|―' lib/ai/prompts.ts)" eq 0
  assert "stripEmDashes in ai layer"        "$(n 'stripEmDashes' lib/ai lib/repurpose)" ge 3
  # Stream must sanitise partials AND the final object (not only onFinish).
  assert "stream stripEmDashes partial+final" "$(n 'stripEmDashes' app/api/generate/stream/route.ts)" ge 2
  assert "bundle copy not four-platform-posts" "$(n 'four platform posts' 'app/(dashboard)/bundles' components/repurpose lib/billing)" eq 0
  assert "acceptance note committed"        "$(f 'docs/acceptance/wave-1-*.md')" eq 1 ; }

run_wave2(){ echo "── WAVE 2 ──"
  assert "capacitor browser installed"      "$(n '@capacitor/browser' package.json lib components)" ge 2
  assert "capacitor app installed"          "$(n '@capacitor/app' package.json lib components)" ge 2
  assert "native oauth deep-link handler"     "$(n 'appUrlOpen' app components lib)" ge 1
  assert "url scheme registered in plist"   "$(n 'CFBundleURLTypes' ios/App/App/Info.plist)" ge 1
  assert "otp verify wired"                 "$(n 'verifyOtp' components/auth)" ge 1
  assert "otp resend control"               "$(n 'resend|Resend' components/auth/auth-form.tsx)" ge 1
  assert "dropdown primitive added"         "$(f 'components/ui/dropdown-menu.tsx')" eq 1
  assert "account menu in shell"            "$(n 'AccountMenu' 'app/(dashboard)/_components/dashboard-shell.tsx')" ge 1
  assert "no dead upgrade route"            "$(n '"/upgrade"' app components)" eq 0
  assert "no child mode scaffolding"        "$(n -i 'child_mode|childMode|ChildMode' app components lib supabase)" eq 0
  assert "acceptance note committed"        "$(f 'docs/acceptance/wave-2-*.md')" eq 1 ; }

run_wave3(){ echo "── WAVE 3 ──"
  assert "ingest url route exists"          "$(f 'app/api/ingest/url/route.ts')" eq 1
  assert "ssrf helper present"              "$(n 'assertSafeIngestUrl|isBlockedIp' lib/ingest)" ge 2
  assert "manual redirect hop revalidation" "$(n 'redirect: "manual"|INGEST_MAX_REDIRECTS' lib/ingest)" ge 2
  assert "readability extract wired"        "$(n 'Readability' lib/ingest app/api/ingest)" ge 1
  assert "link input mode"                  "$(n '"link"' types/photo-input.ts 'app/(dashboard)/studio')" ge 2
  assert "link source card"                 "$(f 'app/(dashboard)/studio/_components/LinkSourceCard.tsx')" eq 1
  assert "ingest route nodejs runtime"      "$(n 'runtime = "nodejs"' app/api/ingest/url/route.ts)" eq 1
  assert "acceptance note committed"        "$(f 'docs/acceptance/wave-3-*.md')" eq 1 ; }

case "$PHASE" in
  floor) run_floor ;;
  0) run_floor; run_0 ;;  1) run_floor; run_1 ;;  2) run_floor; run_2 ;;
  3) run_floor; run_3 ;;  4) run_floor; run_4 ;;  5) run_floor; run_5 ;;
  6) run_floor; run_6 ;;  7) run_floor; run_7 ;;  8) run_floor; run_8 ;;
  wave1) run_floor; run_wave1 ;;
  wave2) run_floor; run_wave2 ;;
  wave3) run_floor; run_wave3 ;;
  all) run_floor; for p in 0 1 2 3 4 5 6 7 8; do run_$p; done; run_wave1; run_wave2; run_wave3 ;;
  *) echo "usage: bash scripts/ac-check.sh [floor|0-8|wave1|wave2|wave3|all]"; exit 2 ;;
esac

echo
# A broken pattern is a broken gate, not a passing one.
if [ -s "$RGERR" ]; then
  echo "── HARNESS ERRORS (gates below are not trustworthy) ──"
  cat "$RGERR"
  echo
  FAIL=1
fi
[ $FAIL -eq 0 ] && echo "RESULT: PASS" || echo "RESULT: FAIL"
exit $FAIL
