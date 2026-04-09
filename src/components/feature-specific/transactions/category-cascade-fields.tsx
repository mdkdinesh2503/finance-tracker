"use client";

import { useMemo } from "react";
import type { TransactionType } from "@/lib/db/schema";
import type { CategoryOption } from "./category-selector";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Label } from "@/components/ui/label";

type Props = {
  categories: CategoryOption[];
  parentId: string;
  subId: string;
  onParentChange: (parentId: string) => void;
  onSubChange: (subId: string | null, type: TransactionType | null) => void;
  disabled?: boolean;
  error?: string;
};

export function CategoryCascadeFields({
  categories,
  parentId,
  subId,
  onParentChange,
  onSubChange,
  disabled,
  error,
}: Props) {
  const parentOptions = useMemo(() => {
    return categories
      .filter((c) => !c.isSelectable)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({ id: p.id, name: p.name }));
  }, [categories]);

  const subs = useMemo(() => {
    return categories
      .filter((c) => c.parentId === parentId && c.isSelectable)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [categories, parentId]);

  const subOptions = useMemo(() => subs.map((c) => ({ id: c.id, name: c.name })), [subs]);

  const subEnabled = Boolean(parentId) && subs.length > 0 && !disabled;

  const subEmptyLabel = !parentId
    ? "Select a group first"
    : subs.length === 0
      ? "No subcategories in this group"
      : "Choose subcategory";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <div className="space-y-2">
          <Label htmlFor="category-parent">Category group</Label>
          <DropdownSelect
            id="category-parent"
            value={parentId || null}
            onChange={(id) => onParentChange(id ?? "")}
            options={parentOptions}
            emptyLabel="Choose a group"
            disabled={disabled}
            aria-invalid={!!error}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category-sub" className={!parentId ? "text-zinc-500" : undefined}>
            Subcategory
          </Label>
          <DropdownSelect
            id="category-sub"
            value={subId || null}
            onChange={(id) => {
              if (!id) {
                onSubChange(null, null);
                return;
              }
              const cat = categories.find((c) => c.id === id);
              if (cat) onSubChange(id, cat.type);
            }}
            options={subOptions}
            emptyLabel={subEmptyLabel}
            disabled={!subEnabled}
            aria-invalid={!!error}
          />
        </div>
      </div>
      {error ? (
        <p id="category-cascade-err" className="text-xs text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function parentIdForLeaf(
  categories: CategoryOption[],
  leafId: string | undefined | null,
): string {
  if (!leafId) return "";
  const leaf = categories.find((c) => c.id === leafId && c.isSelectable);
  return leaf?.parentId ?? "";
}

