# Voice variant separation artefact

Generated: 2026-07-30T13:54:07.884Z
Model: qwen/qwen3.5-397b-a17b
Provider pin: deepinfra/fp8
Repeats per cell: 3
Formats: x_thread, linkedin, instagram

## Mechanical gate

- explain vs provoke sentence-length / second-person separation: **PASS**
- lexicon overlap stays relatively flat across variants: **PASS**

### Mean metrics by format × variant

| format | variant | meanSentenceLength | hedgeCount | firstPersonRatio | secondPersonRatio | lexiconOverlap |
|---|---|---:|---:|---:|---:|---:|
| x_thread | signature | 3.53 | 0 | 0 | 0 | 0.2883 |
| x_thread | explain | 5.31 | 0 | 0 | 0.0654 | 0.1982 |
| x_thread | provoke | 3.57 | 0 | 0 | 0.0381 | 0.1261 |
| linkedin | signature | 3.83 | 0 | 0 | 0 | 0.0901 |
| linkedin | explain | 9.17 | 0 | 0 | 0.0783 | 0.1441 |
| linkedin | provoke | 4.5 | 0 | 0 | 0 | 0.0811 |
| instagram | signature | 3.83 | 0 | 0 | 0 | 0.0811 |
| instagram | explain | 9.28 | 0 | 0 | 0.0768 | 0.1441 |
| instagram | provoke | 5.71 | 0 | 0 | 0 | 0.0631 |

## Foreign-voice control (LinkedIn / signature)

Primary-lexicon overlap on foreign outputs (mean): **0.0721**

### foreign run 1

I keep coming back to the quiet moments before we hit publish, when the only job is to notice if the message still feels unfinished.

Have you ever shared the same draft everywhere, hoping it would land the same way? It's a common feeling, isn't it? But each platform asks something different of us. They change how people scan, how they respond, and whether they decide to stay.

Maybe the work isn't just in preserving the idea, but in gently rebuilding its delivery for each new home. What does that shift feel like for you?

### foreign run 2

I keep coming back to the quiet moments before we hit publish, when the only job is to notice if the message still feels unfinished.

Have you ever shared the same draft everywhere, hoping it would land just as well on each platform? It's a common feeling, isn't it? Yet every space has its own rhythm, changing how people scan, respond, and decide whether to stay.

Perhaps the real work isn't just preserving the idea, but gently rebuilding its delivery for each new home. What does that look like for you?

### foreign run 3

I keep coming back to the quiet moments before we hit publish, when the only job is to notice if the message still feels unfinished.

Have you ever shared the same draft everywhere, hoping it would land just as softly on each platform? It's a gentle reminder that where people read changes how they listen. A screen asks for something different than a feed, doesn't it?

Perhaps the kindest thing we can do for our ideas is to let them breathe in new shapes, rebuilding the delivery while keeping the heart of the message intact. After all, isn't it less about repeating ourselves and more about meeting people where they are?

## Primary outputs

### x_thread / signature

#### run 1

1. Teams often publish the same draft everywhere. This ignores how platform constraints change reader behavior.
2. Readers scan, respond, and decide differently on each site. A single format fails to match these specific mechanisms.
3. Build a workflow that preserves the core idea but rebuilds the delivery for each destination.
4. Adapt the structure first. Then let each version earn its place on the platform.

metrics: meanSentenceLength=3.55, hedgeCount=0, first=0, second=0, lexiconOverlap=0.2973

#### run 2

1. Teams often publish the same draft everywhere. This ignores how platform constraints change reader behavior.
2. Readers scan, respond, and decide differently on each channel. A single format fails to match these distinct mechanics.
3. Build a repurposing workflow that preserves the core idea. Rebuild the delivery to fit each destination.
4. Cut what does not work for the specific medium. Make every version earn its place.

metrics: meanSentenceLength=3.5, hedgeCount=0, first=0, second=0, lexiconOverlap=0.2973

#### run 3

1. Teams often publish the same draft everywhere. This ignores how platform constraints change reader behavior.
2. Readers scan, respond, and decide differently on each site. A single format fails to match these distinct mechanics.
3. Build a workflow that preserves the core idea but rebuilds the delivery for each destination.
4. Adapt the structure to the platform. Make every version earn its place.

metrics: meanSentenceLength=3.55, hedgeCount=0, first=0, second=0, lexiconOverlap=0.2703

### x_thread / explain

#### run 1

