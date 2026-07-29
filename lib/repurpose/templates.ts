export interface StudioTemplate {
  id: string;
  title: string;
  body: string;
}

const NEWSLETTER_TO_PLATFORMS = `Last month I finally stopped trying to post on every platform at once. Instead, I write one piece — usually a newsletter — and repurpose it into everything else. The LinkedIn version sounds like me talking to peers. The email reads like I'm writing to subscribers I actually know. Same ideas, four native formats, one afternoon of work instead of four.`;

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: "newsletter-to-platforms",
    title: "Newsletter → platforms",
    body: NEWSLETTER_TO_PLATFORMS,
  },
  {
    id: "product-launch",
    title: "Product launch note",
    body: `We just shipped photo input in Voiceora. Upload one image, add a short context note, and get platform-native drafts for X, LinkedIn, Instagram, and email — all in your brand voice. Same idea, four formats, one pass.`,
  },
  {
    id: "founder-lesson",
    title: "Founder lesson",
    body: `The hardest part of building in public isn't the building — it's sounding like yourself on every platform. I stopped rewriting the same update four times and started from one honest note about what shipped, what broke, and what I'd do differently.`,
  },
  {
    id: "customer-story",
    title: "Customer win",
    body: `A creator on our beta plan turned one newsletter into a week's worth of posts without losing her voice. She pasted the draft once, picked her formats, and had native LinkedIn, X, and email versions ready before lunch. Same story — tuned for each channel.`,
  },
];

/** Backward-compatible alias for ?example=1 and existing imports. */
export const STUDIO_EXAMPLE_INPUT = STUDIO_TEMPLATES[0]!.body;

export function getStudioTemplate(id: string): StudioTemplate | undefined {
  return STUDIO_TEMPLATES.find((template) => template.id === id);
}
