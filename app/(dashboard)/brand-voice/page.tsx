import { Mic } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BrandVoicePage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Brand Voice</h1>
        <p className="text-muted-foreground">
          Learn your writing style from 2–3 samples and apply it consistently
          across every output.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
          <Mic className="h-6 w-6 text-teal-600" />
        </div>
        <Badge
          variant="secondary"
          className="border border-slate-200 bg-slate-50 text-slate-600"
        >
          Coming soon
        </Badge>
      </div>
    </div>
  );
}
