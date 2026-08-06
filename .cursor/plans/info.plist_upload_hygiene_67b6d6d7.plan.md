---
name: Info.plist upload hygiene
overview: "Apply Brief B11: declare export-compliance exemption and remove the obsolete armv7 capability from Info.plist, then lock both with floor gates in ac-check.sh. PR only — do not merge."
todos:
  - id: plist-keys
    content: Remove UIRequiredDeviceCapabilities/armv7; add ITSAppUsesNonExemptEncryption false + XML comment
    status: completed
  - id: ac-gates
    content: Add two floor asserts in scripts/ac-check.sh; prove both trip on scratch copies
    status: completed
  - id: verify-pr
    content: Run floor + typecheck + build; push branch; open PR; do not merge
    status: completed
isProject: false
---

# Brief B11 — Info.plist upload hygiene

Branch from current `main` (`47a3790`): `fix/infoplist-upload-hygiene`. Diff must be exactly two files: [`ios/App/App/Info.plist`](ios/App/App/Info.plist) and [`scripts/ac-check.sh`](scripts/ac-check.sh).

## 1. Info.plist edits

In [`ios/App/App/Info.plist`](ios/App/App/Info.plist):

- **Remove** the entire `UIRequiredDeviceCapabilities` / `armv7` block (lines 31–34 today). Do not replace with `arm64`.
- **Add** after `CFBundleVersion` / before `LSRequiresIPhoneOS` (alphabetical-ish):

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

- Put a one-line XML comment immediately above that key stating `false` is correct only while the app uses exempt HTTPS/TLS (no custom/bundled crypto). AC #3 forbids a third-file `docs/MOBILE.md` edit, so the comment lives in the plist.

Leave untouched: `CFBundleURLTypes`, display name, version keys, orientations.

## 2. Floor gates

In [`scripts/ac-check.sh`](scripts/ac-check.sh) `run_floor()`, add:

```bash
assert "no obsolete armv7 capability"  "$(n 'armv7' ios/App/App/Info.plist)" eq 0
assert "export compliance declared"    "$(n -U 'ITSAppUsesNonExemptEncryption</key>\s*<false/>' ios/App/App/Info.plist)" ge 1
```

`n()` already forwards flags to `rg` (`rg -n --no-heading "$@"`), so `-U` is supported. Prove both gates trip on scratch copies before shipping:

1. Temporarily re-add `armv7` → first assert FAIL
2. Flip `<false/>` to `<true/>` → second assert FAIL  
Paste failing output into the PR body. If multiline proves brittle, fall back to a non-vacuous simpler assert and note that in the PR.

## 3. Verify and ship PR

- `bash scripts/ac-check.sh floor` passes on the real files
- `npm run typecheck` and `npm run build` exit 0 (no-regression)
- Commit, push, open PR into `main`
- **Stop — do not merge** (brief: Claude verifies from a fresh clone before Phil merges)

## Out of scope (explicit)

No edits to `capacitor.config.json` / `.ts`, deployment target, signing, versions, or offline-fallback. This does not unblock TestFlight while `HOLDING_MODE` is on.
