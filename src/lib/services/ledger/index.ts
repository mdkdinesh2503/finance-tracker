export function parseAmountString(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  // remove commas and common currency symbols
  const cleaned = raw.replace(/[,₹$€£]/g, "").replace(/^\+/, "").trim();
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;

  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;

  return n.toFixed(2);
}
