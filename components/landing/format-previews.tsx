import {
  EmailGlyph,
  InstagramMark,
  LinkedInMark,
  XMark,
} from "@/components/landing/platform-marks";

export function FormatPreviews() {
  return (
    <div className="format-grid">
      <article className="format-card" style={{ ["--fc" as string]: "#E7E7EC" }}>
        <div className="preview thread-prev" aria-hidden="true">
          <div className="thread-line" />
          <div className="tweet">
            <span className="av" />
            <div className="bars">
              <i className="hook" style={{ width: "86%" }} />
              <i style={{ width: "62%" }} />
            </div>
            <span className="tno">1/</span>
          </div>
          <div className="tweet">
            <span className="av" />
            <div className="bars">
              <i style={{ width: "74%" }} />
              <i style={{ width: "56%" }} />
            </div>
            <span className="tno">2/</span>
          </div>
          <div className="tweet">
            <span className="av" />
            <div className="bars">
              <i style={{ width: "80%" }} />
            </div>
            <span className="tno">3/</span>
          </div>
        </div>
        <div className="fmeta">
          <span className="fmark fmark-neutral">
            <XMark />
          </span>
          <div>
            <h3>X / Twitter thread</h3>
            <p>A numbered thread with a real hook, sized to the story you gave it.</p>
          </div>
        </div>
      </article>

      <article className="format-card" style={{ ["--fc" as string]: "#3B82F6" }}>
        <div className="preview li-prev" aria-hidden="true">
          <div className="bars post-bars">
            <i className="hook" style={{ width: "90%" }} />
            <i style={{ width: "68%" }} />
          </div>
          <div className="slides">
            <span className="slide">01</span>
            <span className="slide">02</span>
            <span className="slide">03</span>
            <span className="slide">04</span>
          </div>
        </div>
        <div className="fmeta">
          <span className="fmark fmark-neutral">
            <LinkedInMark />
          </span>
          <div>
            <h3>LinkedIn post + carousel ideas</h3>
            <p>A post plus a slide-by-slide outline you can design your way.</p>
          </div>
        </div>
      </article>

      <article className="format-card" style={{ ["--fc" as string]: "#E24BC4" }}>
        <div className="preview ig-prev" aria-hidden="true">
          <div className="frame" />
          <div className="cap-side">
            <div className="bars">
              <i style={{ width: "92%" }} />
              <i style={{ width: "70%" }} />
              <i style={{ width: "52%" }} />
            </div>
            <div className="hooks">
              <span className="hookchip">hook A</span>
              <span className="hookchip">hook B</span>
              <span className="hookchip">hook C</span>
            </div>
          </div>
        </div>
        <div className="fmeta">
          <span className="fmark fmark-neutral">
            <InstagramMark />
          </span>
          <div>
            <h3>Instagram caption + hooks</h3>
            <p>A caption in your voice, with alternative hooks to test.</p>
          </div>
        </div>
      </article>

      <article className="format-card" style={{ ["--fc" as string]: "#2DD4BF" }}>
        <div className="preview em-prev" aria-hidden="true">
          <div className="subject">
            <i className="hook" style={{ width: "54%" }} />
          </div>
          <div className="bars body-bars">
            <i style={{ width: "94%" }} />
            <i style={{ width: "86%" }} />
            <i style={{ width: "64%" }} />
            <i style={{ width: "76%" }} />
          </div>
        </div>
        <div className="fmeta">
          <span className="fmark fmark-teal">
            <EmailGlyph />
          </span>
          <div>
            <h3>Email newsletter draft</h3>
            <p>A warm, structured draft ready for your next send.</p>
          </div>
        </div>
      </article>
    </div>
  );
}
