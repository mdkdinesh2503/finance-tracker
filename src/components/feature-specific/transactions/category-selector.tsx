"use client";

import type { TransactionType } from "@/lib/db/schema";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export type CategoryOption = {
  id: string;
  name: string;
  parentId: string | null;
  type: TransactionType;
  isSelectable: boolean;
  sortOrder: number;
};

type Props = {
  categories: CategoryOption[];
  value: string;
  onChange: (categoryId: string, type: TransactionType) => void;
  disabled?: boolean;
  error?: string;
};

export function CategorySelector({
  categories,
  value,
  onChange,
  disabled,
  error,
}: Props) {
  const parents = categories
    .filter((c) => !c.isSelectable)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const byParent = (parentId: string | null) =>
    categories
      .filter((c) => c.parentId === parentId && c.isSelectable)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <Label htmlFor="category">Category</Label>
      <Select
        id="category"
        disabled={disabled}
        value={value}
        onChange={(e) => {
          const id = e.target.value;
          const cat = categories.find((c) => c.id === id);
          if (cat) onChange(id, cat.type);
        }}
        aria-invalid={!!error}
        aria-describedby={error ? "category-err" : undefined}
      >
        <option value="">Select category</option>
        {parents.map((p) => {
          const children = byParent(p.id);
          if (children.length === 0) return null;
          return (
            <optgroup key={p.id} label={p.name}>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          );
        })}
      </Select>
      {error ? (
        <p id="category-err" className="mt-1 text-xs text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

