export type DatePreset =
  | "ALL_TIME"
  | "THIS_YEAR"
  | "THIS_AND_PREVIOUS_YEAR"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_MONTH_ALL_YEARS"
  | "LAST_MONTH_ALL_YEARS"
  | "CUSTOM_RANGE";

export type TransactionFilterState = {
  datePreset: DatePreset;
  /** YYYY-MM-DD when set; used for CUSTOM_RANGE and synced from presets for display. */
  fromDate: string | null;
  toDate: string | null;
  categoryContains: string;
  locationId: string | null;
};
