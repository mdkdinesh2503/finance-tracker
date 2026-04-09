import { create } from "zustand";
import { dateBoundsForPreset } from "@/lib/utilities/date-presets";
import type { DatePreset, TransactionFilterState } from "@/lib/types/filters";

type FilterStore = TransactionFilterState & {
  setDatePreset: (p: DatePreset) => void;
  setFromDate: (v: string | null) => void;
  setToDate: (v: string | null) => void;
  setCategoryContains: (v: string) => void;
  setLocationId: (id: string | null) => void;
  reset: () => void;
};

const initial: TransactionFilterState = {
  datePreset: "ALL_TIME",
  fromDate: null,
  toDate: null,
  categoryContains: "",
  locationId: null,
};

export const useTransactionFilters = create<FilterStore>((set) => ({
  ...initial,
  setDatePreset: (datePreset) =>
    set(() => {
      if (datePreset === "CUSTOM_RANGE") {
        return { datePreset };
      }
      const { fromDate, toDate } = dateBoundsForPreset(datePreset, new Date());
      return { datePreset, fromDate, toDate };
    }),
  setFromDate: (fromDate) => set({ fromDate, datePreset: "CUSTOM_RANGE" }),
  setToDate: (toDate) => set({ toDate, datePreset: "CUSTOM_RANGE" }),
  setCategoryContains: (categoryContains) => set({ categoryContains }),
  setLocationId: (locationId) => set({ locationId }),
  reset: () => set(initial),
}));
