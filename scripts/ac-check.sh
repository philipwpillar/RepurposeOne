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
HEXALLOW=(-g '!**/globals.css' -g '!app/global-error.tsx' -g '!app/loading.tsx' \
          -g '!components/landing/vo-logo-mark.tsx' -g '!app/dev/**' \
          -g '!components/auth/google-sign-in-button.tsx')

# Files where raw <img> is legitimate: local object-URL/blob previews that
# next/image cannot optimise, plus the dev harness.
IMGALLOW=(-g '!app/dev/**' -g '!**/BundlePhotoPicker.tsx' -g '!**/BundleVideoPicker.tsx' \
          -g '!**/BundleWorkspace.tsx' -g '!**/PhotoPreviewCard.tsx')

n(){ rg -n --no-heading "$@" 2>/dev/null | wc -l | tr -d ' '; }
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
  assert "no window.confirm / alert()"      "$(n 'window\.confirm|(^|[^.[:alnum:]_])alert\(' $A $C)" eq 0
  assert "live regions preserved"           "$(n 'aria-live|role="status"|role="alert"' $A $C)" ge 11
  assert "prefers-reduced-motion present"   "$(n 'prefers-reduced-motion' $A $C)" ge 4
  assert "no Tailwind arbitrary hex ADDED"  "$(git diff --unified=0 origin/main...HEAD -- $A $C 2>/dev/null | rg -c '^\+.*(text|bg|border|ring|fill|stroke|from|via|to|shadow|outline|placeholder|accent|caret|divide)-\[#' || echo 0)" eq 0
  echo "── FENCE (assert only if the PR touches Studio) ──"
  assert "class GenerateApiError"           "$(n 'class GenerateApiError' "$W")" eq 1
  assert "callGenerateApi"                  "$(n 'callGenerateApi' "$W")" eq 3
  assert "callPhotoGenerateApi"             "$(n 'callPhotoGenerateApi' "$W")" eq 2
  assert "PhotoGenerateApiError"            "$(n 'PhotoGenerateApiError' "$W")" eq 2
  assert "setUsedCount(apiErr.usage.used)"  "$(n 'setUsedCount\(apiErr\.usage\.used\)' "$W")" eq 1
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
  assert "og-pack files present"            "$(ls $A 2>/dev/null | rg -c '^(opengraph-image|twitter-image|icon|apple-icon|robots|sitemap)\.(tsx|ts)$' || echo 0)" ge 6
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
  assert "acceptance note committed"        "$(f 'docs/acceptance/phase-1-*.md')" eq 1 ; }
