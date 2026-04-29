"use client";

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { LeadFilters, Product, SavedList, Source, Tag } from "@/types";
import { LeadFilterBar } from "./lead-filters";
import { store } from "@/lib/store/data-store";
import { nowIso } from "@/lib/utils/id";
import { useToast } from "@/components/ui/toast";

export function EditListModal({
  open,
  list,
  tags,
  products,
  sources,
  onOpenChange,
  onDeleted,
}: {
  open: boolean;
  list: SavedList | null;
  tags: Tag[];
  products: Product[];
  sources: Source[];
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [filters, setFilters] = useState<LeadFilters>({});

  useEffect(() => {
    if (open && list) {
      setName(list.name);
      setFilters(list.filters_json ?? {});
    }
  }, [open, list]);

  if (!list) return null;

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    store.update((s) => {
      const idx = s.lists.findIndex((l) => l.id === list!.id);
      if (idx === -1) return;
      s.lists[idx] = {
        ...s.lists[idx]!,
        name: trimmed,
        filters_json: stripQuery(filters),
        updated_at: nowIso(),
      };
    });
    toast.push({ tone: "success", title: "List updated" });
    onOpenChange(false);
  }

  function remove() {
    if (!window.confirm(`Delete the list “${list!.name}”?`)) return;
    store.update((s) => {
      s.lists = s.lists.filter((l) => l.id !== list!.id);
    });
    toast.push({ tone: "info", title: "List deleted" });
    onOpenChange(false);
    onDeleted?.();
  }

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange} size="2xl" placement="center" backdrop="blur">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-ink-900">Edit list</h3>
          <p className="text-xs text-ink-500">
            Tune the filter set. The free-text query is per-session and isn't saved here.
          </p>
        </ModalHeader>
        <ModalBody className="space-y-3">
          <Input
            label="List name"
            value={name}
            onValueChange={setName}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <LeadFilterBar
            filters={filters}
            onChange={setFilters}
            tags={tags}
            products={products}
            sources={sources}
          />
        </ModalBody>
        <ModalFooter className="flex items-center justify-between gap-2">
          <Button
            variant="light"
            color="danger"
            startContent={<Trash2 className="h-3.5 w-3.5" />}
            onPress={remove}
          >
            Delete list
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="light" onPress={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={save} isDisabled={!name.trim()}>
              Save changes
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function stripQuery(filters: LeadFilters): LeadFilters {
  const { query: _query, ...rest } = filters;
  return rest;
}