1. Why do you publish the same draft everywhere when platform constraints change how readers scan and decide to continue?
2. You must rebuild the delivery for each destination by cutting twenty percent of words for Twitter and adding three subheads for LinkedIn.
3. This specific mechanism preserves your core idea while forcing the format to match the scanning behavior of each unique audience.
4. A useful repurposing workflow stops you from ignoring these structural demands and ensures every version earns its place on the feed.

metrics: meanSentenceLength=6.13, hedgeCount=0, first=0, second=0, lexiconOverlap=0.2162

#### run 2

1. Why do you publish the same draft everywhere when platform constraints change how readers scan?
2. You must rebuild the delivery for each destination while you preserve the core idea intact.
3. Start by cutting your long threads into three distinct points that fit the character limit.
4. This specific mechanism forces you to prioritize the strongest argument before you hit the post button.
5. Your content finally works when every platform receives a version built for its own rules.

metrics: meanSentenceLength=4.5, hedgeCount=0, first=0, second=0, lexiconOverlap=0.1351

#### run 3

1. Why do you publish the same draft everywhere when platform constraints change how readers scan and decide?
2. You must rebuild the delivery for each destination while you preserve the core idea inside the message.
3. Start by cutting twenty percent of your text for Twitter, then add two questions to drive comments on LinkedIn.
4. This specific workflow stops you from wasting effort on content that fails to match the scanning habits of users.
5. Your audience stays only when every line pays rent within the specific constraints of their chosen digital platform.

metrics: meanSentenceLength=5.3, hedgeCount=0, first=0, second=0, lexiconOverlap=0.2432

### x_thread / provoke

#### run 1

1. Copying the same draft everywhere kills your reach.
2. Platform constraints force readers to scan and decide differently.
3. Rebuild your delivery for each destination to preserve the idea.

metrics: meanSentenceLength=2.83, hedgeCount=0, first=0, second=0, lexiconOverlap=0.0811

#### run 2

1. Copying the same draft everywhere fails because platform constraints change how readers scan.
2. Twitter demands short hooks while LinkedIn rewards detailed context and specific mechanisms.
3. Readers decide to continue based on whether the format matches their scanning habits.
4. A useful workflow preserves the core idea but rebuilds the delivery for each destination.

metrics: meanSentenceLength=4.75, hedgeCount=0, first=0, second=0, lexiconOverlap=0.1892

#### run 3

1. Copying the same draft everywhere kills your reach.
2. Readers scan LinkedIn differently than they scan X.
3. Platform constraints force specific changes in how people decide to continue.
4. Rebuild your delivery for each destination while keeping the core idea.

metrics: meanSentenceLength=3.13, hedgeCount=0, first=0, second=0, lexiconOverlap=0.1081

### linkedin / signature

#### run 1

Stop publishing the same draft everywhere. Platform constraints change how readers scan and decide.

Preserve the core idea. Rebuild the delivery for each destination.

Match the format to the feed. Cut what does not fit.

metrics: meanSentenceLength=3.5, hedgeCount=0, first=0, second=0, lexiconOverlap=0.1081

#### run 2

Stop publishing the same draft everywhere. Platform constraints change how readers scan and decide.

Preserve the core idea. Rebuild the delivery for each destination.

metrics: meanSentenceLength=4, hedgeCount=0, first=0, second=0, lexiconOverlap=0.0811

#### run 3

Stop publishing the same draft everywhere. Platform constraints change how readers scan and decide.

Preserve the core idea. Rebuild the delivery for each destination.

metrics: meanSentenceLength=4, hedgeCount=0, first=0, second=0, lexiconOverlap=0.0811

### linkedin / explain

#### run 1

Why do you publish the same draft everywhere when platform constraints change how readers scan?

You need a workflow that preserves your core idea while rebuilding its delivery for each destination.

Start by cutting twenty percent of your text to fit mobile screens before you add platform-specific hooks.

This approach ensures every version earns attention instead of just repeating noise.

metrics: meanSentenceLength=9.5, hedgeCount=0, first=0, second=0, lexiconOverlap=0.1622

#### run 2

Why do you publish the same draft everywhere when platform constraints change how readers scan?

You must rebuild the delivery for each destination while you preserve the core idea intact.

Start by cutting your long sentences in half for Twitter, then expand them for LinkedIn.

This specific workflow ensures every reader engages with the message instead of scrolling past it.

metrics: meanSentenceLength=8.75, hedgeCount=0, first=0, second=0, lexiconOverlap=0.1351

#### run 3