run_2(){ echo "── PHASE 2 ──"
  assert "Tailwind arbitrary hex"           "$(n '(text|bg|border|ring|fill|stroke|from|via|to|shadow|outline|placeholder|accent|caret|divide)-\[#' $A $C)" eq 0
  assert "raw hex outside allowlist"        "$(n '#[0-9A-Fa-f]{3,8}\b' $A $C "${HEXALLOW[@]}")" eq 0
  assert "orphan #A78BFA gone"              "$(n '#A78BFA' $A $C)" eq 0
  assert "legacy className=\"dark\" gone"   "$(n 'className="[^"]*\bdark\b' $A $C)" eq 0
  assert "chrome-dark scope introduced"     "$(n 'chrome-dark' app/globals.css 'app/(dashboard)/_components/dashboard-shell.tsx')" ge 4
  assert "--surface-0..3 tokens"            "$(n -- '--surface-[0-3]' app/globals.css)" ge 4
  assert "theme provider / toggle"          "$(n 'ThemeProvider|setTheme|useTheme' $A $C)" ge 1
  assert "acceptance note committed"        "$(f 'docs/acceptance/phase-2-*.md')" eq 1 ; }
run_3(){ echo "── PHASE 3 ──"
  assert "sonner / Toaster wired"           "$(n 'sonner|<Toaster' $A $C package.json)" ge 3
  assert "studio ad-hoc msg state removed"  "$(n 'statusMessage|exportMessage' "$W")" eq 0
  assert "live regions STILL preserved"     "$(n 'aria-live|role="status"|role="alert"' $A $C)" ge 11
  assert "dialog enter/exit animation"      "$(n 'data-\[state=(open|closed)\]:(animate|fade|zoom)' components/ui/dialog.tsx)" ge 2
  assert "undo action toast exists"         "$(n 'label:\s*"Undo"|action:\s*\{[^}]*Undo' $A $C)" ge 1
  assert "acceptance note committed"        "$(f 'docs/acceptance/phase-3-*.md')" eq 1 ; }
run_4(){ echo "── PHASE 4 ──"
  assert "stream route exists"              "$(f 'app/api/generate/stream/route.ts')" eq 1
  assert "stream client exists"             "$(f 'lib/repurpose/stream-generate-client.ts')" eq 1
  assert "fenced client UNCHANGED"          "$(git diff --unified=0 origin/main...HEAD -- lib/repurpose/photo-generate-client.ts 2>/dev/null | rg -c '^[-+][^-+]' || echo 0)" eq 0
  assert "AbortController + Stop"           "$(n 'AbortController' 'app/(dashboard)/studio' lib/repurpose)" ge 1
  assert "variant_index migration"          "$(ls supabase/migrations 2>/dev/null | rg -c 'variant' || echo 0)" ge 1
  assert "gate fires before stream opens"   "$(n 'checkUsageLimit|checkRateLimit' app/api/generate/stream/route.ts)" ge 2
  assert "e2e proves chunks before done"    "$(n 'stream' e2e)" ge 1
  assert "acceptance note committed"        "$(f 'docs/acceptance/phase-4-*.md')" eq 1 ; }
run_5(){ echo "── PHASE 5 ──"
  assert "command palette component"        "$(n 'CommandDialog|CommandPalette' $A $C)" ge 1
  assert "cmdk dependency"                  "$(n '"cmdk"' package.json)" ge 1
  assert "library pagination"               "$(n '\.range\(|\.limit\(' 'app/(dashboard)/library/page.tsx')" ge 1
  assert "job tray component"               "$(n 'JobTray' $A $C)" ge 2
  assert "supabase realtime subscription"   "$(n '\.channel\(|postgres_changes' $A $C lib)" ge 1
  assert "view-transition-name used"        "$(n 'view-transition-name|viewTransitionName' $A $C)" ge 2
  assert "shortcut registry module"         "$(f 'lib/shortcuts.ts')" eq 1
  assert "acceptance note committed"        "$(f 'docs/acceptance/phase-5-*.md')" eq 1 ; }
run_6(){ echo "── PHASE 6 ──"
  assert "capacitor server.url = voiceora"  "$(n 'url:\s*.https://voiceora\.io' capacitor.config.ts)" ge 1
  assert "vercel preview url gone"          "$(n 'url:\s*.https://repurpose-one-seven\.vercel\.app' capacitor.config.ts)" eq 0
  assert "safe-area on Studio action bar"   "$(n 'safe-area-inset-bottom' "$W")" ge 1
  assert "BottomTabs component"             "$(n 'BottomTabs' $A $C)" ge 2
  assert "haptics wired"                    "$(n '@capacitor/haptics|Haptics\.' package.json lib $C $A)" ge 3
  assert "app/manifest.ts"                  "$(f 'app/manifest.ts')" eq 1
  assert "acceptance note committed"        "$(f 'docs/acceptance/phase-6-*.md')" eq 1 ; }
run_7(){ echo "── PHASE 7 ──"
  assert "voice-lab calls a real route"     "$(n 'fetch\(' components/landing/voice-lab.tsx)" ge 1
  assert "voice-lab demo route exists"      "$(f 'app/api/voice-lab/route.ts')" eq 1
  assert "no numeric social proof"          "$(n '\b[0-9]{1,3}(,[0-9]{3})+\s*(users|creators|customers|teams|makers)\b|★{3,}|[0-9]+% of (users|creators)' $A $C)" eq 0
  assert "studio templates module"          "$(f 'lib/repurpose/templates.ts')" eq 1
  assert "hex gate still clean"             "$(n '#[0-9A-Fa-f]{3,8}\b' $A $C "${HEXALLOW[@]}")" eq 0
  assert "og-pack still present"            "$(ls $A 2>/dev/null | rg -c '^(opengraph-image|twitter-image|icon|apple-icon|robots|sitemap)\.(tsx|ts)$' || echo 0)" ge 6
  assert "acceptance note committed"        "$(f 'docs/acceptance/phase-7-*.md')" eq 1 ; }
run_8(){ echo "── PHASE 8 ──"
  assert "@sentry installed"                "$(n '@sentry/' package.json)" ge 1
  assert "sentry configs present"           "$(ls sentry.*.config.* 2>/dev/null | wc -l | tr -d ' ')" ge 2
  assert "e2e specs (expanded)"             "$(ls e2e/*.spec.ts 2>/dev/null | wc -l | tr -d ' ')" ge 4
  assert "visual spec un-skipped"           "$(n 'test\.describe\.skip|test\.skip' e2e/visual.spec.ts)" eq 0
  assert "CI executes visual.spec.ts"       "$(n 'visual\.spec\.ts' .github/workflows/ci.yml)" ge 1
  assert "Linux visual baselines committed" "$(find e2e -name '*-linux.png' 2>/dev/null | wc -l | tr -d ' ')" ge 4
  assert "acceptance note committed"        "$(f 'docs/acceptance/phase-8-*.md')" eq 1 ; }

case "$PHASE" in
  floor) run_floor ;;
  0) run_floor; run_0 ;;  1) run_floor; run_1 ;;  2) run_floor; run_2 ;;
  3) run_floor; run_3 ;;  4) run_floor; run_4 ;;  5) run_floor; run_5 ;;
  6) run_floor; run_6 ;;  7) run_floor; run_7 ;;  8) run_floor; run_8 ;;
  all) run_floor; for p in 0 1 2 3 4 5 6 7 8; do run_$p; done ;;
  *) echo "usage: bash scripts/ac-check.sh [floor|0-8|all]"; exit 2 ;;
esac

echo
[ $FAIL -eq 0 ] && echo "RESULT: PASS" || echo "RESULT: FAIL"
exit $FAIL
