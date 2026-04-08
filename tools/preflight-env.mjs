import fs from "node:fs";

function readMaybe(path) {
  try {
    return fs.readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

// Prefer Next.js env precedence: .env.local then .env
for (const p of [".env.local", ".env"]) {
  const contents = readMaybe(p);
  if (!contents) continue;
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

const missing = [];
if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
if (!process.env.JWT_SECRET) missing.push("JWT_SECRET");

if (missing.length > 0) {
  console.error(
    [
      `Missing required env: ${missing.join(", ")}`,
      "",
      "Create `.env.local` (recommended) with:",
      "  DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DATABASE",
      "  JWT_SECRET=your-long-random-secret",
      "",
      "Then re-run: bun run db:migrate",
    ].join("\n"),
  );
  process.exit(1);
}