Why do you publish the same draft everywhere when platform constraints change how readers scan?

You lose engagement because each channel demands a specific format that your current copy ignores.

Rebuild your delivery by cutting long paragraphs for mobile screens and adding hooks for feeds.

Preserve your core idea while adapting the structure to fit each destination perfectly.

metrics: meanSentenceLength=9.25, hedgeCount=0, first=0, second=0, lexiconOverlap=0.1351

### linkedin / provoke

#### run 1

Repurposing content by copying the same draft everywhere fails. Platform constraints change how readers scan and decide. Preserve the core idea. Rebuild the delivery for each destination.

metrics: meanSentenceLength=4.5, hedgeCount=0, first=0, second=0, lexiconOverlap=0.0811

#### run 2

Repurposing content by copying the same draft everywhere fails. Platform constraints change how readers scan and decide. Preserve the core idea. Rebuild the delivery for each destination.

metrics: meanSentenceLength=4.5, hedgeCount=0, first=0, second=0, lexiconOverlap=0.0811

#### run 3

Repurposing content by pasting the same draft everywhere fails. Platform constraints change how readers scan and decide. Preserve the core idea. Rebuild the delivery for each destination.

metrics: meanSentenceLength=4.5, hedgeCount=0, first=0, second=0, lexiconOverlap=0.0811

### instagram / signature

#### run 1

Stop pasting the same draft everywhere. Platform constraints change how readers scan and decide. Preserve the idea. Rebuild the delivery for each destination.

metrics: meanSentenceLength=3.75, hedgeCount=0, first=0, second=0, lexiconOverlap=0.0811

#### run 2

Stop pasting the same draft everywhere. Platform constraints change how readers scan and decide. Preserve the core idea. Rebuild the delivery for each destination.

metrics: meanSentenceLength=4, hedgeCount=0, first=0, second=0, lexiconOverlap=0.0811

#### run 3

Stop pasting the same draft everywhere. Platform constraints change how readers scan and decide. Preserve the idea. Rebuild the delivery for each destination.

metrics: meanSentenceLength=3.75, hedgeCount=0, first=0, second=0, lexiconOverlap=0.0811

### instagram / explain

#### run 1

Why do you publish the same draft everywhere when platform constraints change how readers scan? You need a workflow that preserves your core idea while rebuilding delivery for each specific destination. Start by cutting twenty percent of your text for mobile screens before you add platform hooks. This approach ensures every version earns attention instead of losing it to generic formatting.

metrics: meanSentenceLength=9.5, hedgeCount=0, first=0, second=0, lexiconOverlap=0.1622

#### run 2

Why do you publish the same draft everywhere when platform constraints change how readers scan? You must rebuild the delivery for each destination while preserving the core idea to keep attention. This specific workflow stops you from losing readers who decide within seconds whether to continue.

metrics: meanSentenceLength=9, hedgeCount=0, first=0, second=0, lexiconOverlap=0.1351

#### run 3

Why do you publish the same draft everywhere when platform constraints change how readers scan? You must rebuild the delivery for each destination while preserving the core idea to keep attention. This specific workflow stops you from losing readers who decide within seconds to scroll past your post.

metrics: meanSentenceLength=9.33, hedgeCount=0, first=0, second=0, lexiconOverlap=0.1351

### instagram / provoke

#### run 1

Stop publishing the same draft everywhere. Platform constraints change how readers scan and decide. Rebuild the delivery for each destination.

metrics: meanSentenceLength=4.33, hedgeCount=0, first=0, second=0, lexiconOverlap=0.0811

#### run 2

Copy-pasting the same draft everywhere ignores how platform constraints shape reader behavior. Rebuild the delivery for each destination while keeping the core idea intact.

metrics: meanSentenceLength=9, hedgeCount=0, first=0, second=0, lexiconOverlap=0.027

#### run 3

Copy-pasting the same draft everywhere kills engagement. Platform constraints change how readers scan and decide. Rebuild the delivery for each destination. Keep the idea. Change the mechanism.

metrics: meanSentenceLength=3.8, hedgeCount=0, first=0, second=0, lexiconOverlap=0.0811

## Reviewer result

- [x] Mechanical gate passed (sentence length + second-person separate; lexicon flat).
- [ ] Blind match of unlabeled outputs to variant labels is well above chance.
- [ ] Foreign-voice control is the odd one out against primary-voice outputs.
- [ ] Criterion 5 may be claimed only after the three boxes above are checked.

Reviewer:

Notes:
