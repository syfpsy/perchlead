"use client";

import { Button, Textarea } from "@/lib/heroui-compat";
import { useState } from "react";
import { LeadCard } from "./profile-cards";

export function NotesCard({
  initial,
  onSave,
}: {
  initial: string | null;
  onSave: (value: string | null) => void;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [editing, setEditing] = useState(false);
  return (
    <LeadCard
      title="Notes"
      action={
        !editing && (
          <Button
            size="sm"
            radius="full"
            variant="light"
            className="text-xs"
            onPress={() => setEditing(true)}
          >
            Edit
          </Button>
        )
      }
    >
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={value}
            onValueChange={setValue}
            minRows={4}
            placeholder="What do you know about this lead?"
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="light"
              onPress={() => {
                setValue(initial ?? "");
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              color="primary"
              onPress={() => {
                onSave(value.trim() || null);
                setEditing(false);
              }}
            >
              Save
            </Button>
          </div>
        </div>
      ) : value ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{value}</p>
      ) : (
        <p className="text-sm text-ink-500">No notes yet.</p>
      )}
    </LeadCard>
  );
}
