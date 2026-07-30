# Voice variant separation artefact

Generated: 2026-07-30T14:41:07.350Z
Model: qwen/qwen3.5-397b-a17b
Provider pin: deepinfra/fp8
Temperature: 0.7 (from AI_CONFIG)
Repeats per cell: 3
Formats: x_thread, linkedin, instagram

## Fixture

Primary identity (mid-register, not provoke-shaped): Practitioner writing for operators who ship work. Prefer concrete examples and plain language. Mix short lines with fuller explanations when a point needs room. Sound like a thoughtful peer, not a manifesto and not a tutorial script.

Primary samples: 4 (expanded for n-gram fidelity).

## Mechanical gate

- all variant pairs separate on sentence length or second-person (every format): **FAIL**
- explain mean sentence length ≥ provoke + format delta (signed, every format): **PASS**
- explain second-person above signature and provoke (every format): **PASS**
- distinctive sample n-gram precision stays flat across primary variants (max−min ≤ 0.12): **PASS** (spread=0.1060)
- foreign distinctive precision below every primary cell by ≥ 0.05: **PASS** (foreign=0.1150, primaryMin=0.1977)

### Pair separation failures

- x_thread: signature vs provoke (Δsent=0.25, Δ2nd=0.0121; need sent≥1.5 or 2nd≥0.015)

### Logged follow-ups (non-blocking)

- Signature is often the shortest variant; confirm that is acceptable for the Instagram/default path.
- Distinctive n-gram precision is partly constructed (foreign samples define the complement). It gates sample-tracking, not independent identity retention under a lean.
- Eyeball primary outputs for parroting: distinctive precision around 0.2–0.3 means substantial surface echo of the four samples.
- At temperature 0.7, X threads can still collapse signature vs provoke on sentence length even when LinkedIn/Instagram order correctly (explain > signature > provoke).

### Mean metrics by format × variant

| format | variant | meanSentenceLength | hedgeCount | firstPersonRatio | secondPersonRatio | lexiconOverlap (report-only) | sampleFidelity (report-only) | distinctivePrecision |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| x_thread | signature | 8.65 | 0.33 | 0 | 0.0088 | 0.17 | 0.1667 | 0.2772 |
| x_thread | explain | 20.25 | 0 | 0 | 0.0582 | 0.14 | 0.1491 | 0.2443 |
| x_thread | provoke | 8.4 | 0 | 0 | 0.0209 | 0.0533 | 0.0945 | 0.2007 |
| linkedin | signature | 13.38 | 0 | 0.0036 | 0 | 0.1433 | 0.1776 | 0.3037 |
| linkedin | explain | 17.94 | 0 | 0 | 0.0561 | 0.1333 | 0.1523 | 0.2232 |
| linkedin | provoke | 8.47 | 0 | 0 | 0 | 0.0667 | 0.0998 | 0.2322 |
| instagram | signature | 14.92 | 0 | 0 | 0 | 0.07 | 0.0969 | 0.2109 |
| instagram | explain | 17.39 | 0 | 0 | 0.0625 | 0.0733 | 0.1203 | 0.2016 |
| instagram | provoke | 11.53 | 0 | 0 | 0 | 0.03 | 0.0621 | 0.1977 |

## Foreign-voice control (LinkedIn / signature)

Distinctive primary-sample n-gram precision on foreign outputs (mean): **0.115**
Primary-sample n-gram fidelity on foreign outputs (mean, report-only): **0.0921**
Legacy primary-lexicon overlap on foreign outputs (mean, report-only): **0.0667**

### foreign run 1

I often notice teams sharing the same draft everywhere, hoping it will land the same way. Yet every platform has its own quiet rhythm that changes how readers choose to stay. Perhaps the kindest approach is to rebuild the delivery while keeping the heart of the message intact. Have you ever felt that familiar tension between efficiency and the need for a unique fit? It is a shared feeling, isn't it, when we want our ideas to truly breathe?

metrics: distinctivePrecision=0.0840, sampleFidelity=0.0915, lexiconOverlap=0.0500

### foreign run 2

I often notice teams sharing one draft everywhere, hoping it will land the same way. Yet every platform has its own rhythm that changes how readers scan and decide. Perhaps we serve our ideas best by rebuilding the delivery while keeping the heart intact. Have you ever felt that same message needed a different shape to truly breathe? It is a gentle reminder that context matters just as much as the words we choose.

metrics: distinctivePrecision=0.1432, sampleFidelity=0.1042, lexiconOverlap=0.1000

### foreign run 3

