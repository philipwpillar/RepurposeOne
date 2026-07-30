# Voice variant separation artefact

Generated: 2026-07-30T14:21:38.007Z
Model: qwen/qwen3.5-397b-a17b
Provider pin: deepinfra/fp8
Repeats per cell: 3
Formats: x_thread, linkedin, instagram

## Fixture

Primary identity (mid-register, not provoke-shaped): Practitioner writing for operators who ship work. Prefer concrete examples and plain language. Mix short lines with fuller explanations when a point needs room. Sound like a thoughtful peer, not a manifesto and not a tutorial script.

Primary samples: 4 (expanded for n-gram fidelity).

## Mechanical gate

- all variant pairs separate on sentence length or second-person (every format): **PASS**
- explain second-person above signature and provoke (every format): **PASS**
- distinctive sample n-gram precision stays flat across primary variants (max−min ≤ 0.12): **PASS** (spread=0.0734)
- foreign distinctive precision below every primary cell by ≥ 0.05: **PASS** (foreign=0.0258, primaryMin=0.1985)

### Mean metrics by format × variant

| format | variant | meanSentenceLength | hedgeCount | firstPersonRatio | secondPersonRatio | lexiconOverlap (report-only) | sampleFidelity (report-only) | distinctivePrecision |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| x_thread | signature | 8.42 | 0 | 0.0074 | 0.0107 | 0.16 | 0.1753 | 0.2719 |
| x_thread | explain | 12.93 | 0 | 0 | 0.048 | 0.09 | 0.1329 | 0.1985 |
| x_thread | provoke | 14.7 | 0 | 0 | 0.0282 | 0.1267 | 0.1477 | 0.2628 |
| linkedin | signature | 9.43 | 0 | 0 | 0 | 0.1467 | 0.1689 | 0.27 |
| linkedin | explain | 17.28 | 0 | 0 | 0.0583 | 0.1133 | 0.1366 | 0.202 |
| linkedin | provoke | 15 | 0 | 0 | 0 | 0.05 | 0.0925 | 0.2098 |
| instagram | signature | 9.89 | 0 | 0 | 0.0152 | 0.0533 | 0.097 | 0.223 |
| instagram | explain | 18.97 | 0 | 0 | 0.0796 | 0.0867 | 0.1229 | 0.2176 |
| instagram | provoke | 15 | 0 | 0 | 0 | 0.03 | 0.0561 | 0.2286 |

## Foreign-voice control (LinkedIn / signature)

Distinctive primary-sample n-gram precision on foreign outputs (mean): **0.0258**
Primary-sample n-gram fidelity on foreign outputs (mean, report-only): **0.0788**
Legacy primary-lexicon overlap on foreign outputs (mean, report-only): **0.04**

### foreign run 1

Have you ever shared the same draft everywhere, hoping it would land the same way? It is a common feeling, isn't it? Yet every space has its own rhythm, changing how we scan, respond, and decide to stay. Perhaps the kindest thing we can do for our ideas is to let them breathe in new shapes, rebuilding the delivery while keeping the heart of the message intact.

metrics: distinctivePrecision=0.0253, sampleFidelity=0.0782, lexiconOverlap=0.0400

### foreign run 2

Have you ever shared the same draft everywhere, hoping it would land the same way? It is a common feeling, isn't it? Yet every space has its own rhythm, changing how we scan and decide to stay. Perhaps the kindest thing we can do for our ideas is to let them breathe in new shapes, rebuilding the delivery while keeping the heart of the message intact.

metrics: distinctivePrecision=0.0261, sampleFidelity=0.0791, lexiconOverlap=0.0400

### foreign run 3

Have you ever shared the same draft everywhere, hoping it would land the same way? It is a common feeling, isn't it? Yet every space has its own rhythm, changing how we scan and decide to stay. Perhaps the kindest thing we can do for our ideas is to let them breathe in new shapes, rebuilding the delivery while keeping the heart of the message intact.

metrics: distinctivePrecision=0.0261, sampleFidelity=0.0791, lexiconOverlap=0.0400

## Primary outputs

### x_thread / signature

#### run 1

1. Most teams publish the same draft everywhere. It feels efficient until you notice the drop-off in replies on one channel versus another.
2. Platform constraints change how readers scan. A thread rewards a hook; a blog post rewards a summary. The same sentence does different work in each room.
3. A useful workflow preserves the idea while rebuilding the delivery. Keep the core insight, but rewrite the opening and the ask for each destination.
4. Rebuilding the line is cheaper than explaining why the original felt off. Treat each channel as a new room with its own rules for attention.

