"use client";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { AlertTriangle } from "lucide-react";

/**
 * Accessible replacement for window.confirm().
 * Manage `open` with local state; pass `onConfirm` + `onCancel`.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDangerous = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      isOpen={open}
      onOpenChange={(o) => { if (!o) onCancel(); }}
      size="sm"
      placement="center"
      backdrop="blur"
      classNames={{ base: "rounded-2xl" }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2 pb-0">
          {isDangerous && <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />}
          <span className="text-base font-semibold text-ink-900">{title}</span>
        </ModalHeader>
        {description && (
          <ModalBody className="pt-2">
            <p className="text-sm text-ink-600">{description}</p>
          </ModalBody>
        )}
        <ModalFooter>
          <Button variant="light" radius="lg" onPress={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            color={isDangerous ? "danger" : "primary"}
            radius="lg"
            onPress={onConfirm}
          >
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
