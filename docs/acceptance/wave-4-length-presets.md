# Wave 4 length presets

## Acceptance

- Studio shows word-count chips scoped to X thread, LinkedIn, Instagram, and email.
- There is no separate X caption format in the product; short X output is handled via the X thread band.
- Each format defaults to its middle preset and remembers only an explicit chip choice in `vo-length-{format}` local storage.
- Every Studio request sends `target_words`. X requests also send the mapped `target_tweets`: 50 to 3, 100 to 5, and 200 to 8.
- Generation prompts include the selected approximate word budget while retaining each format's hard character caps.
- Voice Lab offers approximately 20, 50, and 75 word options (100 omitted on the anonymous demo for abuse-surface reasons), defaults to 50, stays on the fast tier, and scales its tweet and token limits.
- Voice Lab rate limits remain unchanged.