metrics: meanSentenceLength=7.85, hedgeCount=0, first=0, second=0.0098, lexiconOverlap=0.2, sampleFidelity=0.2026, distinctivePrecision=0.3057

#### run 2

1. Most teams publish the same draft everywhere. It feels efficient until you see how platform constraints change the way readers scan and decide to stay.
2. A useful repurposing workflow preserves the core idea but rebuilds the delivery for each destination. The hook that works in a newsletter will likely fail in a changelog.
3. I treat each channel as a different room with its own rules. Rebuilding the line is cheaper than explaining later why the original felt off.

metrics: meanSentenceLength=9, hedgeCount=0, first=0.0123, second=0.0123, lexiconOverlap=0.16, sampleFidelity=0.1905, distinctivePrecision=0.3115

#### run 3

1. Most teams ship the same draft everywhere. It feels efficient until you notice the drop-off in replies on one channel versus another.
2. Platform constraints aren't just character limits. They change how a reader scans, where their thumb rests, and what they are willing to click.
3. A useful workflow preserves the core idea but rebuilds the delivery for each destination. The hook that works in an email will often die in a feed.
4. I treat repurposing as reconstruction, not copy-paste. If the line doesn't fit the room, cut it and write a new one that does.

metrics: meanSentenceLength=8.42, hedgeCount=0, first=0.0099, second=0.0099, lexiconOverlap=0.12, sampleFidelity=0.1328, distinctivePrecision=0.1984

### x_thread / explain

#### run 1

1. Why do you expect the same draft to work when platform constraints change how readers scan and decide?
2. You need a workflow that preserves your core idea while rebuilding the delivery for each specific destination channel.
3. Try this sequence: extract the main claim, then rewrite the opening sentence to match the scanning pattern of that room.
4. The real fix is stopping the copy-paste habit and treating each platform as a distinct room with its own rules.

metrics: meanSentenceLength=10.13, hedgeCount=0, first=0, second=0.037, lexiconOverlap=0.09, sampleFidelity=0.1338, distinctivePrecision=0.2069

#### run 2

1. Why do you expect the same draft to work when platform constraints change how readers scan and decide?
2. You need a three-step workflow: extract the core idea, map it to each channel's scanning pattern, then rebuild the delivery.
3. A post that works on a blog often fails on social because the reader there rewards speed over complete context.
4. Preserve your central argument but rewrite every sentence so it fits the specific attention span of that destination.
5. Your final output should be distinct versions of one idea rather than a single link pasted everywhere.

metrics: meanSentenceLength=9.9, hedgeCount=0, first=0, second=0.0404, lexiconOverlap=0.12, sampleFidelity=0.1429, distinctivePrecision=0.2183

#### run 3

Why do you publish the same draft everywhere when platform constraints change how readers scan and decide?
You need a workflow that preserves your core idea while rebuilding the delivery for each specific destination channel.
Try this sequence: extract the main claim, then rewrite the first sentence to match how users scroll on that app.
Your conclusion is that repurposing works only when you treat each platform as a distinct room with its own rules.

metrics: meanSentenceLength=18.75, hedgeCount=0, first=0, second=0.0667, lexiconOverlap=0.06, sampleFidelity=0.1221, distinctivePrecision=0.1704

### x_thread / provoke

#### run 1

Stop publishing the same draft everywhere because platform constraints change how readers decide to continue.
A LinkedIn post demands a different scan pattern than a Slack update or a landing page.
Preserve the core idea but rebuild the delivery so each destination gets the shape it needs.
Reusing the exact same lines ignores how each channel trains a different ear for action.

metrics: meanSentenceLength=15.5, hedgeCount=0, first=0, second=0, lexiconOverlap=0.11, sampleFidelity=0.1407, distinctivePrecision=0.2635

#### run 2

Stop publishing the same draft everywhere because platform constraints change how readers decide to continue.
Twitter rewards a sharp hook while email demands clear context for the next step.
Rebuilding the delivery for each destination preserves your core idea without losing the reader.
Copy-paste workflows ignore how different channels train distinct scanning habits in your audience.
Ship work that respects the room where your reader actually encounters your message.

metrics: meanSentenceLength=14, hedgeCount=0, first=0, second=0.0571, lexiconOverlap=0.13, sampleFidelity=0.1481, distinctivePrecision=0.25

#### run 3

