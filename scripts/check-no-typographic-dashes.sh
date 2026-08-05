#!/usr/bin/env bash
# Fail if typographic dashes appear under app/ or components/.
# Deliberately identical character class and paths to the ac-check.sh floor
# gate, so the hook and CI can never disagree about what counts as a failure.
set -euo pipefail

command -v rg >/dev/null 2>&1 || { echo "FATAL: ripgrep (rg) is required"; exit 2; }

set +e
out="$(rg -n --no-heading '[—–―]' app components)"
rc=$?
set -e

# rg exit codes: 0 = matched, 1 = no match, >=2 = error.
# An error must fail loudly. Treating it as "no match" is the vacuous-pass
# failure mode that scripts/ac-check.sh warns about in its own header.
if [ "$rc" -ge 2 ]; then
  echo "FATAL: ripgrep failed (exit $rc) - dash check did not run"
  exit 2
fi

if [ "$rc" -eq 0 ]; then
  printf '%s\n' "$out"
  echo
  echo "Typographic dashes (em, en, horizontal bar) are banned under app/ and"
  echo "components/, including comments and JSDoc. Use a spaced ASCII hyphen."
  echo "Floor gate: 'no em/en/horizontal dashes in UI' in scripts/ac-check.sh"
  exit 1
fi

exit 0
