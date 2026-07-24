"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ModeSwitchDialogProps {
  open: boolean;
  targetLabel: string;
  clearDescription: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ModeSwitchDialog({
  open,
  targetLabel,
  clearDescription,
  onConfirm,
  onCancel,
}: ModeSwitchDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Switch to {targetLabel}?</DialogTitle>
          <DialogDescription>{clearDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            Switch and clear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