Stop publishing the same draft everywhere because platform constraints change how readers decide to continue.
Your audience on LinkedIn scans for depth while your Twitter followers hunt for a sharp hook.
A useful workflow preserves the core idea but rebuilds the delivery to fit each destination.
Reusing the exact same lines ignores how each channel trains a different ear.
Cut the original until every sentence carries a specific job for that specific room.

metrics: meanSentenceLength=14.6, hedgeCount=0, first=0, second=0.0274, lexiconOverlap=0.14, sampleFidelity=0.1542, distinctivePrecision=0.2748

### linkedin / signature

#### run 1

Most teams publish the same draft everywhere. That rarely works because platform constraints change how readers scan and decide to stay.

A useful repurposing workflow preserves the core idea while rebuilding the delivery for each destination. The LinkedIn post needs a hook. The internal memo needs a clear ask. The landing page needs proof.

Treat the channel as a constraint, not just a container. Rebuilding the line is cheaper than explaining why the original felt off.

metrics: meanSentenceLength=9.5, hedgeCount=0, first=0, second=0, lexiconOverlap=0.15, sampleFidelity=0.1727, distinctivePrecision=0.2955

#### run 2

Most teams publish the same draft everywhere. They assume the idea carries the weight. It doesn't.

Platform constraints change how readers scan, respond, and decide to stay. A LinkedIn scroll demands a different hook than an internal wiki or a customer email.

A useful repurposing workflow preserves the core idea while rebuilding the delivery for each destination. Keep the insight. Rewrite the entry point.

It is cheaper to rebuild the line than to explain why the original felt off.

metrics: meanSentenceLength=8.78, hedgeCount=0, first=0, second=0, lexiconOverlap=0.14, sampleFidelity=0.1684, distinctivePrecision=0.2673

#### run 3

Most teams publish the same draft everywhere. That rarely works because platform constraints change how readers scan and decide to stay.

A useful repurposing workflow preserves the core idea while rebuilding the delivery for each destination. The LinkedIn post needs a hook that stops the scroll. The internal memo needs a subject line that signals urgency. The customer email needs an opening that respects their time.

Keep the insight. Change the shape. It is cheaper to rewrite the line than to explain why the original felt off in that room.

metrics: meanSentenceLength=10, hedgeCount=0, first=0, second=0, lexiconOverlap=0.15, sampleFidelity=0.1657, distinctivePrecision=0.2473

### linkedin / explain

#### run 1

Why do you publish the same draft everywhere when platform constraints change how readers scan? Your audience on LinkedIn scans for data points while Twitter users look for a sharp hook to click. A useful repurposing workflow preserves the core idea while rebuilding its delivery for each specific destination channel. Start by listing the one action you want readers to take on each platform before writing anything. Then rewrite your opening sentence to match that single goal instead of trying to please every reader at once. This approach ensures your message lands because it respects the unique rhythm of each network.

metrics: meanSentenceLength=16.83, hedgeCount=0, first=0, second=0.0495, lexiconOverlap=0.12, sampleFidelity=0.1385, distinctivePrecision=0.1909

#### run 2

Why do you expect the same draft to work when platform constraints change how readers scan and decide? Most teams publish one version everywhere, then wonder why engagement drops on channels that reward different kinds of attention. You need a repurposing workflow that preserves your core idea while rebuilding the delivery for each specific destination. Start by listing the single action you want a reader to take on each platform before you write a word. This structural shift ensures your message lands because it respects the room where it arrives.

metrics: meanSentenceLength=18, hedgeCount=0, first=0, second=0.0667, lexiconOverlap=0.16, sampleFidelity=0.1627, distinctivePrecision=0.2463

#### run 3

Why do you publish the same draft everywhere when platform constraints change how readers scan? Your audience on LinkedIn scans for data points while email readers look for immediate next steps. Try this sequence: extract your core metric, rewrite the hook for that specific channel, then place the call to action above the fold. You preserve the original idea only by rebuilding its delivery to match each destination.

metrics: meanSentenceLength=17, hedgeCount=0, first=0, second=0.0588, lexiconOverlap=0.06, sampleFidelity=0.1087, distinctivePrecision=0.1689

### linkedin / provoke

#### run 1

Stop publishing the same draft everywhere because platform constraints change how readers decide to continue. A useful repurposing workflow preserves the core idea while rebuilding its delivery for each destination.

metrics: meanSentenceLength=15, hedgeCount=0, first=0, second=0, lexiconOverlap=0.05, sampleFidelity=0.0925, distinctivePrecision=0.2098

#### run 2

