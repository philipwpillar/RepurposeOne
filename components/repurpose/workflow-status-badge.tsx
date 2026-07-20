import { Badge } from "@/components/ui/badge";
import type { UserWorkflowStatus } from "@/types";

export function WorkflowStatusBadge({
  status,
}: {
  status: UserWorkflowStatus | null | undefined;
}) {
  if (!status) {
    return null;
  }

  return (
    <Badge variant="outline" className="capitalize">
      {status === "copied" ? "Copied" : "Posted"}
    </Badge>
  );
}
