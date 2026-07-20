import type { UserWorkflowStatus } from "@/types";

export async function patchWorkflowStatus(
  repurposeId: string,
  user_workflow_status: UserWorkflowStatus | null
): Promise<boolean> {
  try {
    const response = await fetch(`/api/repurposes/${repurposeId}/feedback`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_workflow_status }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function markCopiedIfNeeded(
  repurposeId: string | undefined,
  currentStatus: UserWorkflowStatus | null | undefined,
  onStatusChange?: (status: UserWorkflowStatus) => void
): void {
  if (!repurposeId || currentStatus) {
    return;
  }
  void patchWorkflowStatus(repurposeId, "copied").then((ok) => {
    if (ok) {
      onStatusChange?.("copied");
    }
  });
}
