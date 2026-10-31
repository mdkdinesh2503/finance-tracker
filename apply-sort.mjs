import fs from "fs";

// 1. Update src/lib/services/transactions.ts
let tFile = fs.readFileSync("src/lib/services/transactions.ts", "utf8");
tFile = tFile.replace(
  /locationId:\s*string\s*\|\s*null;\s*\},(\s*now\s*=\s*new\s*Date\(\),)/,
  "locationId: string | null;\n    sortOrder?: \"asc\" | \"desc\";\n  },$1"
);
tFile = tFile.replace(
  /const\s+whereClause\s*=\s*scopedTransactionsWhere\(/,
  "const sort = filters.sortOrder === \"asc\" ? db`asc` : db`desc`;\n  const whereClause = scopedTransactionsWhere("
);
tFile = tFile.replace(
  /order by t\.transaction_date desc,\s*t\.transaction_time desc/,
  "order by t.transaction_date ${sort}, t.transaction_time ${sort}"
);
fs.writeFileSync("src/lib/services/transactions.ts", tFile, "utf8");

// 2. Update src/app/actions/transactions.ts
let aFile = fs.readFileSync("src/app/actions/transactions.ts", "utf8");
aFile = aFile.replace(
  /(export async function fetchTransactionsListAction\(filters:\s*\{[\s\S]*?locationId:\s*string\s*\|\s*null;)/,
  "$1\n  sortOrder?: \"asc\" | \"desc\";"
);
aFile = aFile.replace(
  /(export async function exportTransactionsCsvAction\(filters:\s*\{[\s\S]*?locationId:\s*string\s*\|\s*null;)/,
  "$1\n  sortOrder?: \"asc\" | \"desc\";"
);
fs.writeFileSync("src/app/actions/transactions.ts", aFile, "utf8");

// 3. Update src/components/feature-specific/transactions/components/filter-bar.tsx
let fFile = fs.readFileSync("src/components/feature-specific/transactions/components/filter-bar.tsx", "utf8");
fFile = fFile.replace(
  /type Props = \{[\s\S]*?exportPending\?: boolean;\s*\};/,
  `type Props = {
  locations: Opt[];
  onExport?: () => void;
  exportPending?: boolean;
  sortOrder?: "asc" | "desc";
  onToggleSort?: () => void;
};`
);
fFile = fFile.replace(
  /export function FilterBar\(\{ locations, onExport, exportPending \}: Props\) \{/,
  "export function FilterBar({ locations, onExport, exportPending, sortOrder = \"desc\", onToggleSort }: Props) {"
);

const sortButtonCode = `{onToggleSort ? (
              <Button
                type="button"
                variant="ghost"
                onClick={onToggleSort}
                title={sortOrder === "desc" ? "Newest first — click for oldest first" : "Oldest first — click for newest first"}
                className="gap-1.5 rounded-full px-3 py-2 text-xs border border-(--border)! bg-(--glass-simple-bg)! text-ink! hover:border-primary/40! hover:bg-[color-mix(in_srgb,var(--primary)_10%,var(--surface))]!"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  {sortOrder === "desc" ? (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 9h9M3 14h5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4-4 4" />
                    </>
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 9h9M3 14h5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8l-4 4 4 4" />
                    </>
                  )}
                </svg>
                {sortOrder === "desc" ? "Newest first" : "Oldest first"}
              </Button>
            ) : null}`;

fFile = fFile.replace(
  /(<\/Button>\s*)(\{onExport \? \()/,
  `$1${sortButtonCode}\n            $2`
);
fs.writeFileSync("src/components/feature-specific/transactions/components/filter-bar.tsx", fFile, "utf8");

// 4. Update src/components/feature-specific/transactions/views/transactions-view.tsx
let vFile = fs.readFileSync("src/components/feature-specific/transactions/views/transactions-view.tsx", "utf8");
vFile = vFile.replace(
  /const \[exporting, setExporting\] = useState\(false\);/,
  "const [exporting, setExporting] = useState(false);\n  const [sortOrder, setSortOrder] = useState<\"asc\" | \"desc\">(\"desc\");"
);
vFile = vFile.replace(
  /fetchTransactionsListAction\(\{\s*datePreset,\s*fromDate,\s*toDate,\s*categoryContains,\s*locationId,\s*\}\)/,
  "fetchTransactionsListAction({\n          datePreset,\n          fromDate,\n          toDate,\n          categoryContains,\n          locationId,\n          sortOrder,\n        })"
);
vFile = vFile.replace(
  /\}, \[datePreset, fromDate, toDate, categoryContains, locationId\]\);/,
  "}, [datePreset, fromDate, toDate, categoryContains, locationId, sortOrder]);"
);
vFile = vFile.replace(
  /async function onExport\(\) \{/,
  `function toggleSort() {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
  }

  // Client-side sort guarantees instant visual order response
  const sortedRows = rows
    ? sortOrder === "desc"
      ? rows
      : [...rows].reverse()
    : null;

  async function onExport() {`
);
vFile = vFile.replace(
  /exportTransactionsCsvAction\(\{\s*datePreset,\s*fromDate,\s*toDate,\s*categoryContains,\s*locationId,\s*\}\)/,
  "exportTransactionsCsvAction({\n        datePreset,\n        fromDate,\n        toDate,\n        categoryContains,\n        locationId,\n        sortOrder,\n      })"
);
vFile = vFile.replace(
  /<FilterBar locations=\{locationOptions\} onExport=\{onExport\} exportPending=\{exporting\} \/>/,
  `<FilterBar
        locations={locationOptions}
        onExport={onExport}
        exportPending={exporting}
        sortOrder={sortOrder}
        onToggleSort={toggleSort}
      />`
);
vFile = vFile.replace(
  /\{rows === null \|\| pending \? \(\s*<TransactionsListSkeleton \/>\s*\) : \(\s*<TransactionsAccordion rows=\{rows\} unsettledLoanContacts=\{unsettled\} \/>\s*\)\}/,
  `{sortedRows === null || pending ? (
          <TransactionsListSkeleton />
        ) : (
          <TransactionsAccordion rows={sortedRows} unsettledLoanContacts={unsettled} />
        )}`
);
fs.writeFileSync("src/components/feature-specific/transactions/views/transactions-view.tsx", vFile, "utf8");

console.log("Sort ordering implementation complete!");

