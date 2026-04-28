/** App-wide amounts in Indian Rupees (₹). */
export function formatCurrency(n: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

/** INR for string or numeric inputs; non-finite values → `₹0`. */
export function formatInr(amount: string | number): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "₹0";
  return formatCurrency(n, "INR");
}

/** Signed deltas for comparisons: `+₹1,460.00`, `-₹5,120.00`, `+₹0.00`. */
export function formatDeltaCurrency(n: number): string {
  const abs = formatCurrency(Math.abs(n));
  if (n > 0) return `+${abs}`;
  if (n < 0) return `-${abs}`;
  return `+${abs}`;
}

/** `YYYY-MM` → `April, 2026` (use on chart tooltips / detail). */
export function formatYearMonthLabel(ym: string): string {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return ym;
  }
  const month = new Date(y, m - 1, 1).toLocaleString("en-IN", {
    month: "long",
  });
  return `${month}, ${y}`;
}

/** `YYYY-MM` → short tick for X-axis only (e.g. Apr ’26). */
export function formatYearMonthAxisShort(ym: string): string {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return ym;
  }
  const monthShort = new Date(y, m - 1, 1).toLocaleString("en-IN", {
    month: "short",
  });
  return `${monthShort} ’${String(y).slice(-2)}`;
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** `YYYY-MM-DD` → `08, April, 2026` (transaction list). */
export function formatTransactionTableDate(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return dateStr;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    return dateStr;
  }
  const monthName = new Date(y, mo - 1, 1).toLocaleString("en-IN", {
    month: "long",
  });
  return `${String(d).padStart(2, "0")}, ${monthName}, ${y}`;
}

/** `HH:MM` or `HH:MM:SS` → `1:05 PM` (transaction list). */
export function formatTransactionTableTime(timeStr: string): string {
  const parts = timeStr.trim().split(":");
  const h24 = Number.parseInt(parts[0] ?? "0", 10);
  const minutePart = (parts[1] ?? "00").split(".")[0] ?? "00";
  const mmNum = Number.parseInt(minutePart, 10);
  const mm = String(
    Number.isFinite(mmNum) ? Math.min(59, Math.max(0, mmNum)) : 0,
  ).padStart(2, "0");
  if (!Number.isFinite(h24)) {
    return timeStr.slice(0, 8);
  }
  const safeH = Math.min(23, Math.max(0, h24));
  const ampm = safeH >= 12 ? "PM" : "AM";
  const h12 = safeH % 12 || 12;
  return `${h12}:${mm} ${ampm}`;
}

/** `DD/MM/YYYY, h:mm AM/PM` for dashboard activity rows (DB date + time strings). */
export function formatActivityDateTime(
  dateStr: string | null | undefined,
  timeStr: string | null | undefined,
): string {
  const date = typeof dateStr === "string" ? dateStr.trim() : "";
  const time = typeof timeStr === "string" ? timeStr.trim() : "";

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) {
    // If the DB row is incomplete, avoid "undefined/NaN" UI.
    return "—";
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) {
    return "—";
  }

  const parts = time.split(":");
  const h24 = Number.parseInt(parts[0] ?? "0", 10);
  const minutePart = (parts[1] ?? "00").split(".")[0] ?? "00";
  const mmNum = Number.parseInt(minutePart, 10);
  const mm = String(
    Number.isFinite(mmNum) ? Math.min(59, Math.max(0, mmNum)) : 0,
  ).padStart(2, "0");

  const safeH = Number.isFinite(h24) ? Math.min(23, Math.max(0, h24)) : 0;
  const ampm = safeH >= 12 ? "PM" : "AM";
  const h12 = safeH % 12 || 12;

  const dd = String(d).padStart(2, "0");
  const MM = String(mo).padStart(2, "0");
  return `${dd}/${MM}/${y}, ${h12}:${mm} ${ampm}`;
}

/** `YYYY-MM-DD` → `DD-MM-YYYY` for custom date-picker triggers. */
export function formatYmdAsDmy(ymd: string | null | undefined): string {
  if (!ymd) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return ymd;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Parse strict `YYYY-MM-DD` to a local calendar Date (no UTC shift). */
export function parseYmdToLocalDate(ymd: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) {
    return undefined;
  }
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return undefined;
  }
  return dt;
}

