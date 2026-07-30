# Wave 4 length presets

## Acceptance

- Studio shows word-count chips scoped to X thread, LinkedIn, Instagram, and email.
- Each format defaults to its middle preset and remembers only an explicit chip choice in `vo-length-{format}` local storage.
- Every Studio request sends `target_words`. X requests also send the mapped `target_tweets`: 50 to 3, 100 to 5, and 200 to 8.
- Generation prompts include the selected approximate word budget while retaining each format's hard character caps.
- Voice Lab offers approximately 20, 50, and 75 word options, defaults to 50, stays on the fast tier, and scales its tweet and token limits.
- Voice Lab rate limits remain unchanged.
