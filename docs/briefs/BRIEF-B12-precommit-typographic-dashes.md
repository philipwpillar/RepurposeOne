# Brief B12 — Catch typographic dashes before commit (revised)

**Priority:** P2 — stops a recurring `main`-red failure mode
**Baseline:** `main` @ `777c4a0` (floor verified PASS, no dashes present)
**Branch:** `chore/precommit-typographic-dashes`
**Files:** `scripts/check-no-typographic-dashes.sh`, `.githooks/pre-commit`, `package.json`, `README.md`
**Size:** one script, one hook, two npm scripts, one README line

> Revised from the first draft. Three changes: hook installation is now automatic rather than a manual per-clone step; the script no longer passes vacuously on a ripgrep error; setup documentation lives in the README rather than a PR body.

---

## 1. Why

The floor gate `no em/en/horizontal dashes in UI` (`rg '[—–―]' app components`) is correct and stays **repo-wide under `app/` + `components/`, including comments and JSDoc** — settled Wave 4, 4 Aug 2026. **Do not loosen it.**

Twice in one week that gate reddened `main` after merge, both times from an em dash inside a **comment**:

| Incident | File | Landed via |
|---|---|---|
| B1 / audit L4 | `components/repurpose/upgrade-prompt.tsx:48` | UX polish follow-up |
| PR #125 → #127 | `components/auth/auth-form.tsx:127` | signup existing-email fix |

The gate worked. The timing is the problem: the dash is committed, pushed and merged before anyone runs the floor locally, CI then fails on `main`, and every subsequent PR inherits a red floor until a one-character cleanup lands.

Two occurrences is a pattern. Catch it at commit time.

---

## 2. Locked approach

A **git pre-commit hook** running the same pattern as the floor gate, installed via `.githooks/` + `core.hooksPath`, with hooksPath set **automatically** by an npm `prepare` script.

Do **not**:

- Loosen or narrow the floor gate
- Add Husky, lint-staged, or lefthook
- Auto-rewrite characters on save — fail closed with a clear message instead
- Rely on editor or macOS smart-dash settings as the mechanism; they are useful locally but unshareable

---

## 3. Changes

### 3a. `scripts/check-no-typographic-dashes.sh`

Standalone, no dependency on the AC harness.

```bash
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
```

`chmod +x`. The script lives in `scripts/`, which the floor gate does not scan, so the character class in the pattern is safe.

**Deliberate trade, state it in the PR:** this checks the **working tree**, not staged content. It will therefore flag an unstaged dash and miss a staged-then-reverted one. That is accepted, because running the identical command as the floor gate means the hook and CI can never give different answers — worth more than staged-file precision.

### 3b. `.githooks/pre-commit`

```bash
#!/usr/bin/env bash
# Installed automatically: the package.json `prepare` script points
# core.hooksPath at .githooks on every npm install.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/scripts/check-no-typographic-dashes.sh"
```

`chmod +x`.

### 3c. `package.json` — automatic installation

```json
"prepare": "git config core.hooksPath .githooks || true",
"check:dashes": "bash scripts/check-no-typographic-dashes.sh"
```

**This is the change that makes the hook actually work.** npm runs `prepare` automatically on `npm install` and `npm ci`, so the hook goes live on every clone that installs dependencies — including fresh agent environments and fresh verification clones. A manual per-clone `git config` step is exactly the step nobody reliably runs, and both incidents above came from agent commits in environments that would not have had it.

`|| true` keeps Vercel and CI builds green if `git config` is unavailable or the checkout has no writable git config.

There is currently no `prepare` script in `package.json` — confirmed at `777c4a0` — so this is a clean addition with nothing to merge.

### 3d. `README.md`

One line in the existing **Getting Started (Local Development)** section, after `npm install`:

> `npm install` also installs a pre-commit hook that blocks typographic dashes under `app/` and `components/`. Run `npm run check:dashes` to check manually.

Nothing more. Do not create a new docs surface for this.

---

## 4. Out of scope

- Any change to the floor gate's scope or meaning
- `lib/ai/strip-em-dashes.ts` — must keep the characters it strips, and sits outside `app/` + `components/` anyway
- Husky / lint-staged / lefthook
- Cursor `afterFileEdit` project hooks — a reasonable follow-up if dashes still reach the working tree, but not this brief
- Fixing unrelated floor failures

---

## 5. Acceptance criteria

1. On clean `main`, `npm run check:dashes` exits 0 and prints nothing
2. **Dash mutation:** insert an em dash into a comment under `app/` or `components/` → script exits **1**, prints the offending line and the ban message. Restore the file.
3. **Error mutation:** temporarily point the script at a non-existent path (or make `rg` unavailable) → script exits **2** with the FATAL message, and **not** 0. This is the vacuous-pass guard; a check that cannot fail is worse than no check.
4. **Installation:** in a fresh clone, `npm ci` then `git config --get core.hooksPath` returns `.githooks`
5. **Hook behaviour:** with the hook installed, `git commit` of a staged dash is rejected and the message is readable; a clean commit succeeds
6. `bash scripts/ac-check.sh floor` still passes — the gate is unchanged
7. Diff is exactly: new script, new hook, `package.json`, one README line

Paste the output of criteria 2 and 3 into the PR body. Criterion 3 in particular is not self-evident from a green run.

---

## 6. What this does not claim

A hook stops a dash being **committed**, not being **written**. It only applies where `core.hooksPath` is set — which the `prepare` script now handles for anyone who installs dependencies, but not for a commit made in a checkout where `npm install` never ran. `--no-verify` also bypasses it, and remains forbidden by repo convention unless explicitly requested.

CI stays the backstop. The win is that the mistake which twice reddened `main` now fails on the author's machine before push.

---

## 7. PR seeds

**Title:** `chore: pre-commit check for typographic dashes`

**Body:** reference B1 and #125/#127 as the cause; paste the failing output from criteria 2 and 3; note the working-tree-not-staged trade from §3a.

Standard loop: feature branch, PR, **do not merge**. Claude verifies from a fresh clone before Phil merges.
