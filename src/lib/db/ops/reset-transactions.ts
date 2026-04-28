import "dotenv/config";

import { closeDatabaseConnection, db } from "../core/client";
import { seedUserId } from "../core/seed-user";

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DB_RESET !== "1") {
    console.error(
      "Refusing to reset transactions: NODE_ENV=production. Set ALLOW_DB_RESET=1 only if you intend to delete data.",
    );
    process.exit(1);
  }

  const userId = process.env.DATA_RESET_USER_ID?.trim() || seedUserId();

  const [row] = await db`
    select count(*)::int as n
    from transactions
    where user_id = ${userId}
  `;
  const n = Number((row as { n?: number }).n ?? 0);

  await db`
    delete from transactions
    where user_id = ${userId}
  `;

  console.log(`Reset: deleted ${n} transactions for user ${userId}`);
}

main()
  .then(async () => {
    await closeDatabaseConnection();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await closeDatabaseConnection().catch(() => {});
    process.exit(1);
  });

