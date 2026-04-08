function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toTransactionsCsv(
  rows: {
    transactionDate: string;
    transactionTime: string;
    type: string;
    amount: string;
    categoryName: string | null;
    locationName: string | null;
    note: string | null;
  }[]
): string {
  const header = [
    "Date",
    "Time",
    "Type",
    "Amount",
    "Category",
    "Location",
    "Notes",
  ];
  const lines = [
    header.map(escapeCsvCell).join(","),
    ...rows.map((r) =>
      [
        r.transactionDate,
        r.transactionTime,
        r.type,
        r.amount,
        r.categoryName ?? "",
        r.locationName ?? "",
        r.note ?? "",
      ]
        .map((c) => escapeCsvCell(String(c)))
        .join(",")
    ),
  ];
  return lines.join("\r\n");
}