Stop publishing the same draft everywhere because platform constraints change how readers decide to continue. A useful repurposing workflow preserves the core idea while rebuilding its delivery for each destination.

metrics: meanSentenceLength=15, hedgeCount=0, first=0, second=0, lexiconOverlap=0.05, sampleFidelity=0.0925, distinctivePrecision=0.2098

#### run 3

Stop publishing the same draft everywhere because platform constraints change how readers decide to continue. A useful repurposing workflow preserves the core idea while rebuilding its delivery for each destination.

metrics: meanSentenceLength=15, hedgeCount=0, first=0, second=0, lexiconOverlap=0.05, sampleFidelity=0.0925, distinctivePrecision=0.2098

### instagram / signature

#### run 1

Most teams publish the same draft everywhere. Platform constraints change how readers scan and decide. A useful workflow preserves the idea while rebuilding the delivery for each destination.

metrics: meanSentenceLength=9.33, hedgeCount=0, first=0, second=0, lexiconOverlap=0.05, sampleFidelity=0.091, distinctivePrecision=0.2186

#### run 2

Most teams publish the same draft everywhere. Platform constraints change how readers scan and decide. A useful workflow preserves the idea while rebuilding the delivery for each destination.

metrics: meanSentenceLength=9.33, hedgeCount=0, first=0, second=0, lexiconOverlap=0.05, sampleFidelity=0.091, distinctivePrecision=0.2186

#### run 3

Most teams publish the same draft everywhere. That fails because platform constraints change how readers scan and decide. A useful workflow preserves the core idea but rebuilds the delivery for each destination. You aren't just resizing an image; you are rewriting the entry point.

metrics: meanSentenceLength=11, hedgeCount=0, first=0, second=0.0455, lexiconOverlap=0.06, sampleFidelity=0.1089, distinctivePrecision=0.2319

### instagram / explain

#### run 1

Why does your best draft stall when you paste it into a new channel without changing a single word? Platform constraints force readers to scan differently, so you must rebuild the delivery while keeping the core idea intact. Try rewriting your opening sentence to match the specific attention span of each destination before you hit publish. Your work ships further when you treat every platform as a unique room that demands its own key.

metrics: meanSentenceLength=18.5, hedgeCount=0, first=0, second=0.0946, lexiconOverlap=0.08, sampleFidelity=0.1217, distinctivePrecision=0.2061

#### run 2

Why does your best draft stall when you paste it into a new channel without changing a single word? Platform constraints force readers to scan differently, so you must rebuild the opening line and call to action for each destination. Preserve the core idea but rewrite the delivery mechanism to match how people actually decide to continue reading there.

metrics: meanSentenceLength=19.67, hedgeCount=0, first=0, second=0.0508, lexiconOverlap=0.09, sampleFidelity=0.126, distinctivePrecision=0.2438

#### run 3

Why does your best draft stall when you paste it into a new channel without changing a single word? Platform constraints force readers to scan differently, so you must rebuild the delivery while keeping the core idea intact. Try rewriting your opening sentence to match the specific attention span of each destination before you hit publish. Your work ships further when you treat every platform as a unique room that demands its own entry point.

metrics: meanSentenceLength=18.75, hedgeCount=0, first=0, second=0.0933, lexiconOverlap=0.09, sampleFidelity=0.1209, distinctivePrecision=0.203

### instagram / provoke

#### run 1

Stop publishing the same draft everywhere because platform constraints change how readers decide to continue.

metrics: meanSentenceLength=15, hedgeCount=0, first=0, second=0, lexiconOverlap=0.03, sampleFidelity=0.0561, distinctivePrecision=0.2286

#### run 2

Stop publishing the same draft everywhere because platform constraints change how readers decide to continue.

metrics: meanSentenceLength=15, hedgeCount=0, first=0, second=0, lexiconOverlap=0.03, sampleFidelity=0.0561, distinctivePrecision=0.2286

#### run 3

Stop publishing the same draft everywhere because platform constraints change how readers decide to continue.

metrics: meanSentenceLength=15, hedgeCount=0, first=0, second=0, lexiconOverlap=0.03, sampleFidelity=0.0561, distinctivePrecision=0.2286

## Reviewer result

- [ ] Mechanical gate passed (all pairs separate; explain second-person; distinctive precision flat + foreign lower).
- [ ] Blind match of unlabeled outputs to variant labels is well above chance.
- [ ] Foreign-voice control is the odd one out against primary-voice outputs.
- [ ] Criterion 5 may be claimed only after the three boxes above are checked.

Reviewer:

Notes:
