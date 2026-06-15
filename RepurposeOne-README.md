# RepurposeOne

AI-powered content repurposing platform. Turn one piece of content into high-quality, brand-consistent outputs for X/Twitter threads, LinkedIn posts & carousels, Instagram captions, email newsletters, and more — in seconds.

**Status**: MVP in active development (solo founder).  
**Goal**: First paying users in 3–5 weeks, £1–2k MRR within 8–12 weeks.

## What RepurposeOne Does
Users paste or upload content (text, blog posts, transcripts, PDFs, or basic audio) and instantly get platform-optimised outputs that match their brand voice.

**Key Differentiators**
- Strong brand voice learning from just 2–3 samples
- High output quality across multiple formats
- Extremely fast (seconds, not minutes)
- Built for creators, solopreneurs, marketers & startup founders

## Current Tech Stack (MVP)
- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend & Auth**: Supabase (Postgres, Auth, Storage, Realtime)
- **Payments**: Stripe (Checkout + Customer Portal)
- **Hosting**: Vercel
- **AI**: OpenAI / Claude / Grok APIs (optimised for quality + cost)

## Project Structure
```
docs/                  # Living documentation (shared with AI collaborators)
  ├── PRODUCT_SPEC.md
  ├── AI_PROMPTS.md
  └── ARCHITECTURE.md
app/                   # Next.js App Router
components/            # Reusable UI components
lib/                   # Utilities, Supabase client, AI helpers
types/                 # TypeScript definitions
```

## Getting Started (Local Development)
```bash
git clone https://github.com/philipwpillar/RepurposeOne.git
cd RepurposeOne
npm install
cp .env.example .env.local
# Add your keys to .env.local
npm run dev
```

## MVP Scope (Strict — Do Not Expand Without Approval)
**In Scope for Launch**
- Email + Google authentication (Supabase)
- Inputs: Paste text, .txt/.pdf upload, basic audio + transcription
- Outputs: X thread, LinkedIn post + carousel ideas, Instagram caption + hooks, Email newsletter
- Brand voice learning (simple paste 2–3 samples)
- History/library + one-click copy/export
- Basic dashboard + usage tracking + upgrade prompts
- Free tier (hard limits) + paid tiers via Stripe

**Explicitly Out of Scope for MVP**
- Video/clip generation
- Automatic carousel image generation
- Scheduling or auto-posting
- Team collaboration / multiple seats
- Advanced analytics
- Public API
- Mobile app

See `docs/PRODUCT_SPEC.md` for detailed user stories and acceptance criteria.

## Documentation & AI Collaboration
This repo uses a hybrid workflow:
- Grok = primary strategy, architecture & prompt design partner
- Claude (in Cursor) = primary implementation partner
- Claude (Reviewer mode) = independent code/architecture reviewer

All major decisions are documented in the `docs/` folder so both AIs stay aligned.

## Contributing
This is currently a solo-founder project. Issues and discussions are welcome for feedback.

## License
TBD (will be proprietary for the commercial product).

Built with speed and quality in mind by a UK founder for the global creator economy.
```

Now create the .gitignore file.