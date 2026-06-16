import type {
  EmailOutput,
  InstagramOutput,
  LinkedInOutput,
  RepurposeOutput,
  XThreadOutput,
} from "@/types";

export function formatXThreadForCopy(output: XThreadOutput): string {
  return output.tweets.map((tweet) => tweet.text).join("\n\n");
}

export function formatLinkedInForCopy(output: LinkedInOutput): string {
  const slides = output.carousel_slides
    .map((slide) => {
      const body = slide.body ? `\n${slide.body}` : "";
      return `Slide ${slide.number}: ${slide.title}${body}`;
    })
    .join("\n\n");

  return `${output.post}\n\n--- Carousel slides ---\n\n${slides}`;
}

export function formatInstagramForCopy(output: InstagramOutput): string {
  const hooks = output.hook_variations.map((h, i) => `${i + 1}. ${h}`).join("\n");
  const tags = output.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");

  return `${output.caption}\n\n--- Hook variations ---\n${hooks}\n\n${tags}`;
}

export function formatEmailForCopy(output: EmailOutput): string {
  const preview = output.preview_text
    ? `Preview: ${output.preview_text}\n\n`
    : "";
  return `Subject: ${output.subject_line}\n\n${preview}${output.body}`;
}

export function formatOutputForCopy(output: RepurposeOutput): string {
  switch (output.format) {
    case "x_thread":
      return formatXThreadForCopy(output);
    case "linkedin":
      return formatLinkedInForCopy(output);
    case "instagram":
      return formatInstagramForCopy(output);
    case "email":
      return formatEmailForCopy(output);
  }
}

export function getOutputPreview(output: RepurposeOutput): string {
  switch (output.format) {
    case "x_thread": {
      const first = output.tweets[0]?.text ?? "";
      return first.length > 120 ? `${first.slice(0, 120)}…` : first;
    }
    case "linkedin": {
      const text = output.post;
      return text.length > 120 ? `${text.slice(0, 120)}…` : text;
    }
    case "instagram": {
      const text = output.caption;
      return text.length > 120 ? `${text.slice(0, 120)}…` : text;
    }
    case "email": {
      const text = output.subject_line;
      return text.length > 120 ? `${text.slice(0, 120)}…` : text;
    }
  }
}

export function formatLabel(targetFormat: string): string {
  switch (targetFormat) {
    case "x_thread":
      return "X Thread";
    case "linkedin":
      return "LinkedIn";
    case "instagram":
      return "Instagram";
    case "email":
      return "Email";
    default:
      return targetFormat;
  }
}
