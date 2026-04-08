import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

// Match Next.js env precedence
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const missing = [];
if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
if (!process.env.JWT_SECRET) missing.push("JWT_SECRET");

if (missing.length > 0) {
  console.error(
    [
      `Missing required env: ${missing.join(", ")}`,
      "",
      "Update `.env` (or `.env.local`) with:",
      "  DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/DATABASE",
      "  JWT_SECRET=your-long-random-secret",
    ].join("\n"),
  );
  process.exit(1);
}

const cmd = "npx drizzle-kit migrate";
console.log(`Running: ${cmd}`);
const result = spawnSync(cmd, {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

if (result.error) {
  console.error(result.error);
}
process.exit(result.status ?? 1);