I often notice teams sharing one draft everywhere, hoping it lands the same. Yet every platform has its own quiet rhythm for how we read. Do we forget that constraints change how a message is received? Perhaps the kindest approach is to keep the heart but rebuild the shape. This way, the idea breathes anew in each space we visit together.

metrics: distinctivePrecision=0.1178, sampleFidelity=0.0807, lexiconOverlap=0.0500

## Primary outputs

### x_thread / signature

#### run 1

1. Teams often ship one draft everywhere, but platform constraints change how readers scan and decide to continue.
2. A useful workflow preserves the core idea while rebuilding the delivery to fit each specific destination.
3. You might keep the insight intact but cut the intro for mobile or add context for email.
4. Rebuilding the line is cheaper than explaining why the original felt off in a new room.

metrics: meanSentenceLength=8.75, hedgeCount=1, first=0, second=0.0143, lexiconOverlap=0.17, sampleFidelity=0.1596, distinctivePrecision=0.2912

#### run 2

1. Many teams ship one draft everywhere, ignoring how each platform changes the way readers scan and decide.
2. Platform constraints are not just formatting rules; they shape whether a reader stops scrolling or keeps moving.
3. Effective repurposing keeps the core idea intact while rebuilding the delivery to match each specific destination.
4. Treat every channel as a different room where the same message needs a new entry point to land.
5. Rebuilding the line for each context is cheaper than wondering why a generic post failed to connect.

metrics: meanSentenceLength=9, hedgeCount=0, first=0, second=0, lexiconOverlap=0.15, sampleFidelity=0.1395, distinctivePrecision=0.2119

#### run 3

1. Many teams publish the same draft everywhere, ignoring how platform constraints shape reader behavior.
2. Readers scan differently on each channel, which changes how they decide to engage with your work.
3. A useful workflow preserves the core idea while rebuilding the delivery for every specific destination.
4. Rebuilding the line is cheaper than explaining why the original felt off in a new room.
5. Decide what the reader must do next, then adjust the opening to match that specific context.

metrics: meanSentenceLength=8.2, hedgeCount=0, first=0, second=0.0122, lexiconOverlap=0.19, sampleFidelity=0.2009, distinctivePrecision=0.3286

### x_thread / explain

#### run 1

Why do you publish the same draft everywhere when platform constraints change how readers scan and decide to continue?
You need a workflow that preserves your core idea while rebuilding its delivery mechanism for each specific destination channel.
Try taking one key sentence and rewriting it three times to fit the distinct scanning patterns of email, chat, and social feeds.
This approach ensures your message lands because you respected the room where your audience actually spends their attention today.

metrics: meanSentenceLength=19.75, hedgeCount=0, first=0, second=0.0759, lexiconOverlap=0.1, sampleFidelity=0.1369, distinctivePrecision=0.2022

#### run 2

Why do you ship the same draft to every channel when each platform trains a different eye to scan and decide?
You lose readers because a long thread on X demands a different hook than a dense LinkedIn post or a quick Slack update.
Try this three-step fix: extract your core claim, rewrite the first sentence for each specific room, then cut any context that does not drive action.
Stop asking one piece of work to survive three different rooms by simply copying the text across your social feeds today.

metrics: meanSentenceLength=22.75, hedgeCount=0, first=0, second=0.044, lexiconOverlap=0.18, sampleFidelity=0.1574, distinctivePrecision=0.2686

#### run 3

Why do you expect the same draft to work when platform constraints change how readers scan and decide?
You should rebuild the opening sentence for each channel so it matches the specific attention that room rewards.
Try this sequence: write the core idea once, then cut it into three versions with different first lines.
Your readers will stay only if you treat each platform as a separate room that needs its own key.

metrics: meanSentenceLength=18.25, hedgeCount=0, first=0, second=0.0548, lexiconOverlap=0.14, sampleFidelity=0.1529, distinctivePrecision=0.262

### x_thread / provoke

#### run 1

Stop publishing the same draft everywhere.
Platform constraints change how readers scan and decide.
Your workflow must rebuild delivery for each destination.
Preserve the core idea but rewrite every line.

metrics: meanSentenceLength=7.5, hedgeCount=0, first=0, second=0.0333, lexiconOverlap=0.05, sampleFidelity=0.0782, distinctivePrecision=0.1823

#### run 2

Stop publishing the same draft everywhere.
Platform constraints force readers to scan differently.
Your LinkedIn post fails on Twitter because the rhythm breaks.
Rebuild the delivery for each destination while keeping the core idea.

metrics: meanSentenceLength=8.5, hedgeCount=0, first=0, second=0.0294, lexiconOverlap=0.03, sampleFidelity=0.0924, distinctivePrecision=0.1927

#### run 3

Stop publishing the same draft everywhere.
Platform constraints change how readers scan and decide to continue.
Preserve the core idea but rebuild the delivery for each destination.
One file cannot serve three different scanning patterns effectively.
Rewrite the opening to match the room where it lands.

metrics: meanSentenceLength=9.2, hedgeCount=0, first=0, second=0, lexiconOverlap=0.08, sampleFidelity=0.1128, distinctivePrecision=0.2271

### linkedin / signature

#### run 1

Most teams publish the same draft everywhere without checking how platform constraints change reader behavior. A useful workflow preserves the core idea while rebuilding delivery for each specific destination. The scan pattern on a mobile feed differs sharply from a desktop report or email. Readers decide whether to continue based on how quickly they can find their next step. I often rewrite the opening line entirely when moving work from a doc to a social post. This approach respects the distinct habits of each audience rather than forcing one format to fit all.

metrics: meanSentenceLength=15.5, hedgeCount=0, first=0.0108, second=0, lexiconOverlap=0.12, sampleFidelity=0.1465, distinctivePrecision=0.2181

#### run 2

Teams often publish the same draft everywhere without adjusting for platform constraints. Readers scan differently on each channel and decide quickly whether to stay engaged. A useful workflow preserves the core idea while rebuilding delivery for every destination. The fix is structural rather than creative: match the format to the reader's habit. Context matters, but only after the piece respects the room it enters.

metrics: meanSentenceLength=12.8, hedgeCount=0, first=0, second=0, lexiconOverlap=0.12, sampleFidelity=0.1665, distinctivePrecision=0.312

#### run 3

Most teams paste the same draft everywhere and wonder why engagement drops. Platform constraints change how readers scan, respond, and decide to stay. A useful workflow preserves the core idea while rebuilding delivery for each spot. The fix is structural: decide what the reader must do next. Then rebuild the opening to match that specific room and reward. Context still matters, but only after the reader knows why they are there.

metrics: meanSentenceLength=11.83, hedgeCount=0, first=0, second=0, lexiconOverlap=0.19, sampleFidelity=0.2198, distinctivePrecision=0.381

### linkedin / explain

#### run 1

Why does your best draft underperform when you paste it into a new channel without changes? Platform constraints quietly reshape how readers scan, respond, and decide whether to continue reading your work. You need a repurposing workflow that preserves the core idea while rebuilding its delivery for each specific destination. Start by listing the top three actions a reader can take on that specific platform today. Then cut any sentence that does not directly enable one of those three actions within the first two lines. This approach ensures your message lands with force instead of getting lost in a generic feed.

metrics: meanSentenceLength=16.83, hedgeCount=0, first=0, second=0.0495, lexiconOverlap=0.12, sampleFidelity=0.1402, distinctivePrecision=0.2023

#### run 2

Why do you expect the same draft to work when platform constraints change how readers scan and decide? Most teams publish one version everywhere, then wonder why engagement drops on channels that reward different kinds of attention. You need a repurposing workflow that preserves your core idea while rebuilding the delivery for each specific destination. Start by listing the three platforms you use, then rewrite the opening sentence to match how people scroll on each one. This approach ensures your message lands because it respects the room where it arrives.

metrics: meanSentenceLength=18, hedgeCount=0, first=0, second=0.0556, lexiconOverlap=0.15, sampleFidelity=0.1749, distinctivePrecision=0.2598

#### run 3

Why does your best draft stall when you paste it into a new channel without changing a single word? Platform constraints quietly reshape how readers scan, respond, and decide whether to invest their limited attention in your message. A useful repurposing workflow preserves the core idea while rebuilding its delivery mechanics for each specific destination you target. Try this three-step sequence: isolate the main claim, map the native scanning pattern, and rewrite the first sentence to match that rhythm. You will ship work that actually lands because you respected the room where it arrives.

metrics: meanSentenceLength=19, hedgeCount=0, first=0, second=0.0632, lexiconOverlap=0.13, sampleFidelity=0.1419, distinctivePrecision=0.2075

### linkedin / provoke

#### run 1

Stop publishing the same draft across every channel. Platform constraints change how readers scan and decide. A useful workflow preserves the core idea while rebuilding delivery. Each destination demands a fresh structure for its specific room. Rebuilding the line is cheaper than explaining why it felt off.

metrics: meanSentenceLength=9.4, hedgeCount=0, first=0, second=0, lexiconOverlap=0.11, sampleFidelity=0.1462, distinctivePrecision=0.3099

#### run 2

Stop publishing the same draft across every channel. Platform constraints change how readers scan and decide. A useful workflow preserves the idea while rebuilding delivery.

metrics: meanSentenceLength=8.33, hedgeCount=0, first=0, second=0, lexiconOverlap=0.05, sampleFidelity=0.0796, distinctivePrecision=0.2073

#### run 3

Stop publishing the same draft everywhere. Platform constraints change how readers scan and decide. A useful workflow preserves the idea while rebuilding delivery.

metrics: meanSentenceLength=7.67, hedgeCount=0, first=0, second=0, lexiconOverlap=0.04, sampleFidelity=0.0737, distinctivePrecision=0.1795

### instagram / signature

#### run 1

Teams often publish the same draft everywhere without checking how platform constraints change reader behavior. A useful repurposing workflow preserves the core idea while rebuilding its delivery for each destination.

metrics: meanSentenceLength=15, hedgeCount=0, first=0, second=0, lexiconOverlap=0.05, sampleFidelity=0.0858, distinctivePrecision=0.2029

#### run 2

Teams often ship one draft everywhere, ignoring how each platform changes the way readers scan. The fix is not new ideas but rebuilding the delivery to fit each specific constraint.

metrics: meanSentenceLength=15, hedgeCount=0, first=0, second=0, lexiconOverlap=0.07, sampleFidelity=0.0778, distinctivePrecision=0.2071

#### run 3

Most teams publish the same draft everywhere without checking how platform constraints change reader behavior. Scanning patterns shift across channels, which means a single format rarely works for every destination. A useful workflow keeps the core idea intact while rebuilding the delivery for each specific room. This approach respects how people actually decide to continue reading on different screens.

metrics: meanSentenceLength=14.75, hedgeCount=0, first=0, second=0, lexiconOverlap=0.09, sampleFidelity=0.1272, distinctivePrecision=0.2228

### instagram / explain

#### run 1

Why does your single draft fail when it lands on three different platforms with unique scanning habits? You need a workflow that keeps your core idea intact while rebuilding the delivery for each specific destination constraint. Stop pasting the same text everywhere and start adapting your message to fit the room where it lands.

metrics: meanSentenceLength=18, hedgeCount=0, first=0, second=0.0741, lexiconOverlap=0.06, sampleFidelity=0.105, distinctivePrecision=0.1757

#### run 2

Why does the same draft fail when you post it across three different platforms today? You need to rebuild the opening sentence for each channel so it matches how people scan there. Start by listing the one action you want readers to take on each specific site before you write anything. This approach keeps your core idea intact while making the delivery fit every destination perfectly.

metrics: meanSentenceLength=16.5, hedgeCount=0, first=0, second=0.0758, lexiconOverlap=0.11, sampleFidelity=0.1424, distinctivePrecision=0.2392

#### run 3

Why does your single draft fail when it lands on three different platforms with unique scanning habits? You need a workflow that keeps the core idea intact while rebuilding the delivery for each specific destination constraint. Stop publishing the same file everywhere and start adapting the structure to match how people actually read.

metrics: meanSentenceLength=17.67, hedgeCount=0, first=0, second=0.0377, lexiconOverlap=0.05, sampleFidelity=0.1135, distinctivePrecision=0.1899

### instagram / provoke

#### run 1

Stop publishing the same draft everywhere because platform constraints change how readers decide to continue.

metrics: meanSentenceLength=15, hedgeCount=0, first=0, second=0, lexiconOverlap=0.03, sampleFidelity=0.0561, distinctivePrecision=0.2286

#### run 2

Stop publishing the same draft everywhere.
Platform constraints change how readers scan work.
A useful workflow preserves the core idea.
Rebuild the delivery for each destination.
This shift respects how people actually read.

metrics: meanSentenceLength=6.6, hedgeCount=0, first=0, second=0, lexiconOverlap=0.04, sampleFidelity=0.0855, distinctivePrecision=0.1905

#### run 3

Stop publishing the same draft everywhere because platform constraints change how readers scan.

metrics: meanSentenceLength=13, hedgeCount=0, first=0, second=0, lexiconOverlap=0.02, sampleFidelity=0.0446, distinctivePrecision=0.1739

## Reviewer result

- [ ] Mechanical gate passed (all pairs separate; explain second-person; distinctive precision flat + foreign lower).
- [ ] Blind match of unlabeled outputs to variant labels is well above chance.
- [ ] Foreign-voice control is the odd one out against primary-voice outputs.
- [ ] Criterion 5 may be claimed only after the three boxes above are checked.

Reviewer:

Notes:
