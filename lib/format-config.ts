import type { TargetFormat } from "@/types";

export interface FormatOption {
  id: TargetFormat | string;
  label: string;
  description: string;
  available: boolean;
  comingSoon?: boolean;
}

/** UI-only format list — only wire formats with prompts in prompts.ts */
export const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: "x_thread",
    label: "X / Twitter Thread",
    description: "Numbered tweets optimised for engagement",
    available: true,
  },
  {
    id: "linkedin",
    label: "LinkedIn Post",
    description: "Post + carousel slide ideas",
    available: true,
  },
  {
    id: "instagram",
    label: "Instagram Caption",
    description: "Caption + hook ideas",
    available: true,
  },
  {
    id: "email",
    label: "Email Newsletter",
    description: "Newsletter draft from your content",
    available: true,
  },
];
