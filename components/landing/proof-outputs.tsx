import {
  EmailGlyph,
  LinkedInMark,
  XMark,
} from "@/components/landing/platform-marks";

/**
 * Product proof cards - genuine Voiceora-style outputs about the product itself.
 * Not customer testimonials; not invented counts. Matches the "written with Voiceora" claim.
 */
export function ProofOutputs() {
  return (
    <div className="proof-grid">
      <article className="proof-card">
        <div className="proof-meta">
          <span className="proof-platform">
            <XMark />
            X thread
          </span>
          <span className="proof-source">Generated in Studio</span>
        </div>
        <ol className="proof-thread">
          <li>
            One source. Four platforms. Still sounding like you - that’s the
            whole product.
          </li>
          <li>
            Paste a post, a transcript, or a photo. Teach Voiceora 2-3 samples
            of how you write. Then generate.
          </li>
          <li>
            Free plan, no card. Outputs land in your Library so you can edit,
            copy, and reuse.
          </li>
        </ol>
      </article>

      <article className="proof-card">
        <div className="proof-meta">
          <span className="proof-platform">
            <LinkedInMark />
            LinkedIn
          </span>
          <span className="proof-source">Generated in Studio</span>
        </div>
        <p className="proof-body">
          Most “repurposing” tools rewrite your idea into generic marketing
          copy. Voiceora starts from your voice - samples or a short style note
 - then drafts an X thread, LinkedIn post, Instagram caption, and email
          from one input.
        </p>
        <p className="proof-body">
          Photo packs (Pro Plus) turn a set of images into captions, a posting
          order, and platform posts in one run. Same voice. Same Library.
        </p>
        <div className="proof-formats" aria-hidden="true">
          <span>
            <XMark />
          </span>
          <span>
            <LinkedInMark />
          </span>
          <span>
            <EmailGlyph />
          </span>
        </div>
      </article>
    </div>
  );
}
