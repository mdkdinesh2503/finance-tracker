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
    parentCategoryName: string | null;
    categoryName: string | null;
    locationName: string | null;
    contactName?: string | null;
    companyName?: string | null;
    note: string | null;
    investmentUsedParentCategoryName?: string | null;
    investmentUsedCategoryName?: string | null;
    investmentUsedAmount?: string | null;
  }[],
): string {
  const header = [
    "Date",
    "Time",
    "Type",
    "Amount",
    "Parent Category",
    "Child Category",
    "Location",
    "Contact",
    "Company",
    "Notes",
    "Investment Used Parent Category",
    "Investment Used Child Category",
    "Investment Used Amount",
  ];
  const lines = [
    header.map(escapeCsvCell).join(","),
    ...rows.map((r) =>
      [
        r.transactionDate,
        r.transactionTime,
        r.type,
        r.amount,
        r.parentCategoryName ?? "",
        r.categoryName ?? "",
        r.locationName ?? "",
        r.contactName ?? "",
        r.companyName ?? "",
        r.note ?? "",
        r.investmentUsedParentCategoryName ?? "",
        r.investmentUsedCategoryName ?? "",
        r.investmentUsedAmount ?? "",
      ]
        .map((c) => escapeCsvCell(String(c)))
        .join(","),
    ),
  ];
  return lines.join("\r\n");
}

